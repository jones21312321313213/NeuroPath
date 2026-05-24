import { useState } from 'react'
import '../styles/OutcomeMonitoring.css'

const MOCK_STUDENTS = [
  {
    id: 1,
    name: 'John Doe',
    grade: 3,
    age: 10,
    primaryDisability: 'Autism Spectrum Disorder (Level 2)',
    plaafp: {
      academics: 'Strong in visual math, reading one grade level below.',
      communication: 'Limited verbal output, uses AAC device (requests basic needs), needs support with peer interactions.',
      behavior: 'Sensory sensitivity to loud noises; responds well to structured schedules and visual cues.',
    },
    goals: [
      { id: 1, area: 'Reading', goal: 'Student will identify the main idea of a passage with 80% accuracy across 4 out of 5 trials.' },
      { id: 2, area: 'Communication', goal: 'Student will initiate greetings with peers using AAC device in 3 out of 5 opportunities.' },
      { id: 3, area: 'Behavior', goal: 'Student will use a visual schedule independently for 80% of daily transitions.' },
    ],
  },
  {
    id: 2,
    name: 'Maria Santos',
    grade: 2,
    age: 8,
    primaryDisability: 'Specific Learning Disability (Dyslexia)',
    plaafp: {
      academics: 'Below grade level in reading and writing; strengths in oral comprehension and math.',
      communication: 'Communicates well verbally; struggles with written expression.',
      behavior: 'Generally on task; may avoid reading tasks.',
    },
    goals: [
      { id: 1, area: 'Reading', goal: 'Student will decode CVC words with 85% accuracy.' },
      { id: 2, area: 'Writing', goal: 'Student will write a 3-sentence paragraph with minimal errors in 4 out of 5 attempts.' },
    ],
  },
  {
    id: 3,
    name: 'Carlo Reyes',
    grade: 4,
    age: 10,
    primaryDisability: 'ADHD – Combined Presentation',
    plaafp: {
      academics: 'On grade level in math; reading comprehension needs support.',
      communication: 'Talkative and social; struggles with turn-taking in conversation.',
      behavior: 'Difficulty sustaining attention for more than 10 minutes; responds well to movement breaks.',
    },
    goals: [
      { id: 1, area: 'Attention', goal: 'Student will remain on task for 15-minute intervals with one prompt in 4 out of 5 sessions.' },
      { id: 2, area: 'Reading', goal: 'Student will answer comprehension questions with 75% accuracy.' },
    ],
  },
]

export default function ViewStudentRecords() {
  const [search, setSearch] = useState('')
  const [filterGrade, setFilterGrade] = useState('')
  const [filterAge, setFilterAge] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)

  const filtered = MOCK_STUDENTS.filter((s) => {
    const matchName = s.name.toLowerCase().includes(search.toLowerCase())
    const matchGrade = filterGrade ? s.grade === parseInt(filterGrade) : true
    const matchAge = filterAge ? s.age === parseInt(filterAge) : true
    return matchName && matchGrade && matchAge
  })

  // ── Student Record Detail ──────────────────────────────
  if (selectedStudent) {
    return (
      <div className="page-content">
        <div className="om-header">
          <span className="om-header-title">View Student Records</span>
        </div>
        <div className="om-body">
          <div className="om-record-card">
            <h2 className="om-record-title">Student Record</h2>

            {/* Student Profile */}
            <div className="om-section">
              <div className="om-section-header">STUDENT PROFILE</div>
              <div className="om-profile-grid">
                <div className="om-profile-field">
                  <span className="om-field-label">Name:</span>
                  <span>{selectedStudent.name}</span>
                </div>
                <div className="om-profile-field">
                  <span className="om-field-label">Age:</span>
                  <span>{selectedStudent.age}</span>
                </div>
                <div className="om-profile-field">
                  <span className="om-field-label">Grade:</span>
                  <span>{selectedStudent.grade}th</span>
                </div>
                <div className="om-profile-field full-width">
                  <span className="om-field-label">Primary Disability:</span>
                  <span>{selectedStudent.primaryDisability}</span>
                </div>
              </div>
            </div>

            {/* PLAAFP */}
            <div className="om-section">
              <div className="om-section-header">PRESENT LEVELS OF PERFORMANCE (PLAAFP)</div>
              <div className="om-plaafp">
                <p><strong>Academics:</strong> {selectedStudent.plaafp.academics}</p>
                <p><strong>Communication:</strong> {selectedStudent.plaafp.communication}</p>
                <p><strong>Behavior:</strong> {selectedStudent.plaafp.behavior}</p>
              </div>
            </div>

            {/* Goals */}
            <div className="om-section">
              <div className="om-section-header">GOALS & OBJECTIVES</div>
              <div className="om-goals">
                {selectedStudent.goals.map((g) => (
                  <div key={g.id} className="om-goal-row">
                    <span className="om-goal-area">{g.area}</span>
                    <span className="om-goal-text">{g.goal}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="om-record-actions">
              <button className="btn btn-back" onClick={() => setSelectedStudent(null)}>
                ← Back
              </button>
              <button className="btn om-export-btn">
                EXPORT
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
        <span className="om-header-title">View Student Records</span>
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
