import { useState } from 'react'
import '../styles/OutcomeMonitoring.css'

const MOCK_STUDENTS = [
  { id: 1, name: 'John Doe', grade: 3, age: 10 },
  { id: 2, name: 'Maria Santos', grade: 2, age: 8 },
  { id: 3, name: 'Carlo Reyes', grade: 4, age: 10 },
]

const MOCK_SUBJECTS = {
  1: [
    {
      id: 1,
      name: 'Communication Skills',
      progress: 75,
      status: 'On Track',
      lastUpdated: 'May 15, 2026',
      assessmentsCompleted: '8 / 20',
      skillsMastered: '6 / 10',
      currentLevel: 'Developing',
      targetLevel: 'Proficient',
      chartData: [20, 35, 45, 55, 75],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    },
    {
      id: 2,
      name: 'Reading',
      progress: 50,
      status: 'Needs Support',
      lastUpdated: 'May 10, 2026',
      assessmentsCompleted: '5 / 20',
      skillsMastered: '4 / 10',
      currentLevel: 'Emerging',
      targetLevel: 'Developing',
      chartData: [10, 20, 30, 40, 50],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    },
    {
      id: 3,
      name: 'Mathematics',
      progress: 88,
      status: 'On Track',
      lastUpdated: 'May 18, 2026',
      assessmentsCompleted: '15 / 20',
      skillsMastered: '9 / 10',
      currentLevel: 'Proficient',
      targetLevel: 'Advanced',
      chartData: [50, 60, 70, 80, 88],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    },
  ],
  2: [
    {
      id: 1,
      name: 'Reading',
      progress: 60,
      status: 'On Track',
      lastUpdated: 'May 12, 2026',
      assessmentsCompleted: '10 / 20',
      skillsMastered: '5 / 8',
      currentLevel: 'Developing',
      targetLevel: 'Proficient',
      chartData: [15, 30, 40, 55, 60],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    },
  ],
  3: [
    {
      id: 1,
      name: 'Attention & Focus',
      progress: 45,
      status: 'Needs Support',
      lastUpdated: 'May 14, 2026',
      assessmentsCompleted: '6 / 15',
      skillsMastered: '3 / 8',
      currentLevel: 'Emerging',
      targetLevel: 'Developing',
      chartData: [10, 20, 30, 38, 45],
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
    },
  ],
}

// Simple SVG line chart
function LineChart({ data, months }) {
  const w = 280, h = 100
  const max = 100
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (w - 20) + 10
    const y = h - (v / max) * (h - 10) - 5
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      {/* Grid lines */}
      {[25, 50, 75, 100].map((v) => {
        const y = h - (v / max) * (h - 10) - 5
        return (
          <g key={v}>
            <line x1={10} y1={y} x2={w - 10} y2={y} stroke="#e3eaf2" strokeWidth={1} />
            <text x={0} y={y + 4} fontSize={9} fill="#aaa">{v}</text>
          </g>
        )
      })}
      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#5aabf0"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Dots */}
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * (w - 20) + 10
        const y = h - (v / max) * (h - 10) - 5
        return <circle key={i} cx={x} cy={y} r={4} fill="#5aabf0" stroke="#fff" strokeWidth={2} />
      })}
      {/* Month labels */}
      {months.map((m, i) => {
        const x = (i / (months.length - 1)) * (w - 20) + 10
        return <text key={m} x={x} y={h + 14} fontSize={9} fill="#aaa" textAnchor="middle">{m}</text>
      })}
    </svg>
  )
}

export default function ViewProgressDashboard() {
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterAge, setFilterAge] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [selectedSubject, setSelectedSubject] = useState(null)

  const filtered = MOCK_STUDENTS.filter((s) => {
    const matchName = s.name.toLowerCase().includes(search.toLowerCase())
    const matchGrade = filterGrade ? s.grade === parseInt(filterGrade) : true
    const matchAge = filterAge ? s.age === parseInt(filterAge) : true
    return matchName && matchGrade && matchAge
  })

  // ── Subject Detail ─────────────────────────────────────
  if (selectedSubject) {
    const statusColor = selectedSubject.status === 'On Track' ? '#16a34a' : '#d97706'
    const statusBg = selectedSubject.status === 'On Track' ? '#dcfce7' : '#fef3c7'

    return (
      <div className="page-content">
        <div className="om-header">
          <span className="om-header-title">View Progress Dashboard</span>
        </div>
        <div className="om-body">
          <div className="om-record-card">
            {/* Subject header */}
            <div className="om-subject-header">
              <h2 className="om-subject-title">{selectedSubject.name}</h2>
              <span className="om-status-badge" style={{ color: statusColor, background: statusBg }}>
                {selectedSubject.status}
              </span>
            </div>
            <p className="om-last-updated">Last Updated: {selectedSubject.lastUpdated}</p>

            {/* Overall progress bar */}
            <div className="om-progress-section">
              <div className="om-progress-label">
                <span>Overall Progress</span>
                <span className="om-progress-pct">{selectedSubject.progress}%</span>
              </div>
              <div className="om-progress-track">
                <div className="om-progress-fill" style={{ width: `${selectedSubject.progress}%` }} />
              </div>
            </div>

            {/* Chart + Summary */}
            <div className="om-detail-grid">
              <div className="om-chart-box">
                <p className="om-box-title">Progress Over Time</p>
                <LineChart data={selectedSubject.chartData} months={selectedSubject.months} />
              </div>
              <div className="om-summary-box">
                <p className="om-box-title">Summary</p>
                <div className="om-summary-rows">
                  {[
                    { label: 'Assessments Completed', value: selectedSubject.assessmentsCompleted },
                    { label: 'Skills Mastered', value: selectedSubject.skillsMastered },
                    { label: 'Current Level', value: selectedSubject.currentLevel },
                    { label: 'Target Level', value: selectedSubject.targetLevel },
                  ].map((row) => (
                    <div key={row.label} className="om-summary-row">
                      <span className="om-summary-label">{row.label}</span>
                      <span className="om-summary-value">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="om-record-actions">
              <button className="btn btn-back" onClick={() => setSelectedSubject(null)}>
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Subject List ───────────────────────────────────────
  if (selectedStudent) {
    const subjects = MOCK_SUBJECTS[selectedStudent.id] || []
    return (
      <div className="page-content">
        <div className="om-header">
          <span className="om-header-title">View Progress Dashboard</span>
        </div>
        <div className="om-body">
          <div className="om-card">
            <div className="om-search-bar" style={{ marginBottom: 20 }}>
              <input className="form-input om-search-input" placeholder="Search Subject" />
            </div>
            <div className="om-subject-list">
              {subjects.map((sub) => (
                <div key={sub.id} className="om-subject-row">
                  <span className="om-subject-name">{sub.name}</span>
                  <button className="va-select-btn" onClick={() => setSelectedSubject(sub)}>
                    View Progress
                  </button>
                </div>
              ))}
            </div>
            <div className="om-record-actions" style={{ marginTop: 20 }}>
              <button className="btn btn-back" onClick={() => setSelectedStudent(null)}>
                ← Back to Students
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Student List ───────────────────────────────────────
  return (
    <div className="page-content">
      <div className="om-header">
        <span className="om-header-title">View Progress Dashboard</span>
      </div>
      <div className="om-body">
        <div className="om-card">
          <h2 className="om-list-title">List of Students</h2>
          <div className="om-search-bar">
            <input
              className="form-input om-search-input"
              placeholder="Search Student Records"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="om-filters">
              <span className="om-filter-label">Filter:</span>
              <select className="form-select om-filter-select" value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)}>
                <option value="">Grade</option>
                {[1,2,3,4,5,6].map((g) => <option key={g} value={g}>Grade {g}</option>)}
              </select>
              <select className="form-select om-filter-select" value={filterAge} onChange={(e) => setFilterAge(e.target.value)}>
                <option value="">Age</option>
                {[6,7,8,9,10,11,12].map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className="om-student-list">
            {filtered.length === 0 ? (
              <p className="om-empty">No students found.</p>
            ) : (
              filtered.map((s) => (
                <div key={s.id} className="om-student-row">
                  <div className="va-student-avatar" />
                  <div className="va-student-info">
                    <span className="va-student-name">{s.name}</span>
                    <span className="va-student-grade">Grade – {s.grade}</span>
                  </div>
                  <button className="va-select-btn" onClick={() => setSelectedStudent(s)}>
                    Select
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
