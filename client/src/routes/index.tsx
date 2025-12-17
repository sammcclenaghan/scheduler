import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center pt-32 p-4 relative overflow-hidden text-slate-800">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#005493]/10 rounded-full blur-3xl opacity-60 pointer-events-none mix-blend-multiply" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#F5AA1C]/10 rounded-full blur-3xl opacity-60 pointer-events-none mix-blend-multiply" />
      <div className="absolute top-[40%] left-[80%] w-64 h-64 bg-[#005493]/5 rounded-full blur-3xl opacity-60 pointer-events-none mix-blend-multiply" />

      <div className="max-w-3xl w-full text-center relative z-10 space-y-10">
        <div className="space-y-6">
          <div className="inline-block px-4 py-1.5 bg-white/60 backdrop-blur-sm border border-stone-200 rounded-full text-stone-600 text-sm font-medium shadow-sm">
            Built by VikeLabs
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-stone-800">
            Browse and schedule <br />
            <span className="text-[#005493] decoration-4 decoration-[#F5AA1C] underline underline-offset-4">UVic courses</span>
          </h1>

          <p className="text-xl text-stone-600 max-w-xl mx-auto leading-relaxed">
            The easiest way to plan your semester. Fast, simple, and open source.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            to="/schedule"
            className="group relative px-8 py-4 bg-[#005493] text-white text-lg font-semibold rounded-2xl hover:bg-[#00417a] transition-all shadow-xl shadow-blue-900/10 hover:shadow-2xl hover:shadow-blue-900/20 hover:-translate-y-1"
          >
            Let's Get Started
          </Link>
          <a
            href="https://vikelabs.ca"
            target="_blank"
            rel="noreferrer"
            className="px-8 py-4 bg-white text-stone-600 text-lg font-medium rounded-2xl border border-stone-200 hover:bg-stone-50 transition-all hover:border-stone-300"
          >
            Who built this?
          </a>
        </div>

        <div className="pt-8 flex flex-col items-center gap-3 text-stone-400">
          <div className="w-16 h-1 bg-stone-200/50 rounded-full" />
          <p className="text-sm font-medium">Made with ☕️ by VikeLabs</p>
        </div>
      </div>
    </div>
  );
}
