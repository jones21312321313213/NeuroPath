import { useState } from 'react'
import { studentsAPI } from '../api/client'

const difficultyOptions = [
  'Difficulty in Seeing',
  'Difficulty in Hearing',
  'Difficulty in Communicating',
  'Difficulty in Moving/Walking',
  'Difficulty in Concentrating/Paying Attention',
  'Difficulty in Remembering/Understanding',
  'With Medical Assessment/Diagnosis',
]

const diagnosisOptions = [
  'Autism Spectrum Disorder',
  'Attention Deficit Hyperactivity Disorder',
  'Intellectual Disability',
  'Learning Disability',
  'Speech or Language Impairment',
  'Others',
]

const genderOptions = ['Male', 'Female', 'Other', 'Prefer not to say']

function FormField({ label, placeholder, value, onChange, type = 'text' }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}:</label>
      <input type={type} placeholder={placeholder} value={value} onChange={onChange} className="form-input" />
    </div>
  )
}

function SelectField({ label, options, value, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}:</label>
      <select value={value} onChange={onChange} className="form-select">
        <option value="">Choose</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  )
}

function TextAreaField({ label, placeholder, value, onChange, rows = 3 }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <textarea rows={rows} placeholder={placeholder} value={value} onChange={onChange} className="form-textarea" />
    </div>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="iep-section-header">
      <h2 className="form-section-title">{title}</h2>
      {subtitle && <p className="iep-section-subtitle">{subtitle}</p>}
    </div>
  )
}

function CheckOption({ label, checked, onChange }) {
  return (
    <label className="iep-check-option">
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span>{label}</span>
    </label>
  )
}

export default function CreateStudentProfile({ onBack }) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    school: '',
    schoolYear: '',
    learnerName: '',
    age: '',
    gradeLevel: '',
    gender: '',
    birthdate: '',
    disabilityCategory: 'Autism Spectrum Disorder',
    diagnosisDetails: '',
    difficultyMarkers: [],
    presentEvaluation: '',
    academicStrengths: '',
    academicNeeds: '',
    parentalConcerns: '',
    curriculumImpact: '',
  })

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const toggleDifficulty = (difficulty) => {
    setForm((prev) => ({
      ...prev,
      difficultyMarkers: prev.difficultyMarkers.includes(difficulty)
        ? prev.difficultyMarkers.filter((item) => item !== difficulty)
        : [...prev.difficultyMarkers, difficulty],
    }))
  }

  const validateStepOne = () => {
    const requiredFields = [
      ['learnerName', 'Student name is required.'],
      ['age', 'Age is required.'],
      ['gradeLevel', 'Grade level is required.'],
      ['gender', 'Gender is required.'],
      ['disabilityCategory', 'Diagnosis is required.'],
    ]

    for (const [field, message] of requiredFields) {
      if (!String(form[field] || '').trim()) {
        setError(message)
        return false
      }
    }

    setError('')
    return true
  }

  const validateStepTwo = () => {
    const requiredFields = [
      ['presentEvaluation', 'Please fill in the evaluation / assessment results before saving.'],
      ['academicStrengths', 'Please fill in the learner strengths before saving.'],
      ['academicNeeds', 'Please fill in the learner needs before saving.'],
      ['parentalConcerns', 'Please fill in the parental concerns before saving.'],
      ['curriculumImpact', 'Please fill in the curriculum impact before saving.'],
    ]

    for (const [field, message] of requiredFields) {
      if (!String(form[field] || '').trim()) {
        setError(message)
        return false
      }
    }

    setError('')
    return true
  }

  const handleNext = () => {
    if (!validateStepOne()) return
    setStep(2)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (step !== 2) return
    if (!validateStepTwo()) return

    setSaving(true)
    setError('')

    const studentProfileDetails = {
      school: form.school,
      schoolYear: form.schoolYear,
      studentName: form.learnerName,
      learnerName: form.learnerName,
      birthdate: form.birthdate,
      disabilityCategory: form.disabilityCategory,
      diagnosisDetails: form.diagnosisDetails,
      difficultyMarkers: form.difficultyMarkers,
      presentEvaluation: form.presentEvaluation,
      academicStrengths: form.academicStrengths,
      academicNeeds: form.academicNeeds,
      parentalConcerns: form.parentalConcerns,
      curriculumImpact: form.curriculumImpact,
    }

    const payload = {
      name: form.learnerName,
      age: Number(form.age) || 0,
      grade: Number(form.gradeLevel) || 0,
      gender: form.gender,
      diagnosis: form.disabilityCategory,
      support_needs: form.academicNeeds,
      asdBackground: form.diagnosisDetails,
      assessmentResult: form.presentEvaluation,
      preferences: JSON.stringify(studentProfileDetails),
      profileDetails: studentProfileDetails,
      learning_style: '',
      interests: '',
      sensory_preferences: '',
    }

    try {
      await studentsAPI.create(payload)
      alert('Student profile submitted!')
      if (onBack) onBack()
    } catch (err) {
      setError(err.message || 'Unable to save student profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-content">
      <div className="form-card iep-card">
        <div className="iep-step-header">
          <div>
            <span>Create Student Profile</span>
            <strong>Step {step} of 2</strong>
          </div>
          <div className="iep-progress">
            {[1, 2].map((number) => <i key={number} className={number <= step ? 'active' : ''} />)}
          </div>
        </div>

        {error && <div className="iep-alert iep-alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {step === 1 && (
            <section className="form-section">
              <SectionHeader title="Section A: Personal Information" subtitle="Enter learner information and mark the appropriate difficulty or diagnosis based on assessment." />
              <div className="form-grid-2">
                <FormField label="Student Name" placeholder="Enter student name" value={form.learnerName} onChange={setField('learnerName')} />
                <FormField label="School" placeholder="School name" value={form.school} onChange={setField('school')} />
                <FormField label="School Year" placeholder="2025 - 2026" value={form.schoolYear} onChange={setField('schoolYear')} />
                <FormField label="Age" placeholder="Enter age" type="number" value={form.age} onChange={setField('age')} />
                <FormField label="Grade Level" placeholder="Enter grade level" type="number" value={form.gradeLevel} onChange={setField('gradeLevel')} />
                <SelectField label="Gender" value={form.gender} onChange={setField('gender')} options={genderOptions} />
                <FormField label="Birthdate" placeholder="MM-DD-YYYY" value={form.birthdate} onChange={setField('birthdate')} />
                <SelectField label="Diagnosis" value={form.disabilityCategory} onChange={setField('disabilityCategory')} options={diagnosisOptions} />
              </div>
              <TextAreaField label="Assessment / Diagnosis Details" placeholder="Write the medical assessment, diagnosis, or other important learner information." value={form.diagnosisDetails} onChange={setField('diagnosisDetails')} rows={3} />
              <div>
                <h3 className="iep-small-title">Difficulties — mark the appropriate box based on assessment</h3>
                <div className="iep-check-grid">
                  {difficultyOptions.map((option) => (
                    <CheckOption key={option} label={option} checked={form.difficultyMarkers.includes(option)} onChange={() => toggleDifficulty(option)} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="form-section">
              <SectionHeader title="Present Levels of Academic Achievement and/or Functional Performance" />
              <TextAreaField label="Results of initial or most recent evaluation and results of school assessments" placeholder="Example: The learner fails to finish tasks most of the time, has difficulty in concentrating and paying attention, and may be unable to get what he wants." value={form.presentEvaluation} onChange={setField('presentEvaluation')} rows={4} />
              <TextAreaField label="Description of academic, developmental, and/or functional strengths" placeholder="Example: The learner can spell random words using alphabet blocks and arranges alphabet sequentially." value={form.academicStrengths} onChange={setField('academicStrengths')} rows={4} />
              <TextAreaField label="Description of academic, developmental, and/or functional needs" placeholder="Example: Needs structured routines, visual task supports, shortened activities, sensory breaks, and positive reinforcement." value={form.academicNeeds} onChange={setField('academicNeeds')} rows={4} />
              <TextAreaField label="Parental concerns regarding the child’s education" placeholder="Write concerns shared by the parent or guardian." value={form.parentalConcerns} onChange={setField('parentalConcerns')} rows={3} />
              <TextAreaField label="Impact of the disability on involvement and progress in the general education curriculum" placeholder="Example: The learner has difficulty concentrating and needs support to listen well." value={form.curriculumImpact} onChange={setField('curriculumImpact')} rows={3} />
            </section>
          )}

          <div className="form-actions">
            {step > 1 ? <button type="button" className="btn btn-back" onClick={() => setStep(step - 1)}>BACK</button> : <button type="button" className="btn btn-back" onClick={onBack}>BACK</button>}
            {step < 2 ? (
              <button type="button" className="btn btn-submit" onClick={handleNext}>NEXT</button>
            ) : (
              <button type="submit" className="btn btn-submit" disabled={saving}>{saving ? 'SAVING...' : 'SUBMIT'}</button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
