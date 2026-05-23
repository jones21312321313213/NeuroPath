import { useEffect, useRef } from 'react'
import '../styles/landing.css'

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
      (entries) => entries.forEach((e) => e.target.classList.toggle('visible', e.isIntersecting)),
      { threshold: 0.15 }
    )
    document.querySelectorAll('.fade-in').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="landing">
      {/* NAV */}
      <nav className="nav">
        <div className="nav-inner">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">NeuroPath</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <button className="btn-nav" onClick={onGetStarted}>Sign In</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" ref={heroRef}>
        <div className="hero-bg">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
          <div className="blob blob-3" />
          <div className="grid-overlay" />
        </div>
        <div className="hero-content">
          <div className="hero-badge fade-in">
            <span className="badge-dot" />
            Individualized Education Plans
          </div>
          <h1 className="hero-title fade-in">
            Every student
            <br />
            <span className="gradient-text">deserves a path</span>
            <br />
            built for them.
          </h1>
          <p className="hero-desc fade-in">
            NeuroPath empowers special education teachers to build, manage, and track compliant IEPs seamlessly, ensuring every student has a clear path to success.
          </p>
          <div className="hero-actions fade-in">
            <button className="btn-primary" onClick={onGetStarted}>
              Get Started
              <span className="btn-arrow">→</span>
            </button>
          </div>
          
          {/* FIXED: Elements closed correctly here */}
          <div className="hero-stats fade-in">
            <div className="stat">
              {/* Optional space to place specific hero counter numbers later */}
            </div>
          </div>
        </div>

        <div className="hero-visual fade-in">
          <div className="dashboard-mockup">
            <div className="mockup-header">
              <div className="mockup-dots">
                <span /><span /><span />
              </div>
              <span className="mockup-title">Student Dashboard</span>
            </div>
            <div className="mockup-body">
              <div className="mockup-student-card">
                <div className="student-avatar">AS</div>
                <div className="student-info">
                  <span className="student-name">Angelo Singson</span>
                  <span className="student-grade">Grade 1 · IEP Active</span>
                </div>
                <span className="status-badge">On Track</span>
              </div>
              <div className="mockup-goals">
                <div className="goal-item">
                  <span className="goal-label">Reading Fluency</span>
                  <div className="goal-bar"><div className="goal-fill" style={{ width: '72%' }} /></div>
                  <span className="goal-pct">72%</span>
                </div>
                <div className="goal-item">
                  <span className="goal-label">Math Comprehension</span>
                  <div className="goal-bar"><div className="goal-fill" style={{ width: '58%' }} /></div>
                  <span className="goal-pct">58%</span>
                </div>
                <div className="goal-item">
                  <span className="goal-label">Social Skills</span>
                  <div className="goal-bar"><div className="goal-fill goal-green" style={{ width: '89%' }} /></div>
                  <span className="goal-pct">89%</span>
                </div>
              </div>
              <div className="mockup-next">
                <span className="next-label">📅 Next Review</span>
                <span className="next-date">December 17, 2050</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" id="features">
        <div className="section-inner">
          <div className="section-header fade-in">
            <span className="section-tag">Features</span>
            <h2>Everything your IEP team needs</h2>
            <p>One platform to write, manage, track, and report — built specifically for special education.</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div className="feature-card fade-in" key={i} style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" id="about">
        <div className="cta-inner fade-in">
          <div className="cta-blob" />
          <h2>Start building better IEPs today.</h2>
          <p>Join thousands of educators already using NeuroPath to support their students' journeys.</p>
          <button className="btn-primary btn-large" onClick={onGetStarted}>
            Create Your Free Account
            <span className="btn-arrow">→</span>
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">NeuroPath</span>
          </div>
          <p className="footer-copy">© 2026 NeuroPath. Empowering every learner's journey.</p>
        </div>
      </footer>
    </div>
  )
}