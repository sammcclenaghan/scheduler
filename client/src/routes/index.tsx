import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 md:p-12 font-sans text-slate-900">
      <div className="max-w-7xl w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

        {/* Left Column: Text */}
        <div className="space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
            Explore UVic <br />
            <span className="text-[#005493]">Courses</span>
          </h1>

          <p className="text-xl text-slate-500 max-w-md leading-relaxed">
            CourseUp makes it simple to browse and schedule UVic Courses.
          </p>

          <div className="flex items-center space-x-2 text-slate-600 font-medium">
            <span>👋</span>
            <span>Built by students @ <span className="text-slate-900 font-bold">VIKE LABS</span></span>
          </div>

          <div className="pt-4">
            <Link
              to="/schedule"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#005493] text-white text-lg font-bold rounded-lg hover:bg-[#00417a] transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
            >
              Start Scheduling
            </Link>
          </div>
        </div>

        {/* Right Column: Hero Image (CSS Placeholder for 3D Illustration) */}
        <div className="relative h-[400px] md:h-[600px] w-full flex items-center justify-center perspective-1000">
          {/* Abstract 3D Composition using CSS transforms */}
          <div className="relative w-64 h-40 bg-blue-100 rounded-lg transform rotate-x-60 rotate-z-45 shadow-2xl border-4 border-white z-10">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-blue-300 font-bold text-lg">Platform</span>
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 -mt-20 -ml-20 w-40 h-56 bg-gradient-to-br from-[#005493] to-blue-400 rounded-xl shadow-2xl rotate-y-12 rotate-z-6 border-4 border-white z-20 flex flex-col items-center justify-center p-4">
            <div className="w-full h-2 bg-white/20 rounded mb-2"></div>
            <div className="w-3/4 h-2 bg-white/20 rounded mb-4"></div>
            <div className="w-full h-24 bg-white/10 rounded"></div>
          </div>
          <div className="absolute bottom-20 right-20 w-20 h-20 bg-blue-50 rounded-lg transform rotate-12 shadow-lg border-2 border-white z-0"></div>
        </div>

      </div>
    </div>
  );
}
