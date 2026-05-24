import { useState } from 'react'

// ── CUSTOM INPUT REUSABLE HELPERS (DEFINED OUTSIDE TO PRESERVE FOCUS) ──
function FormField({ label, placeholder, value, onChange, type = 'text' }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-500 whitespace-nowrap w-32 text-right shrink-0">{label}:</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="flex-1 h-9 px-3 text-sm bg-gray-100 border border-gray-200 rounded text-gray-600 placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:bg-white transition-colors"
      />
    </div>
  )
}

function SelectField({ label, options, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm text-gray-500 whitespace-nowrap w-36 text-right shrink-0">{label}:</label>
      <div className="relative flex-1 max-w-56">
        <select
          value={value}
          onChange={onChange}
          className="w-full h-9 pl-3 pr-8 text-sm bg-gray-100 border border-gray-200 rounded text-gray-500 focus:outline-none focus:border-sky-400 focus:bg-white transition-colors appearance-none cursor-pointer"
        >
          {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
      </div>
    </div>
  )
}

// ── MAIN SCREEN LIFECYCLE COMPONENT ──
export default function IEPGenerationPage() {
  const [step, setStep] = useState(1)
  
  // Single unified data layer across all multi-step contexts
  const [form, setForm] = useState({
    // ── STEP 1 FIELDS ──
    fullName: '', age: '', gradeLevel: '', diagnosis: '',
    primaryDiagnosis: 'Autism Spectrum Disorder', // Built-in locked selection default
    severity: '',
    readingLevel: '', mathSkills: '', writingSkills: '', strengths: '', weaknesses: '',
    peerInteraction: '', behaviorIssues: '', attentionSpan: '',
    verbalAbility: '', comprehension: '',

    // ── STEP 2 FIELDS (Learning Needs & Preferences) ──
    needsReading: false,
    needsWriting: false,
    needsMath: false,
    needsCommunication: false,
    needsSocialSkills: false,
    needsBehavior: true, // Checked by default
    specificChallenges: '',
    goalAcademic: true,
    goalCommunication: true,
    goalBehavior: false,
    goalDailyLiving: false,
    goalMotorSkills: true,
    strategyVisualAids: false,
    strategyRepetition: false,
    strategyOneOnOne: false,
    timeframe: '',
    classroomType: '',

    // ── STEP 3 FIELDS (Generate IEP Options Setup) ──
    includeObjectives: true,
    includeStrategies: true,
    includeMethods: true,
  })

  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value })
  const setCheckbox = (field) => (e) => setForm({ ...form, [field]: e.target.checked })

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const handleGenerateGoals = () => {
    alert('Generating AI IEP Goals with selected options...')
  }

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 max-w-3xl mx-auto p-8 relative min-h-[520px] flex flex-col justify-between">
        
        <div>
          {/* ── SCREEN STEP 1: STUDENT PROFILE SETUP ── */}
          {step === 1 && (
            <div className="animate-fadeIn">
              <h2 className="text-sm font-semibold text-gray-700 mb-4 text-left">Student Profile</h2>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-5">
                <FormField label="Full Name" placeholder="Enter Full Name" value={form.fullName} onChange={setField('fullName')} />
                <FormField label="Age" placeholder="Enter age" value={form.age} onChange={setField('age')} type="number" />
                <FormField label="Grade Level" placeholder="Enter Grade, ex: 5" value={form.gradeLevel} onChange={setField('gradeLevel')} />
                <FormField label="Diagnosis" placeholder="ex: Autism Spectrum Disorder" value={form.diagnosis} onChange={setField('diagnosis')} />
              </div>

              <hr className="border-gray-100 mb-5" />
              
              <h2 className="text-sm font-semibold text-gray-700 mb-4 text-left">Diagnosis</h2>
              <div className="flex flex-col gap-3 mb-5">
                <SelectField label="Primary Diagnosis" options={['Autism Spectrum Disorder']} value={form.primaryDiagnosis} onChange={setField('primaryDiagnosis')} />
                <SelectField label="Severity" options={['Mild', 'Moderate', 'Severe', 'Profound']} value={form.severity} onChange={setField('severity')} />
              </div>

              <hr className="border-gray-100 mb-5" />

              <div className="grid grid-cols-2 gap-x-8 mb-5 text-left">
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">Academic Skills</h2>
                  <div className="flex flex-col gap-3">
                    {[['Reading Level', 'readingLevel'], ['Math Skills', 'mathSkills'], ['Writing Skills', 'writingSkills'], ['Strengths', 'strengths'], ['Weaknesses', 'weaknesses']].map(([label, field]) => (
                      <div key={field} className="flex items-center gap-2">
                        <label className="text-sm text-gray-500 whitespace-nowrap w-28 text-right shrink-0">{label}:</label>
                        <input type="text" placeholder="Enter Grade, ex: 5" value={form[field]} onChange={setField(field)} className="flex-1 h-8 px-3 text-xs bg-gray-100 border border-gray-200 rounded text-gray-600 focus:outline-none focus:border-sky-400 focus:bg-white" />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-sm font-semibold text-gray-700 mb-3">Social/Behavior</h2>
                  <div className="flex flex-col gap-3">
                    {[['Peer Interaction', 'peerInteraction'], ['Behavior Issues', 'behaviorIssues'], ['Attention Span', 'attentionSpan']].map(([label, field]) => (
                      <div key={field} className="flex items-center gap-2">
                        <label className="text-sm text-gray-500 whitespace-nowrap w-28 text-right shrink-0">{label}</label>
                        <input type="text" placeholder="Enter Grade, ex: 5" value={form[field]} onChange={setField(field)} className="flex-1 h-8 px-3 text-xs bg-gray-100 border border-gray-200 rounded text-gray-600 focus:outline-none focus:border-sky-400 focus:bg-white" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <hr className="border-gray-100 mb-5" />

              <div className="mb-6 text-left">
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Communication</h2>
                <div className="flex flex-col gap-3 max-w-sm">
                  {[['Verbal Ability', 'verbalAbility'], ['Comprehension', 'comprehension']].map(([label, field]) => (
                    <div key={field} className="flex items-center gap-2">
                      <label className="text-sm text-gray-500 whitespace-nowrap w-28 text-right shrink-0">{label}</label>
                      <input type="text" placeholder="Enter Grade, ex: 5" value={form[field]} onChange={setField(field)} className="flex-1 h-8 px-3 text-xs bg-gray-100 border border-gray-200 rounded text-gray-600 focus:outline-none focus:border-sky-400 focus:bg-white" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SCREEN STEP 2: LEARNING NEEDS & CHALLENGES ── */}
          {step === 2 && (
            <div className="text-left select-none animate-fadeIn">
              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-1">Learning Needs</h3>
                <p className="text-xs text-gray-500 mb-3 ml-4">Peer Interaction:</p>
                
                <div className="grid grid-cols-3 gap-y-3 gap-x-4 max-w-xl ml-4">
                  <label className="flex items-center gap-2.5 text-xs font-medium text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={form.needsReading} onChange={setCheckbox('needsReading')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                    Reading
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-medium text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={form.needsWriting} onChange={setCheckbox('needsWriting')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                    Writing
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-medium text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={form.needsMath} onChange={setCheckbox('needsMath')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                    Math
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-medium text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={form.needsCommunication} onChange={setCheckbox('needsCommunication')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                    Communication
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-medium text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={form.needsSocialSkills} onChange={setCheckbox('needsSocialSkills')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                    Social Skills
                  </label>
                  <label className="flex items-center gap-2.5 text-xs font-medium text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={form.needsBehavior} onChange={setCheckbox('needsBehavior')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                    Behavior
                  </label>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-800 mb-2">Specific Challenges</h3>
                <textarea
                  value={form.specificChallenges}
                  onChange={setField('specificChallenges')}
                  placeholder="Enter Grade, ex: 5"
                  className="w-full h-24 p-3 text-xs bg-gray-100 border border-gray-200 rounded text-gray-600 placeholder-gray-400 focus:outline-none focus:border-sky-400 focus:bg-white resize-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-x-8 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 mb-3">Goal Domains</h3>
                  <div className="flex flex-col gap-2.5">
                    <label className="flex items-center gap-2.5 text-xs font-medium text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={form.goalAcademic} onChange={setCheckbox('goalAcademic')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                      Academic
                    </label>
                    <label className="flex items-center gap-2.5 text-xs font-medium text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={form.goalCommunication} onChange={setCheckbox('goalCommunication')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                      Communication
                    </label>
                    <label className="flex items-center gap-2.5 text-xs font-medium text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={form.goalBehavior} onChange={setCheckbox('goalBehavior')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                      Behavior
                    </label>
                    <label className="flex items-center gap-2.5 text-xs font-medium text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={form.goalDailyLiving} onChange={setCheckbox('goalDailyLiving')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                      Daily Living Skills
                    </label>
                    <label className="flex items-center gap-2.5 text-xs font-medium text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={form.goalMotorSkills} onChange={setCheckbox('goalMotorSkills')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                      Motor Skills
                    </label>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-2">Preferences</h3>
                    <p className="text-xs text-gray-500 mb-2.5">Learning Style</p>
                    
                    <p className="text-xs text-gray-500 mb-2">Strategies Used:</p>
                    <div className="flex flex-wrap items-center gap-4 mb-4">
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={form.strategyVisualAids} onChange={setCheckbox('strategyVisualAids')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                        Visual Aids
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={form.strategyRepetition} onChange={setCheckbox('strategyRepetition')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                        Repetition
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={form.strategyOneOnOne} onChange={setCheckbox('strategyOneOnOne')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                        One-on-One
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-gray-800 mb-2.5">Constraints</h3>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between max-w-xs">
                        <span className="text-xs text-gray-500">Timeframe</span>
                        <div className="relative w-44">
                          <select value={form.timeframe} onChange={setField('timeframe')} className="w-full h-7 pl-2.5 pr-8 text-xs bg-gray-100 border border-gray-200 rounded text-gray-400 focus:outline-none focus:border-sky-400 appearance-none cursor-pointer">
                            <option value="">Choose</option>
                            <option value="Short Term">Short Term</option>
                            <option value="Long Term">Long Term</option>
                          </select>
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">▼</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between max-w-xs">
                        <span className="text-xs text-gray-500">Classroom Type</span>
                        <div className="relative w-44">
                          <select value={form.classroomType} onChange={setField('classroomType')} className="w-full h-7 pl-2.5 pr-8 text-xs bg-gray-100 border border-gray-200 rounded text-gray-400 focus:outline-none focus:border-sky-400 appearance-none cursor-pointer">
                            <option value="">Choose</option>
                            <option value="Inclusion">Inclusion Classroom</option>
                            <option value="Self-Contained">Self-Contained</option>
                          </select>
                          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">▼</span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

          {/* ── SCREEN STEP 3: GENERATE IEP OPTIONS ── */}
          {step === 3 && (
            <div className="flex flex-col items-center justify-center pt-8 pb-4 select-none animate-fadeIn">
              <h2 className="text-xl font-bold text-gray-800 mb-8 tracking-wide">GENERATE IEP</h2>
              
              <div className="text-left w-fit mb-8">
                <p className="text-sm font-bold text-gray-800 mb-4">Options:</p>
                <div className="flex flex-col gap-3.5 pl-4">
                  <label className="flex items-center gap-3 text-xs font-medium text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.includeObjectives} onChange={setCheckbox('includeObjectives')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                    Include Measureable Objectives
                  </label>
                  <label className="flex items-center gap-3 text-xs font-medium text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.includeStrategies} onChange={setCheckbox('includeStrategies')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                    Include Teaching Strategies
                  </label>
                  <label className="flex items-center gap-3 text-xs font-medium text-gray-700 cursor-pointer">
                    <input type="checkbox" checked={form.includeMethods} onChange={setCheckbox('includeMethods')} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                    Include Assessment Methods
                  </label>
                </div>
              </div>

              <button
                onClick={handleGenerateGoals}
                className="bg-sky-400 hover:bg-sky-500 active:bg-sky-600 text-white text-xs font-semibold px-5 py-2.5 rounded transition-colors shadow-sm"
              >
                Generate IEP Goals
              </button>
            </div>
          )}
        </div>

        {/* ── FOOTER NAVIGATION CONTROLS (BACK / NEXT) ── */}
        <div className="flex justify-between items-center mt-8 pt-4 border-t border-gray-50">
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="bg-sky-400 hover:bg-sky-500 active:bg-sky-600 text-white text-xs font-bold px-6 py-2 rounded transition-colors shadow-sm tracking-wider uppercase"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 && (
            <button
              onClick={handleNext}
              className="bg-sky-400 hover:bg-sky-500 active:bg-sky-600 text-white text-xs font-bold px-6 py-2 rounded transition-colors shadow-sm tracking-wider uppercase"
            >
              Next
            </button>
          )}
        </div>

      </div>
    </main>
  )
}