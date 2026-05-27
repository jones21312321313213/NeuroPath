import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import RotatingText from "../components/ui/RotatingText";
const features = [
  {
    icon: "🎯",
    title: "Personalized Goals",
    desc: "Set, track, and adapt learning objectives tailored to each student's unique needs and abilities.",
  },
  {
    icon: "📋",
    title: "IEP Generation",
    desc: "Generate compliant Individualized Education Plans powered by AI, tailored to each student's unique needs and goals.",
  },
  {
    icon: "🧠",
    title: "AI Insights",
    desc: "Leverage AI to analyze student data and surface actionable recommendations for educators and specialists.",
  },
  {
    icon: "📚",
    title: "Lesson Plan Management",
    desc: "Create, organize, and manage lesson plans designed around each student's IEP goals and learning preferences.",
  },
  {
    icon: "🎨",
    title: "Visual Aid Management",
    desc: "Generate and manage visual aids tailored to ASD learners, supporting communication and comprehension in the classroom.",
  },
  {
    icon: "📈",
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
  const heroRef = useRef(null);

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

  const rotatingPhrases = [
    "deserves a path",
    "has the potential",
    "learns differently",
    "deserves a champion",
  ];
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setPhraseIndex((i) => (i + 1) % rotatingPhrases.length);
        setAnimating(false);
      }, 400); // halfway through transition — swap text while faded out
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div
      className="min-h-screen font-sans overflow-x-hidden"
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
            <span className="text-2xl animate-pulse text-[#2589c7]">⚡</span>
            <span className="text-xl font-bold tracking-tight text-[#1a6fa8]">
              NeuroPath
            </span>
          </div>

          <div className="flex items-center gap-6 sm:gap-8">
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
              href="signin"
              onClick={onGetStarted}
              className={`text-sm font-semibold transition-all active:scale-95 text-[#1a6fa8] border-[1.5px] border-[#82C7FF] bg-white shadow-[0_1px_4px_rgba(130,199,255,0.2)] hover:bg-[#e8f5ff] hover:border-[#2589c7]
                ${scrolled ? "px-3.5 py-1.5 rounded-full text-xs" : "px-4 py-2 rounded-xl"}`}
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

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
              onClick={onGetStarted}
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

        {/* Hero right — Dashboard mockup */}
        <div className="lg:col-span-5 w-full flex justify-center lg:justify-end fade-in-init opacity-0 translate-y-4 transition-all duration-1000 ease-out delay-200">
          <div
            className="w-full max-w-[420px] rounded-2xl overflow-hidden"
            style={{
              background: "#fff",
              border: "1px solid rgba(130,199,255,0.3)",
              boxShadow: "0 20px 60px rgba(37,137,199,0.15)",
            }}
          >
            {/* Topbar */}
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{
                background: "linear-gradient(135deg, #2589c7 0%, #82C7FF 100%)",
                borderBottom: "1px solid #B5D4F4",
              }}
            >
              <span
                className="text-xs font-semibold"
                style={{ color: "white" }}
              >
                Progress dashboard
              </span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: "#E1F5EE",
                  border: "1px solid #9FE1CB",
                  color: "#085041",
                }}
              >
                IEP active
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Profile row */}
              <div
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "#E6F1FB", border: "0.5px solid #B5D4F4" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm flex-shrink-0"
                  style={{ background: "#378ADD", color: "#E6F1FB" }}
                >
                  AS
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p
                    className="text-sm font-bold truncate"
                    style={{ color: "#1a3a4a" }}
                  >
                    Angelo Singson
                  </p>
                  <p className="text-xs" style={{ color: "#185FA5" }}>
                    Grade 1 · ASD
                  </p>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{
                    background: "#E1F5EE",
                    border: "1px solid #9FE1CB",
                    color: "#085041",
                  }}
                >
                  On track
                </span>
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Assessments completed", val: "10/10", pct: "100%" },
                  { label: "Skills mastered", val: "6/10", pct: "60%" },
                  { label: "Goals achieved", val: "4/6", pct: "67%" },
                  { label: "Attendance rate", val: "92%", pct: "↑ 4%" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="rounded-lg p-2.5"
                    style={{ background: "#f0f8ff" }}
                  >
                    <p
                      className="text-[10px] mb-1"
                      style={{ color: "#4a7a94" }}
                    >
                      {s.label}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "#1a3a4a" }}
                      >
                        {s.val}
                      </span>
                      <span
                        className="text-[10px]"
                        style={{ color: "#82C7FF" }}
                      >
                        {s.pct}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress bars */}
              <div className="space-y-3">
                {[
                  { label: "Reading fluency", value: 72, color: "#378ADD" },
                  { label: "Math comprehension", value: 58, color: "#7F77DD" },
                  { label: "Social skills", value: 89, color: "#1D9E75" },
                ].map((item) => (
                  <div key={item.label}>
                    <div
                      className="flex justify-between text-[11px] mb-1"
                      style={{ color: "#4a7a94" }}
                    >
                      <span>{item.label}</span>
                      <span style={{ color: "#1a3a4a" }}>{item.value}%</span>
                    </div>
                    <div
                      className="h-1.5 rounded-full overflow-hidden"
                      style={{ background: "#E6F1FB" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${item.value}%`,
                          background: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
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
              onClick={() => navigate("/register")}
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
            <span className="text-xl" style={{ color: "#2589c7" }}>
              ⚡
            </span>
            <span
              className="text-md font-bold tracking-tight"
              style={{ color: "#1a6fa8" }}
            >
              NeuroPath
            </span>
          </div>
          <p className="text-xs" style={{ color: "#82C7FF" }}>
            © 2026 NeuroPath. Empowering every learner's journey.
          </p>
        </div>
      </footer>
    </div>
  );
}
