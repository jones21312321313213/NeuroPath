import { useState } from 'react'

const SUPPORT_NEEDS = ['Minimal Support', 'Moderate Support', 'Substantial Support', 'Full Support']
const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say']
const ACADEMIC_LEVELS = ['Below Grade Level', 'At Grade Level', 'Above Grade Level']
const LEARNING_STYLES = ['Visual', 'Auditory', 'Kinesthetic', 'Read/Write']
const INTERESTS = ['Arts & Crafts', 'Music', 'Sports', 'Technology', 'Nature', 'Reading']
const SENSORY_PREFS = ['Low Stimulation', 'Moderate Stimulation', 'High Stimulation']

function SelectField({ id, options, value, onChange, placeholder = 'Choose' }) {
  return (
    <select id={id} className="form-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}

export default function CreateStudentProfile({ onBack }) {
  const [form, setForm] = useState({
    fullName: '', age: '', gradeLevel: '', gender: '',
    diagnosis: '', supportNeeds: '',
    academicLevel: '', behavioralNotes: '',
    learningStyle: '', interests: '', sensoryPreferences: '',
  })

  const set = (field) => (val) => setForm((f) => ({ ...f, [field]: val }))

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Submitted:', form)
    alert('Student profile submitted!')
  }

  return (
    <div className="page-content">
      <div className="form-card">

        {/* Student Information */}
        <section className="form-section">
          <h2 className="form-section-title">Student Information</h2>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="fullName">Full Name:</label>
              <input
                id="fullName" type="text" className="form-input"
                placeholder="Enter Full Name"
                value={form.fullName} onChange={(e) => set('fullName')(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="age">Age:</label>
              <input
                id="age" type="number" className="form-input"
                placeholder="Enter age"
                value={form.age} onChange={(e) => set('age')(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gradeLevel">Grade Level:</label>
              <input
                id="gradeLevel" type="text" className="form-input"
                placeholder="Enter Grade, ex: 5"
                value={form.gradeLevel} onChange={(e) => set('gradeLevel')(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="gender">Gender:</label>
              <SelectField id="gender" options={GENDER_OPTIONS} value={form.gender} onChange={set('gender')} />
            </div>
          </div>
        </section>

        {/* ASD Background + Assessment Results side by side */}
        <div className="form-two-col-sections">
          {/* ASD Background */}
          <section className="form-section">
            <h2 className="form-section-title">ASD Background</h2>
            <div className="form-group">
              <label className="form-label" htmlFor="diagnosis">Diagnosis:</label>
              <input
                id="diagnosis" type="text" className="form-input"
                placeholder="ex: Autism Spectrum Disorder"
                value={form.diagnosis} onChange={(e) => set('diagnosis')(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="supportNeeds">Support Needs:</label>
              <SelectField id="supportNeeds" options={SUPPORT_NEEDS} value={form.supportNeeds} onChange={set('supportNeeds')} />
            </div>
          </section>

          {/* Assessment Results */}
          <section className="form-section">
            <h2 className="form-section-title">Assessment Results</h2>
            <div className="form-group">
              <label className="form-label" htmlFor="academicLevel">Academic Level:</label>
              <SelectField id="academicLevel" options={ACADEMIC_LEVELS} value={form.academicLevel} onChange={set('academicLevel')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="behavioralNotes">Behavioral Notes:</label>
              <textarea
                id="behavioralNotes" className="form-textarea"
                value={form.behavioralNotes} onChange={(e) => set('behavioralNotes')(e.target.value)}
              />
            </div>
          </section>
        </div>

        {/* Preferences */}
        <section className="form-section">
          <h2 className="form-section-title">Preferences</h2>
          <div className="form-grid-preferences">
            <div className="form-group">
              <label className="form-label" htmlFor="learningStyle">Learning Style:</label>
              <SelectField id="learningStyle" options={LEARNING_STYLES} value={form.learningStyle} onChange={set('learningStyle')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="interests">Interests:</label>
              <SelectField id="interests" options={INTERESTS} value={form.interests} onChange={set('interests')} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="sensoryPreferences">Sensory Preferences:</label>
              <SelectField id="sensoryPreferences" options={SENSORY_PREFS} value={form.sensoryPreferences} onChange={set('sensoryPreferences')} />
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="form-actions">
          <button className="btn btn-back" onClick={onBack}>BACK</button>
          <button className="btn btn-submit" onClick={handleSubmit}>SUBMIT</button>
        </div>

      </div>
    </div>
  )
}
