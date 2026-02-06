import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * Regex to match course codes like "CSC115", "CSC 115", "MATH101", "PHYS 102A"
 * Captures: subject letters (2-4 chars), optional space, course number (3-4 digits), optional suffix letter
 */
const COURSE_CODE_REGEX = /\b([A-Z]{2,4})\s?(\d{3,4}[A-Z]?)\b/g;

interface PrerequisiteLinksProps {
	text: string;
}

/**
 * Processes a single line of text, converting course codes to clickable links.
 */
function processLineWithLinks(line: string, lineIndex: number): ReactNode[] {
	const parts: ReactNode[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null = null;

	// Reset regex state
	COURSE_CODE_REGEX.lastIndex = 0;
	match = COURSE_CODE_REGEX.exec(line);

	while (match !== null) {
		// Add text before the match
		if (match.index > lastIndex) {
			parts.push(line.slice(lastIndex, match.index));
		}

		// Extract subject and number, normalize to no space (e.g., "CSC 115" -> "CSC115")
		const subject = match[1];
		const number = match[2];
		const normalizedCode = `${subject}${number}`;
		const displayCode = match[0]; // Keep original formatting for display

		// Add the link
		parts.push(
			<Link
				key={`${normalizedCode}-${lineIndex}-${match.index}`}
				to="/courses/$subjectCode"
				params={{ subjectCode: normalizedCode }}
				className="font-medium text-primary hover:text-primary/85 hover:underline transition-colors"
			>
				{displayCode}
			</Link>,
		);

		lastIndex = match.index + match[0].length;
		match = COURSE_CODE_REGEX.exec(line);
	}

	// Add remaining text after last match
	if (lastIndex < line.length) {
		parts.push(line.slice(lastIndex));
	}

	// If no matches found, return original line
	if (parts.length === 0) {
		return [line];
	}

	return parts;
}

/**
 * Parses prerequisite text and converts course codes into clickable links.
 * Handles multi-line text with bullet points (•) for proper formatting.
 * Course codes like "CSC115" or "CSC 115" become links to the course detail page.
 */
export function PrerequisiteLinks({ text }: PrerequisiteLinksProps) {
	// Split by newlines to preserve structure
	const lines = text.split("\n").filter((line) => line.trim());

	if (lines.length === 0) {
		return null;
	}

	// If single line with no bullet points, render inline
	if (lines.length === 1 && !lines[0].startsWith("•")) {
		return <>{processLineWithLinks(lines[0], 0)}</>;
	}

	// Multi-line: render as structured list
	return (
		<div className="space-y-1">
			{lines.map((line, index) => {
				const isBullet = line.startsWith("•");
				const content = isBullet ? line.slice(1).trim() : line;
				const processedContent = processLineWithLinks(content, index);
				const lineKey = `${line}-${index}`;

				if (isBullet) {
					return (
						<div key={lineKey} className="flex items-start gap-2 ml-2">
							<span className="text-muted-foreground select-none">•</span>
							<span>{processedContent}</span>
						</div>
					);
				}

				// Non-bullet lines (headers like "Complete 1 of the following:")
				return (
					<div key={lineKey} className="font-medium text-foreground/90">
						{processedContent}
					</div>
				);
			})}
		</div>
	);
}
