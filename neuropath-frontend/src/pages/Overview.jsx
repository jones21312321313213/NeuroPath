const stats = [
  { label: 'Total Students', value: '0', icon: '👤' },
  { label: 'Active IEPs', value: '0', icon: '📋' },
  { label: 'AI Insights Generated', value: '0', icon: '🧠' },
  { label: 'Upcoming Reviews', value: '0', icon: '📅' },
]

const quickActions = [
  { label: 'Create Student Profile', page: 'create-student-profile', desc: 'Add a new student with ASD background and learning preferences.' },
  { label: 'View All Students', page: 'view-student-profile', desc: 'Browse and manage existing student records.' },
  { label: 'Generate IEP', page: 'iep-generation', desc: 'Use AI to generate a personalized education plan.' },
]

export default function Overview({ setActivePage }) {
  return (
    <div className="page-content">
      <div className="overview-wrapper">

        {/* Welcome */}
        <div className="overview-welcome">
          <h1 className="overview-title">Welcome back, Teacher!</h1>
          <p className="overview-subtitle">
            Here's a summary of your NeuroPath dashboard. Manage student profiles,
            track progress, and generate AI-powered Individualized Education Plans (IEPs)
            tailored for students with Autism Spectrum Disorder.
          </p>
        </div>

        {/* Stats */}
        <div className="overview-stats">
          {stats.map((s) => (
            <div key={s.label} className="stat-card">
              <span className="stat-icon">{s.icon}</span>
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="overview-section">
          <h2 className="overview-section-title">Quick Actions</h2>
          <div className="quick-actions">
            {quickActions.map((a) => (
              <button key={a.page} className="quick-action-card" onClick={() => setActivePage(a.page)}>
                <span className="quick-action-label">{a.label}</span>
                <span className="quick-action-desc">{a.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="overview-section">
          <h2 className="overview-section-title">About NeuroPath</h2>
          <p className="overview-body">
            NeuroPath is a specialized platform designed to support educators and specialists
            working with students diagnosed with Autism Spectrum Disorder (ASD). It streamlines
            the creation and management of student profiles, tracks behavioral and academic progress,
            and leverages AI to generate individualized education plans — helping every student
            reach their full potential.
          </p>
        </div>

      </div>
    </div>
  )
}
