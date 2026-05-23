import { useEffect, useRef } from 'react'

const features = [
  {
    icon: '🎯',
    title: 'Personalized Goals',
    desc: "Set, track, and adapt learning objectives tailored to each student's unique needs and abilities.",
  },
  {
    icon: '📊',
    title: 'Progress Analytics',
    desc: 'Visualize milestones and performance trends with intuitive charts built for educators and parents.',
  },
  {
    icon: '🤝',
    title: 'Team Collaboration',
    desc: 'Connect teachers, therapists, and families in one unified platform for seamless communication.',
  },
  {
    icon: '📋',
    title: 'Compliant Documentation',
    desc: 'Generate IEP documents that meet federal and state compliance standards with one click.',
  },
  {
    icon: '🔔',
    title: 'Smart Reminders',
    desc: 'Automated alerts for upcoming meetings, review deadlines, and goal check-ins.',
  },
  {
    icon: '🔒',
    title: 'Secure & Private',
    desc: "FERPA-compliant data protection ensures every student's records stay safe and confidential.",
  },
]

export default function LandingPage({ onGetStarted }) {
  const heroRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          // Handled transition classes dynamically
          if (e.isIntersecting) {
            e.target.classList.add('opacity-100', 'translate-y-0')
            e.target.classList.remove('opacity-0', 'translate-y-4')
          }
        })
      },
      { threshold: 0.15 }
    )
    document.querySelectorAll('.fade-in-init').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans overflow-x-hidden">
      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 select-none">
            <span className="text-2xl text-sky-500 animate-pulse">⚡</span>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              NeuroPath
            </span>
          </div>
          <div className="flex items-center gap-6 sm:gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors">Features</a>
            <a href="#about" className="text-sm font-medium text-slate-600 hover:text-sky-600 transition-colors">About</a>
            <button 
              className="text-sm font-semibold px-4 py-2 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-xl bg-white hover:bg-slate-50 shadow-sm active:scale-95 transition-all"
              onClick={onGetStarted}
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section ref={heroRef} className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
        {/* Background Decorative Blobs & Grid */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[10%] left-[-10%] w-[400px] h-[400px] bg-sky-200/40 rounded-full blur-[80px]" />
          <div className="absolute top-[30%] right-[-5%] w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-[100px]" />
          <div className="absolute bottom-[5%] left-[25%] w-[350px] h-[350px] bg-emerald-100/40 rounded-full blur-[90px]" />
          <div className="absolute inset-0 opacity-[0.015] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        {/* Hero Left Content Content */}
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          <div className="fade-in-init opacity-0 translate-y-4 transition-all duration-700 ease-out inline-flex items-center gap-2 bg-sky-50 border border-sky-100 px-3 py-1 rounded-full text-xs font-semibold text-sky-700 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping" />
            Individualized Education Plans
          </div>
          <h1 className="fade-in-init opacity-0 translate-y-4 transition-all duration-700 ease-out delay-75 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15] mb-6">
            Every student <br />
            <span className="bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
              deserves a path
            </span> <br />
            built for them.
          </h1>
          <p className="fade-in-init opacity-0 translate-y-4 transition-all duration-700 ease-out delay-150 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed mb-8">
            NeuroPath empowers special education teachers to build, manage, and track compliant IEPs seamlessly, ensuring every student has a clear path to success.
          </p>
          <div className="fade-in-init opacity-0 translate-y-4 transition-all duration-700 ease-out delay-200 flex items-center gap-4 w-full sm:w-auto">
            <button 
              onClick={onGetStarted}
              className="group flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold px-6 py-3.5 rounded-xl shadow-md shadow-sky-500/10 hover:shadow-lg hover:shadow-sky-500/20 active:scale-[0.98] transition-all w-full sm:w-auto"
            >
              Get Started
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </div>
          <div className="fade-in-init opacity-0 translate-y-4 transition-all duration-700 ease-out delay-300 mt-12">
            <div className="h-4" /> {/* Optional spacing placeholder for dynamic counters */}
          </div>
        </div>

        {/* Hero Right Visual (Dashboard Mockup UI) */}
        <div className="lg:col-span-5 w-full flex justify-center lg:justify-end fade-in-init opacity-0 translate-y-4 transition-all duration-1000 ease-out delay-200">
          <div className="w-full max-w-[420px] bg-white border border-slate-200/80 rounded-2xl shadow-2xl shadow-slate-900/5 overflow-hidden transform hover:-translate-y-1 transition-transform duration-300">
            {/* Mockup Top Window Controls */}
            <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <span className="text-xs font-semibold text-slate-400 tracking-medium select-none">Student Dashboard</span>
              <div className="w-12" />
            </div>

            {/* Mockup Main Panel Container */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Profile Overview Component */}
              <div className="flex items-center gap-3.5 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                <div className="w-11 h-11 bg-sky-500 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-sm shadow-sky-500/20">
                  AS
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <h4 className="text-sm font-bold text-slate-900 truncate">Angelo Singson</h4>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">Grade 1 · IEP Active</p>
                </div>
                <span className="inline-flex items-center bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-700 px-2.5 py-0.5 rounded-full">
                  On Track
                </span>
              </div>

              {/* Individual Learning Benchmarks Section */}
              <div className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>Reading Fluency</span>
                    <span className="font-bold text-slate-900">72%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: '72%' }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>Math Comprehension</span>
                    <span className="font-bold text-slate-900">58%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: '58%' }} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                    <span>Social Skills</span>
                    <span className="font-bold text-emerald-600">89%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '89%' }} />
                  </div>
                </div>
              </div>

              {/* Event Reminders Block */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                <span className="font-medium text-slate-500 flex items-center gap-1.5">
                  <span>📅</span> Next Review
                </span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                  December 17, 2050
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES GRID */}
      <section className="bg-white border-y border-slate-200/50 py-20 lg:py-28" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="fade-in-init opacity-0 translate-y-4 transition-all duration-700 ease-out max-w-2xl mx-auto text-center mb-16 lg:mb-20">
            <span className="text-xs font-bold uppercase tracking-widest text-sky-600 bg-sky-50 px-3 py-1 rounded-full">
              Features
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mt-4 mb-4">
              Everything your IEP team needs
            </h2>
            <p className="text-slate-600 text-base sm:text-lg">
              One platform to write, manage, track, and report — built specifically for special education.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((f, i) => (
              <div 
                className="fade-in-init opacity-0 translate-y-4 transition-all duration-700 ease-out bg-slate-50 border border-slate-200/60 rounded-2xl p-6 text-left hover:bg-white hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 group" 
                key={i} 
                style={{ transitionDelay: `${i * 0.05}s` }}
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-xl mb-5 group-hover:scale-110 group-hover:border-sky-200 group-hover:bg-sky-50/50 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CONVERSION CALL TO ACTION */}
      <section className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" id="about">
        <div className="fade-in-init opacity-0 translate-y-4 transition-all duration-1000 ease-out relative bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-white rounded-3xl p-8 sm:p-12 lg:p-16 text-center overflow-hidden shadow-2xl">
          {/* Internal Ambient Lights */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-sky-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[250px] h-[250px] bg-blue-500/10 rounded-full blur-[70px] pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Start building better IEPs today.
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-md mb-8 leading-relaxed">
              Join thousands of educators already using NeuroPath to support their students' journeys.
            </p>
            <button 
              onClick={onGetStarted}
              className="group flex items-center justify-center gap-2 bg-white hover:bg-slate-100 text-slate-900 font-bold px-6 py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all w-full sm:w-auto text-sm"
            >
              Create Your Free Account
              <span className="group-hover:translate-x-1 transition-transform text-slate-600">→</span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER BAR */}
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-80">
            <span className="text-xl text-sky-500">⚡</span>
            <span className="text-md font-bold tracking-tight text-slate-800">NeuroPath</span>
          </div>
          <p className="text-xs text-slate-500">© 2026 NeuroPath. Empowering every learner's journey.</p>
        </div>
      </footer>
    </div>
  )
}