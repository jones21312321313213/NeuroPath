import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import RotatingText from "../components/ui/RotatingText";
import {
  BoltIcon,
  TargetIcon,
  ClipboardIcon,
  LightBulbIcon,
  BookOpenIcon,
  PhotoIcon,
  ChartBarIcon,
  CheckIcon,
  WarningIcon,
  CalendarIcon,
  CloseIcon,
  SparklesIcon,
} from "../components/ui/icons";

const RELEASE_NOTES = [
  {
    version: "v1.2.0",
    date: "November 2026",
    isLatest: true,
    summary: "Outcome Monitoring alignment, R-GORI pedagogical inspection, DepEd PDF export updates, and AI rate-limit resilience.",
    changes: [
      {
        tag: "New Feature",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Interactive R-GORI Pedagogical Compliance Inspection dialog with 4-factor goal scoring in IEP draft reviews.",
      },
      {
        tag: "New Feature",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Outcome Monitoring executive classroom KPIs, 70% target milestone benchmark lines, predictive trend forecasting, and behavioral observation logging.",
      },
      {
        tag: "Compliance",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Updated DepEd Student Record PDF template: relocated assessment matrix under Section B Special Factors, streamlined Page 1 demographics, and added Parent/Guardian sign-off block.",
      },
      {
        tag: "UI Polish",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Streamlined View IEP actions (inline Edit/Delete IEP, Archive Version beside date), 10-second AI regenerate cooldown, and clearer login rate-limit messaging.",
      },
    ],
  },
  {
    version: "v1.1.0",
    date: "October 2026",
    isLatest: false,
    summary: "Standardized resource exports, RA 10173 data privacy hardening, and multi-engine AI fallbacks.",
    changes: [
      {
        tag: "New Feature",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Standardized PDF exports for Lesson Plans, Teaching Strategies, and Visual Aids.",
      },
      {
        tag: "Security",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "RA 10173 Data Privacy Act consent workflow and Fernet AES encryption at rest with resilient student name resolution.",
      },
      {
        tag: "UI Polish",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Interactive onboarding tutorial, session inactivity auto-logout warnings, and multi-tab synchronization.",
      },
    ],
  },
  {
    version: "v1.0.0",
    date: "September 2026",
    isLatest: false,
    summary: "Initial production release of NeuroPath for Special Education teachers.",
    changes: [
      {
        tag: "New Feature",
        tagColor: "bg-blue-100 text-blue-800 border-blue-200",
        text: "Core Student Profiling, AI-Assisted IEP Generation, Lesson Plan Builder, Teaching Strategies, and Visual Aid Studio.",
      },
    ],
  },
];

const features = [
  {
    icon: <TargetIcon className="w-5 h-5 text-[#1a6fa8]" aria-hidden="true" />,
    title: "Personalized Goals",
    desc: "Set, track, and adapt learning objectives tailored to each student's unique needs and abilities.",
  },
  {
    icon: <ClipboardIcon className="w-5 h-5 text-[#1a6fa8]" aria-hidden="true" />,
    title: "IEP Generation",
    desc: "Generate compliant Individualized Education Plans powered by AI, tailored to each student's unique needs and goals.",
  },
  {
    icon: <LightBulbIcon className="w-5 h-5 text-[#1a6fa8]" aria-hidden="true" />,
    title: "AI Insights",
    desc: "Leverage AI to analyze student data and surface actionable recommendations for educators and specialists.",
  },
  {
    icon: <BookOpenIcon className="w-5 h-5 text-[#1a6fa8]" aria-hidden="true" />,
    title: "Lesson Plan Management",
    desc: "Create, organize, and manage lesson plans designed around each student's IEP goals and learning preferences.",
  },
  {
    icon: <PhotoIcon className="w-5 h-5 text-[#1a6fa8]" aria-hidden="true" />,
    title: "Visual Aid Management",
    desc: "Generate and manage visual aids tailored to ASD learners, supporting communication and comprehension in the classroom.",
  },
  {
    icon: <ChartBarIcon className="w-5 h-5 text-[#1a6fa8]" aria-hidden="true" />,
    title: "Outcome Monitoring",
    desc: "Track student progress over time with detailed records and visual dashboards that keep the whole team aligned.",
  },
];
function FeatureCard({ feature, index }) {
  return (
    <div
      className="fade-in-init opacity-0 translate-y-4 transition-all duration-700 ease-out feature-card"
      style={{ transitionDelay: `${index * 0.05}s` }}
    >
      <div className="feature-icon">{feature.icon}</div>
      <h3 className="feature-title">{feature.title}</h3>
      <p className="feature-desc">{feature.desc}</p>
    </div>
  );
}

export default function LandingPage({ onGetStarted }) {
  const [scrolled, setScrolled] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showVersionPopup, setShowVersionPopup] = useState(true);
  const [isPopupHovered, setIsPopupHovered] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const heroRef = useRef(null);

  useEffect(() => {
    if (!showVersionPopup || isPopupHovered) return;
    const timer = setTimeout(() => {
      setShowVersionPopup(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [showVersionPopup, isPopupHovered]);

  useEffect(() => {
    // 1. Intersection Observer for fade-in animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("opacity-100", "translate-y-0");
            e.target.classList.remove("opacity-0", "translate-y-4");
          }
        });
      },
      { threshold: 0.15 },
    );

    document
      .querySelectorAll(".fade-in-init")
      .forEach((el) => observer.observe(el));

    // 2. Scroll listener for the shrinking navbar
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    // Clean up observers and listeners
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const navigate = useNavigate();

  const handleNavigateLogin = () => {
    if (isLeaving) return;
    setIsLeaving(true);
    setTimeout(() => {
      if (onGetStarted) {
        onGetStarted();
      } else {
        navigate("/login");
      }
    }, 200);
  };

  const handleNavigateRegister = () => {
    if (isLeaving) return;
    setIsLeaving(true);
    setTimeout(() => {
      navigate("/register");
    }, 200);
  };

  return (
    <div
      className={`min-h-screen font-sans overflow-x-hidden np-page-enter transition-all duration-200 ease-out ${
        isLeaving ? "opacity-0 translate-y-1 pointer-events-none" : "opacity-100 translate-y-0"
      }`}
      style={{ background: "#f0f8ff", color: "#1a3a4a" }}
    >
      {/* NAV */}
      <nav
        className={`fixed left-0 right-0 z-50 transition-all duration-500 ease-in-out mx-auto
          ${
            scrolled
              ? "top-4 max-w-4xl h-14 rounded-full bg-white/30 shadow-[0_10px_30px_rgba(37,137,199,0.08)] border border-[#82c7ff]/30 backdrop-blur-xl px-4"
              : "top-0 max-w-full h-16 bg-[#f0f8ff]/85 border-b border-[#82c7ff]/30 backdrop-blur-md"
          }`}
      >
        <div
          className={`h-full mx-auto flex items-center justify-between transition-all duration-500
          ${scrolled ? "px-2" : "max-w-7xl px-4 sm:px-6 lg:px-8"}`}
        >
          <div className="flex items-center gap-2 select-none">
            <BoltIcon className="w-6 h-6 text-[#2589c7]" aria-hidden="true" />
            <span className="text-xl font-bold tracking-tight text-[#1a6fa8]">
              NeuroPath
            </span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <a
              href="features"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("features")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm font-medium transition-colors text-[#5a9dbf] hover:text-[#1a6fa8]"
            >
              Features
            </a>
            <a
              href="about"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById("about")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-sm font-medium transition-colors text-[#5a9dbf] hover:text-[#1a6fa8]"
            >
              About
            </a>
            <button
              type="button"
              onClick={() => setShowChangelog(true)}
              className="text-sm font-medium transition-colors text-[#5a9dbf] hover:text-[#1a6fa8] cursor-pointer"
            >
              Release Notes
            </button>
            <button
              href="signin"
              onClick={handleNavigateLogin}
              className={`text-sm font-semibold transition-all active:scale-95 text-[#1a6fa8] border-[1.5px] border-[#82C7FF] bg-white shadow-[0_1px_4px_rgba(130,199,255,0.2)] hover:bg-[#e8f5ff] hover:border-[#2589c7]
                ${scrolled ? "px-3.5 py-1.5 rounded-full text-xs" : "px-4 py-2 rounded-xl"}`}
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* TOP-RIGHT 5-SECOND VERSION POPUP (STAYS OPEN WHILE HOVERED) */}
      {showVersionPopup && (
        <div
          role="status"
          aria-label="Latest version release popup"
          onMouseEnter={() => setIsPopupHovered(true)}
          onMouseLeave={() => setIsPopupHovered(false)}
          className="fixed top-3 right-3 z-[70] max-w-xs w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-[#82C7FF]/60 p-4 transition-all duration-300"
          style={{ top: "12px", right: "12px" }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#e8f5ff] text-[#1a6fa8]">
                <SparklesIcon className="w-4 h-4" aria-hidden="true" />
              </span>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-[#1a6fa8]">
                    Version v1.2.0
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase bg-[#e8f5ff] text-[#1a6fa8]">
                    New
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  NeuroPath has been updated with R-GORI inspection &amp; DepEd PDF enhancements.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowVersionPopup(false)}
              aria-label="Dismiss version popup"
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors cursor-pointer"
            >
              <CloseIcon className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-100 flex justify-end">
            <button
              type="button"
              onClick={() => {
                setShowVersionPopup(false);
                setShowChangelog(true);
              }}
              aria-label="View version v1.2.0 changelog"
              className="text-xs font-bold text-[#2589c7] hover:text-[#1a6fa8] underline underline-offset-2 cursor-pointer flex items-center gap-1"
            >
              View Changelogs →
            </button>
          </div>
        </div>
      )}

      {/* HERO */}
      <section
        ref={heroRef}
        className="relative pt-32 pb-20 lg:pt-40 lg:pb-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center"
      >
        {/* Background blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div
            className="absolute top-[10%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[80px]"
            style={{ background: "rgba(130,199,255,0.25)" }}
          />
          <div
            className="absolute top-[30%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[100px]"
            style={{ background: "rgba(37,137,199,0.15)" }}
          />
          <div
            className="absolute bottom-[5%] left-[25%] w-[350px] h-[350px] rounded-full blur-[90px]"
            style={{ background: "rgba(130,199,255,0.2)" }}
          />
          <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#2589c7_1px,transparent_1px),linear-gradient(to_bottom,#2589c7_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>

        {/* Hero left */}
        <div className="lg:col-span-7 flex flex-col items-start text-left">
          <div
            className="fade-in-init opacity-0 translate-y-4 transition-all duration-700 ease-out inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-6"
            style={{
              background: "rgba(130,199,255,0.15)",
              border: "1px solid rgba(130,199,255,0.4)",
              color: "#1a6fa8",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-ping"
              style={{ background: "#82C7FF" }}
            />
            Individualized Education Plans
          </div>

          <h1
            className="fade-in-init opacity-0 translate-y-4 transition-all duration-700 ease-out delay-75 text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.15] mb-6"
            style={{ color: "#1a3a4a" }}
          >
            Every student
            <br />
            <RotatingText
              texts={[
                "deserves a path",
                "has the potential",
                "learns differently",
                "deserves a champion",
              ]}
              mainClassName="px-0 py-1 rounded-lg overflow-hidden justify-center"
              elementLevelClassName="gradient-text-char"
              staggerFrom="last"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.025}
              splitLevelClassName="overflow-hidden pb-0.5"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={2500}
              splitBy="characters"
              auto
              loop
            />
            <span style={{ color: "#1a3a4a" }}>built for them.</span>
          </h1>

          <p
            className="fade-in-init opacity-0 translate-y-4 transition-all duration-700 ease-out delay-150 text-base sm:text-lg max-w-xl leading-relaxed mb-8"
            style={{ color: "#4a7a94" }}
          >
            NeuroPath empowers special education teachers to build, manage, and
            track compliant IEPs seamlessly, ensuring every student has a clear
            path to success.
          </p>

          <div className="fade-in-init opacity-0 translate-y-4 transition-all duration-700 ease-out delay-200 flex items-center gap-4 w-full sm:w-auto">
            <button
              onClick={handleNavigateLogin}
              className="group flex items-center justify-center gap-2 text-white font-semibold px-6 py-3.5 rounded-xl transition-all active:scale-[0.98] w-full sm:w-auto"
              style={{
                background: "linear-gradient(135deg, #2589c7 0%, #82C7FF 100%)",
                boxShadow: "0 4px 16px rgba(130,199,255,0.45)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 6px 24px rgba(130,199,255,0.6)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow =
                  "0 4px 16px rgba(130,199,255,0.45)")
              }
            >
              Get Started
              <span className="group-hover:translate-x-1 transition-transform">
                →
              </span>
            </button>
          </div>
        </div>

        {/* Hero right — Real Progress Dashboard Mockup */}
        <div className="lg:col-span-5 w-full flex justify-center lg:justify-end fade-in-init opacity-0 translate-y-4 transition-all duration-1000 ease-out delay-200">
          <div
            className="w-full max-w-[440px] rounded-2xl overflow-hidden shadow-2xl transition-all"
            style={{
              background: "#ffffff",
              border: "1px solid rgba(130,199,255,0.35)",
              boxShadow: "0 20px 50px rgba(37,137,199,0.18)",
            }}
          >
            {/* Topbar */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{
                background: "linear-gradient(135deg, #1a6fa8 0%, #2589c7 50%, #5aabf0 100%)",
                borderBottom: "1px solid #93c5fd",
              }}
            >
              <div className="flex items-center gap-2">
                <ChartBarIcon className="w-4 h-4 text-white" aria-hidden="true" />
                <span className="text-xs font-bold text-white tracking-wide">
                  Progress Dashboard
                </span>
              </div>
              <span
                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full tracking-wide uppercase shadow-sm"
                style={{
                  background: "#e8f5ff",
                  border: "1px solid #82C7FF",
                  color: "#1a6fa8",
                }}
              >
                ● Active IEP
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Student Header */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                style={{ background: "#f0f8ff", border: "1px solid #bfdbfe" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-sm flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #1a6fa8, #2589c7)" }}
                >
                  AS
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold truncate text-slate-800">
                    Angelo Singson
                  </p>
                  <p className="text-xs font-medium text-[#2589c7]">
                    Grade 1 · SPED Learner
                  </p>
                </div>
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 inline-flex items-center gap-1"
                  style={{
                    background: "#e8f5ff",
                    border: "1px solid #82C7FF",
                    color: "#1a6fa8",
                  }}
                >
                  <CheckIcon className="w-3 h-3 text-[#1a6fa8]" aria-hidden="true" />
                  On Track
                </span>
              </div>

              {/* Classroom Executive KPIs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Executive Performance KPIs
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Updated Oct 24, 2026
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className="rounded-xl p-2.5 text-left border"
                    style={{ background: "#f8fbff", borderColor: "#dbeafe" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-600">Mastery Rate</span>
                      <ChartBarIcon className="w-3.5 h-3.5 text-[#2589c7]" aria-hidden="true" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-[#1a3a4a]">78%</span>
                      <span className="text-[10px] text-[#2589c7] font-semibold">↑ 4% gain</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">Avg across 5 domains</span>
                  </div>

                  <div
                    className="rounded-xl p-2.5 text-left border"
                    style={{ background: "#f8fbff", borderColor: "#dbeafe" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-600">Goals on Track</span>
                      <TargetIcon className="w-3.5 h-3.5 text-[#2589c7]" aria-hidden="true" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-[#1a6fa8]">4</span>
                      <span className="text-[10px] text-slate-400 font-normal">/ 5 domains</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">≥ 70% benchmark</span>
                  </div>

                  <div
                    className="rounded-xl p-2.5 text-left border"
                    style={{ background: "#f8fbff", borderColor: "#dbeafe" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-600">Needs Support</span>
                      <WarningIcon className="w-3.5 h-3.5 text-[#5aabf0]" aria-hidden="true" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-[#2589c7]">1</span>
                      <span className="text-[10px] text-[#4a7a94] font-medium">Domain</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">&lt; 70% threshold</span>
                  </div>

                  <div
                    className="rounded-xl p-2.5 text-left border"
                    style={{ background: "#f8fbff", borderColor: "#dbeafe" }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-slate-600">Target Benchmark</span>
                      <CalendarIcon className="w-3.5 h-3.5 text-[#2589c7]" aria-hidden="true" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-lg font-bold text-[#1a6fa8]">70%</span>
                      <span className="text-[10px] text-[#2589c7] font-semibold">Standard</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">DepEd mastery criteria</span>
                  </div>
                </div>
              </div>

              {/* DepEd Domain Mastery with 70% Benchmark Reference Line */}
              <div className="pt-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#2589c7] inline-block" />
                    DepEd Learning Domains
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-[#1a6fa8] font-bold bg-[#f0f8ff] px-2 py-0.5 rounded border border-[#bfdbfe]">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#2589c7]" />
                    70% Target Benchmark
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[
                    { label: "Communication", value: 88, status: "On Track", bg: "linear-gradient(90deg, #1a6fa8, #2589c7)" },
                    { label: "Reading", value: 82, status: "On Track", bg: "linear-gradient(90deg, #2589c7, #3d9de8)" },
                    { label: "Mathematics", value: 74, status: "On Track", bg: "linear-gradient(90deg, #3d9de8, #5aabf0)" },
                    { label: "Social Skills", value: 64, status: "Needs Support", bg: "linear-gradient(90deg, #82C7FF, #5aabf0)" },
                  ].map((item) => (
                    <div key={item.label} className="group">
                      <div className="flex justify-between items-center text-[11px] mb-1">
                        <span className="font-semibold text-slate-700">{item.label}</span>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded"
                            style={{
                              background: item.value >= 70 ? "#e8f5ff" : "#f0f8ff",
                              color: item.value >= 70 ? "#1a6fa8" : "#4a7a94",
                              border: `1px solid ${item.value >= 70 ? "#82C7FF" : "#bfdbfe"}`,
                            }}
                          >
                            {item.status}
                          </span>
                          <span className="font-bold text-[#1a3a4a] min-w-[28px] text-right">
                            {item.value}%
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2 rounded-full overflow-hidden bg-slate-100 border border-slate-200">
                        {/* 70% Target Benchmark indicator line */}
                        <div
                          className="absolute top-0 bottom-0 z-10 w-0.5 bg-[#1a6fa8] opacity-60"
                          style={{ left: "70%" }}
                          title="70% Target Benchmark"
                        />
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${item.value}%`,
                            background: item.bg,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Progress Log Strip Footer */}
              <div
                className="flex items-center justify-between px-3 py-2 rounded-lg text-[10px] text-slate-600"
                style={{ background: "#f0f8ff", border: "1px solid #dbeafe" }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2589c7] animate-pulse" />
                  <span className="font-medium">Classroom Trend:</span>
                  <span className="font-semibold text-[#1a3a4a]">Sep 62% → Oct 78%</span>
                </div>
                <span className="font-bold text-[#1a6fa8] bg-[#e8f5ff] px-1.5 py-0.5 rounded border border-[#82C7FF]/60">
                  +16% Attainment
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        className="py-20 lg:py-28"
        id="features"
        style={{
          background: "#fff",
          borderTop: "1px solid rgba(130,199,255,0.2)",
          borderBottom: "1px solid rgba(130,199,255,0.2)",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="fade-in-init opacity-0 translate-y-4 transition-all duration-700 ease-out max-w-2xl mx-auto text-center mb-16 lg:mb-20">
            <span
              className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
              style={{ color: "#1a6fa8", background: "rgba(130,199,255,0.15)" }}
            >
              Features
            </span>
            <h2
              className="text-3xl sm:text-4xl font-bold tracking-tight mt-4 mb-4"
              style={{ color: "#1a3a4a" }}
            >
              Everything your IEP team needs
            </h2>
            <p className="text-base sm:text-lg" style={{ color: "#4a7a94" }}>
              One platform to write, manage, track, and report — built
              specifically for special education.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((f, i) => (
              <FeatureCard key={i} feature={f} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        className="py-20 lg:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
        id="about"
      >
        <div
          className="fade-in-init opacity-0 translate-y-4 transition-all duration-1000 ease-out relative text-white rounded-3xl p-8 sm:p-12 lg:p-16 text-center overflow-hidden shadow-2xl"
          style={{
            background:
              "linear-gradient(135deg, #1a6fa8 0%, #2589c7 50%, #82C7FF 100%)",
          }}
        >
          <div
            className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full blur-[80px] pointer-events-none"
            style={{ background: "rgba(255,255,255,0.15)" }}
          />
          <div
            className="absolute bottom-0 left-0 w-[250px] h-[250px] rounded-full blur-[70px] pointer-events-none"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />

          <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              Start building better IEPs today.
            </h2>
            <p
              className="text-sm sm:text-base max-w-md mb-8 leading-relaxed"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              Built for special education teachers who believe every student
              deserves a plan as unique as they are.
            </p>
            <button
              onClick={handleNavigateRegister}
              className="group flex items-center justify-center gap-2 font-bold px-6 py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all w-full sm:w-auto text-sm"
              style={{ background: "#fff", color: "#1a6fa8" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "#f0f8ff")
              }
              onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
            >
              Create Your Free Account
              <span
                className="group-hover:translate-x-1 transition-transform"
                style={{ color: "#82C7FF" }}
              >
                →
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="py-8"
        style={{
          borderTop: "1px solid rgba(130,199,255,0.2)",
          background: "#fff",
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 opacity-80">
            <BoltIcon className="w-5 h-5 text-[#2589c7]" aria-hidden="true" />
            <span
              className="text-md font-bold tracking-tight"
              style={{ color: "#1a6fa8" }}
            >
              NeuroPath
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowChangelog(true)}
              className="text-xs font-semibold text-[#2589c7] hover:text-[#1a6fa8] underline underline-offset-2 cursor-pointer"
            >
              Changelog &amp; Release Notes (v1.2.0)
            </button>
            <span className="text-xs text-slate-300">•</span>
            <p className="text-xs" style={{ color: "#82C7FF" }}>
              © 2026 NeuroPath. Empowering every learner's journey.
            </p>
          </div>
        </div>
      </footer>

      {/* CHANGELOG & RELEASE NOTES MODAL */}
      {showChangelog && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="changelog-modal-title"
          onClick={() => setShowChangelog(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-[#82C7FF]/40 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#f0f8ff]/60">
              <div className="flex items-center gap-2.5">
                <SparklesIcon className="w-5 h-5 text-[#1a6fa8]" aria-hidden="true" />
                <div>
                  <h2 id="changelog-modal-title" className="text-lg font-extrabold text-[#1a3a4a]">
                    Changelog &amp; Release Notes
                  </h2>
                  <p className="text-xs text-[#5a9dbf]">
                    What's new in NeuroPath
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangelog(false)}
                aria-label="Close changelog modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <CloseIcon className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {RELEASE_NOTES.map((rel) => (
                <div
                  key={rel.version}
                  className="rounded-xl border border-slate-200/80 p-5 bg-slate-50/50"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-[#1a6fa8]">
                        {rel.version}
                      </span>
                      {rel.isLatest && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border-blue-200">
                          Latest Release
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {rel.date}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-3 leading-relaxed">
                    {rel.summary}
                  </p>
                  <ul className="space-y-2">
                    {rel.changes.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold border ${item.tagColor}`}
                        >
                          {item.tag}
                        </span>
                        <span className="leading-relaxed">{item.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setShowChangelog(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1a6fa8] hover:bg-[#155a8a] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
