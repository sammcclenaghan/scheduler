package scraper

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"golang.org/x/net/html"
)

const DefaultCatalogID = "65eb47906641d7001c157bc4"

type CourseInfo struct {
	SubjectCode        string `json:"subject_code"`
	Credits            string `json:"credits"`
	PreAndCorequisites string `json:"pre_and_corequisites"`
	Description        string `json:"description"`
	HoursCatalogText   string `json:"hours_catalog_text"`
	PID                string `json:"pid"`
	Notes              string `json:"notes"`
	Title              string `json:"title"`
}

type SectionInfo struct {
	Term                     string `json:"term"`
	Subject                  string `json:"subject"`
	CourseName               string `json:"course_name"`
	CourseNumber             string `json:"course_number"`
	CRN                      string `json:"crn"`
	Section                  string `json:"section"`
	Frequency                string `json:"frequency"`
	Time                     string `json:"time"`
	Days                     string `json:"days"`
	Location                 string `json:"location"`
	DateRange                string `json:"date_range"`
	ScheduleType             string `json:"schedule_type"`
	Instructor               string `json:"instructor"`
	InstructionalMethod      string `json:"instructional_method"`
	Units                    string `json:"units"`
	AdditionalInformation    string `json:"additional_information"`
	EnrollmentActual         int    `json:"enrollment_actual"`
	EnrollmentMaximum        int    `json:"enrollment_maximum"`
	EnrollmentSeatsAvailable int    `json:"enrollment_seats_available"`
	WaitlistCapacity         int    `json:"waitlist_capacity"`
	WaitlistActual           int    `json:"waitlist_actual"`
	WaitlistSeatsAvailable   int    `json:"waitlist_seats_available"`
}

type Index map[string]string

type Scraper struct {
	Client    *http.Client
	CatalogID string
	Index     Index
}

func New(coursesJSONPath, catalogID string) (*Scraper, error) {
	if catalogID == "" {
		catalogID = DefaultCatalogID
	}
	idx := make(Index)
	if coursesJSONPath != "" {
		if err := loadIndex(coursesJSONPath, idx); err != nil {
			return nil, err
		}
	}
	return &Scraper{
		Client:    &http.Client{Timeout: 15 * time.Second},
		CatalogID: catalogID,
		Index:     idx,
	}, nil
}

func loadIndex(path string, idx Index) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	var entries []struct {
		PID             string `json:"pid"`
		CatalogCourseID string `json:"__catalogCourseId"`
	}
	if err := json.NewDecoder(f).Decode(&entries); err != nil {
		return err
	}
	for _, e := range entries {
		if code := strings.ToUpper(strings.TrimSpace(e.CatalogCourseID)); code != "" {
			idx[code] = e.PID
		}
	}
	return nil
}

func (s *Scraper) FetchCourseInfo(ctx context.Context, pid string) (CourseInfo, error) {
	url := "https://uvic.kuali.co/api/v1/catalog/course/" + s.CatalogID + "/" + pid

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return CourseInfo{}, err
	}
	req.Header.Set("User-Agent", "pace-scraper/1.0")

	resp, err := s.Client.Do(req)
	if err != nil {
		return CourseInfo{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return CourseInfo{}, fmt.Errorf("uvic fetch failed (status=%d): %s", resp.StatusCode, body)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return CourseInfo{}, err
	}

	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		return CourseInfo{}, err
	}

	return CourseInfo{
		SubjectCode:        getString(raw, "__catalogCourseId"),
		Credits:            parseCredits(raw["credits"]),
		PreAndCorequisites: parsePrereqs(raw["preAndCorequisites"]),
		Description:        htmlToText(getString(raw, "description")),
		HoursCatalogText:   getString(raw, "hoursCatalogText"),
		PID:                getString(raw, "pid"),
		Notes:              htmlToText(getString(raw, "supplementalNotes")),
		Title:              getString(raw, "title"),
	}, nil
}

func (s *Scraper) FetchSectionInfo(ctx context.Context, subject, courseNumber, term string) ([]SectionInfo, error) {
	if subject == "" || courseNumber == "" || term == "" {
		return nil, fmt.Errorf("subject, courseNumber and term are required")
	}

	endpoint := "https://www.uvic.ca/BAN1P/bwckctlg.p_disp_listcrse?" + url.Values{
		"term_in": {strings.TrimSpace(term)},
		"subj_in": {strings.ToUpper(strings.TrimSpace(subject))},
		"crse_in": {strings.TrimSpace(courseNumber)},
		"schd_in": {""},
	}.Encode()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0")

	client := &http.Client{
		Timeout:       s.Client.Timeout,
		CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusFound {
		b, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return nil, fmt.Errorf("catalog HTML fetch failed status=%d body=%s", resp.StatusCode, b)
	}

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return s.parseHTML(ctx, string(bodyBytes), term, subject, courseNumber)
}

func (s *Scraper) parseHTML(ctx context.Context, body, term, subject, courseNumber string) ([]SectionInfo, error) {
	doc, err := html.Parse(strings.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("parse HTML: %w", err)
	}

	var sections []SectionInfo
	walkTree(doc, func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "th" && hasClass(n, "ddtitle") {
			if sec := parseSection(n, term, subject, courseNumber); sec != nil {
				sections = append(sections, *sec)
			}
		}
	})

	if len(sections) == 0 {
		return nil, fmt.Errorf("no sections found in HTML")
	}

	for i := range sections {
		if sections[i].CRN != "" {
			s.enrichEnrollment(ctx, &sections[i])
		}
	}

	return sections, nil
}

func parseSection(titleNode *html.Node, term, subject, courseNumber string) *SectionInfo {
	titleText := findLinkText(titleNode)
	if titleText == "" {
		titleText = textContent(titleNode)
	}
	if titleText == "" {
		return nil
	}

	sec := &SectionInfo{Term: term, Subject: subject, CourseNumber: courseNumber}
	parts := strings.Split(titleText, " - ")
	if len(parts) >= 3 {
		sec.CourseName = strings.TrimSpace(parts[0])
		sec.CRN = strings.TrimSpace(parts[1])
		if len(parts) >= 4 {
			sec.Section = strings.TrimSpace(parts[3])
		}
	} else {
		sec.CourseName = titleText
	}

	if details := findDetailsNode(titleNode); details != nil {
		parseDetails(details, sec)
	}

	return sec
}

func findLinkText(n *html.Node) string {
	var text string
	walkTree(n, func(node *html.Node) {
		if node.Type == html.ElementNode && node.Data == "a" && text == "" {
			text = textContent(node)
		}
	})
	return text
}

func findDetailsNode(titleNode *html.Node) *html.Node {
	tr := titleNode.Parent
	for tr != nil && tr.Data != "tr" {
		tr = tr.Parent
	}
	if tr == nil {
		return nil
	}

	for next := tr.NextSibling; next != nil; next = next.NextSibling {
		if next.Type == html.ElementNode && next.Data == "tr" {
			for c := next.FirstChild; c != nil; c = c.NextSibling {
				if c.Type == html.ElementNode && c.Data == "td" && hasClass(c, "dddefault") {
					return c
				}
			}
			break
		}
	}
	return nil
}

func parseDetails(node *html.Node, sec *SectionInfo) {
	text := textContent(node)
	lines := splitLines(text)

	for _, line := range lines {
		if m := regexp.MustCompile(`^(\d+\.\d+)\s*Credits$`).FindStringSubmatch(line); m != nil {
			sec.Units = m[1]
		}
		if m := regexp.MustCompile(`^(.*)\s+Instructional Method$`).FindStringSubmatch(line); m != nil {
			sec.InstructionalMethod = m[1]
		}
	}

	var info []string
	for _, line := range lines {
		if strings.Contains(line, "Associated Term:") {
			break
		}
		if line != sec.CourseName {
			info = append(info, line)
		}
	}
	sec.AdditionalInformation = strings.Join(info, " ")

	parseScheduleTable(node, sec)
}

func parseScheduleTable(node *html.Node, sec *SectionInfo) {
	var table *html.Node
	walkTree(node, func(n *html.Node) {
		if table == nil && n.Type == html.ElementNode && n.Data == "table" && hasClass(n, "datadisplaytable") {
			table = n
		}
	})
	if table == nil {
		return
	}

	var dataRow *html.Node
	walkTree(table, func(n *html.Node) {
		if dataRow != nil || n.Type != html.ElementNode || n.Data != "tr" {
			return
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			if c.Type == html.ElementNode && c.Data == "td" {
				dataRow = n
				return
			}
		}
	})

	if dataRow == nil {
		return
	}

	var cells []string
	for c := dataRow.FirstChild; c != nil; c = c.NextSibling {
		if c.Type == html.ElementNode && c.Data == "td" {
			cells = append(cells, strings.TrimSpace(textContent(c)))
		}
	}

	if len(cells) >= 7 {
		sec.Frequency = cells[0]
		sec.Time = cells[1]
		sec.Days = cells[2]
		sec.Location = cells[3]
		sec.DateRange = cells[4]
		sec.ScheduleType = cells[5]
		sec.Instructor = cells[6]
	}
}

func (s *Scraper) enrichEnrollment(ctx context.Context, sec *SectionInfo) {
	form := url.Values{"term": {sec.Term}, "courseReferenceNumber": {sec.CRN}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://banner.uvic.ca/StudentRegistrationSsb/ssb/searchResults/getEnrollmentInfo",
		strings.NewReader(form.Encode()))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := s.Client.Do(req)
	if err != nil || resp.StatusCode != http.StatusOK {
		if resp != nil {
			resp.Body.Close()
		}
		return
	}
	defer resp.Body.Close()

	data, _ := io.ReadAll(resp.Body)
	htmlStr := string(data)

	extract := func(label string) int {
		re := regexp.MustCompile(regexp.QuoteMeta(label) + `:</span>\s*<span[^>]*>(\d+)`)
		if m := re.FindStringSubmatch(htmlStr); len(m) == 2 {
			v, _ := strconv.Atoi(m[1])
			return v
		}
		return 0
	}

	sec.EnrollmentActual = extract("Enrolment Actual")
	sec.EnrollmentMaximum = extract("Enrolment Maximum")
	sec.EnrollmentSeatsAvailable = extract("Enrolment Seats Available")
	sec.WaitlistCapacity = extract("Waitlist Capacity")
	sec.WaitlistActual = extract("Waitlist Actual")
	sec.WaitlistSeatsAvailable = extract("Waitlist Seats Available")
}

func getString(m map[string]any, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

func parseCredits(v any) string {
	if m, ok := v.(map[string]any); ok {
		v = m["value"]
	}
	switch t := v.(type) {
	case float64:
		if t == float64(int(t)) {
			return fmt.Sprintf("%d", int(t))
		}
		return fmt.Sprintf("%.2f", t)
	case string:
		return t
	}
	return ""
}

func parsePrereqs(v any) string {
	if s, ok := v.(string); ok {
		if text := htmlToText(s); text != "" {
			return text
		}
		return stripTags(s)
	}
	if v != nil {
		b, _ := json.Marshal(v)
		return strings.TrimSpace(string(b))
	}
	return ""
}

func htmlToText(s string) string {
	if s = strings.TrimSpace(s); s == "" {
		return ""
	}
	n, err := html.Parse(strings.NewReader(s))
	if err != nil {
		return stripTags(s)
	}
	var b strings.Builder
	var walk func(*html.Node)
	walk = func(node *html.Node) {
		if node.Type == html.TextNode {
			if text := strings.TrimSpace(node.Data); text != "" {
				if b.Len() > 0 {
					b.WriteByte(' ')
				}
				b.WriteString(text)
			}
		}
		for c := node.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(n)
	return strings.Join(strings.Fields(b.String()), " ")
}

func stripTags(s string) string {
	var out strings.Builder
	inTag := false
	for _, r := range s {
		switch r {
		case '<':
			inTag = true
		case '>':
			inTag = false
		default:
			if !inTag {
				out.WriteRune(r)
			}
		}
	}
	return strings.Join(strings.Fields(out.String()), " ")
}

func walkTree(n *html.Node, fn func(*html.Node)) {
	fn(n)
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		walkTree(c, fn)
	}
}

func hasClass(n *html.Node, class string) bool {
	for _, a := range n.Attr {
		if a.Key == "class" && strings.Contains(strings.ToLower(a.Val), strings.ToLower(class)) {
			return true
		}
	}
	return false
}

func textContent(n *html.Node) string {
	if n.Type == html.TextNode {
		return n.Data
	}
	var b strings.Builder
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if text := textContent(c); text != "" {
			if b.Len() > 0 && !strings.HasSuffix(b.String(), " ") && !strings.HasPrefix(text, " ") {
				b.WriteString(" ")
			}
			b.WriteString(text)
		}
	}
	return strings.TrimSpace(b.String())
}

func splitLines(s string) []string {
	var lines []string
	for _, line := range strings.Split(s, "\n") {
		if line = strings.TrimSpace(line); line != "" {
			lines = append(lines, line)
		}
	}
	return lines
}
