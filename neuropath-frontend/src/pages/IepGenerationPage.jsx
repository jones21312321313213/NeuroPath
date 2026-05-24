import { useState } from 'react'

export default function IEPGenerationPage() {
  // Current active step tracking (1, 2, or 3)
  const [step, setStep] = useState(1)

  // Preserved state data tree
  const [form, setForm] = useState({
    fullName: '', age: '', gradeLevel: '', diagnosis: '',
    primaryDiagnosis: 'Autism Spectrum Disorder', 
    severity: 'Mild',
    readingLevel: '', mathSkills: '', writingSkills: '', strengths: '', weaknesses: '',
    peerInteraction: '', behaviorIssues: '', attentionSpan: '',
    verbalAbility: '', comprehension: '',

    needsReading: false,
    needsWriting: false,
    needsMath: false,
    needsCommunication: false,
    needsSocialSkills: false,
    needsBehavior: true, 
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

    includeObjectives: true,
    includeStrategies: true,
    includeMethods: true,
  })

  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value })
  const setCheckbox = (field) => (e) => setForm({ ...form, [field]: e.target.checked })

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 3))
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1))

  const handleGenerateGoals = () => {
    alert('Generating AI IEP Goals with selected options...')
  }

  return (
    <div className="flex min-h-screen bg-neutral-50 font-sans antialiased text-gray-600">
      
      {/* ── MAIN DISPLAY VIEW (LEFT PANEL REMOVED) ── */}
      <div className="flex-1 flex flex-col min-w-0">
        

        {/* CONTAINER FLANKED BY EXACTLY 0.5 INCH (mx-8) MARGINS */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="bg-white rounded-xl border border-gray-200 mx-8 p-10 shadow-sm flex flex-col min-h-[500px] justify-between gap-8">
            
            {/* ── STEP 1 VIEW ── */}
            {step === 1 && (
              <div className="flex flex-col gap-8 animate-fadeIn">
                {/* SKILLS DUAL LAYOUT COLUMNS */}
                <div className="grid grid-cols-2 gap-x-12">
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Academic Skills</h2>
                    <div className="flex flex-col gap-3">
                      {[['Reading Level', 'readingLevel'], ['Math Skills', 'mathSkills'], ['Writing Skills', 'writingSkills'], ['Strengths', 'strengths'], ['Weaknesses', 'weaknesses']].map(([label, field]) => (
                        <div key={field} className="flex items-center gap-3">
                          <label className="text-xs font-medium text-gray-500 whitespace-nowrap w-28 text-right shrink-0">{label}:</label>
                          <input type="text" placeholder="Enter Grade, ex: 5" value={form[field]} onChange={setField(field)} className="flex-1 h-8 px-3 text-xs bg-gray-50 border border-gray-200 rounded text-gray-600 placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:bg-white transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Social/Behavior</h2>
                    <div className="flex flex-col gap-3">
                      {[['Peer Interaction', 'peerInteraction'], ['Behavior Issues', 'behaviorIssues'], ['Attention Span', 'attentionSpan']].map(([label, field]) => (
                        <div key={field} className="flex items-center gap-3">
                          <label className="text-xs font-medium text-gray-500 whitespace-nowrap w-28 text-right shrink-0">{label}:</label>
                          <input type="text" placeholder="Enter Grade, ex: 5" value={form[field]} onChange={setField(field)} className="flex-1 h-8 px-3 text-xs bg-gray-50 border border-gray-200 rounded text-gray-600 placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:bg-white transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* COMMUNICATION FIELD GRID */}
                <div>
                  <h2 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Communication</h2>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                    {[['Verbal Ability', 'verbalAbility'], ['Comprehension', 'comprehension']].map(([label, field]) => (
                      <div key={field} className="flex items-center gap-3">
                        <label className="text-xs font-medium text-gray-500 whitespace-nowrap w-32 text-right shrink-0">{label}:</label>
                        <input type="text" placeholder="Enter Grade, ex: 5" value={form[field]} onChange={setField(field)} className="flex-1 h-8 px-3 text-xs bg-gray-50 border border-gray-200 rounded text-gray-600 placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:bg-white transition-colors" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2 VIEW ── */}
            {step === 2 && (
              <div className="flex flex-col gap-8 animate-fadeIn">
                {/* LEARNING NEEDS */}
                <div>
                  <h2 className="text-sm font-bold text-gray-800 mb-2 border-b border-gray-100 pb-2">Learning Needs</h2>
                  <p className="text-xs font-medium text-gray-400 mb-3 ml-2">Peer Interaction:</p>
                  <div className="grid grid-cols-3 gap-y-3.5 gap-x-4 max-w-2xl ml-2">
                    {[
                      ['Reading', 'needsReading'], ['Writing', 'needsWriting'], ['Math', 'needsMath'],
                      ['Communication', 'needsCommunication'], ['Social Skills', 'needsSocialSkills'], ['Behavior', 'needsBehavior']
                    ].map(([lbl, fld]) => (
                      <label key={fld} className="flex items-center gap-2.5 text-xs font-medium text-gray-600 cursor-pointer select-none">
                        <input type="checkbox" checked={form[fld]} onChange={setCheckbox(fld)} className="w-4 h-4 rounded border-gray-200 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>

                {/* SPECIFIC CHALLENGES SYSTEM */}
                <div>
                  <h2 className="text-sm font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">Specific Challenges</h2>
                  <textarea
                    value={form.specificChallenges}
                    onChange={setField('specificChallenges')}
                    placeholder="Enter Grade, ex: 5"
                    className="w-full h-24 p-3 text-xs bg-gray-50 border border-gray-200 rounded text-gray-600 placeholder-gray-300 focus:outline-none focus:border-gray-400 focus:bg-white resize-none transition-colors shadow-inner"
                  />
                </div>

                {/* GOAL DOMAINS, PREFERENCES, AND CONSTRAINTS */}
                <div className="grid grid-cols-2 gap-x-12">
                  <div>
                    <h2 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-100 pb-2">Goal Domains</h2>
                    <div className="flex flex-col gap-3 pl-2">
                      {[
                        ['Academic', 'goalAcademic'], ['Communication', 'goalCommunication'], ['Behavior', 'goalBehavior'],
                        ['Daily Living Skills', 'goalDailyLiving'], ['Motor Skills', 'goalMotorSkills']
                      ].map(([lbl, fld]) => (
                        <label key={fld} className="flex items-center gap-2.5 text-xs font-medium text-gray-600 cursor-pointer select-none">
                          <input type="checkbox" checked={form[fld]} onChange={setCheckbox(fld)} className="w-4 h-4 rounded border-gray-200 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                          {lbl}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    <div>
                      <h2 className="text-sm font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">Preferences</h2>
                      <p className="text-xs font-semibold text-gray-400 mb-2">Learning Style</p>
                      <p className="text-xs font-medium text-gray-400 mb-2.5">Strategies Used:</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-1">
                        {[
                          ['Visual Aids', 'strategyVisualAids'], ['Repetition', 'strategyRepetition'], ['One-on-One', 'strategyOneOnOne']
                        ].map(([lbl, fld]) => (
                          <label key={fld} className="flex items-center gap-2 text-xs font-medium text-gray-600 cursor-pointer select-none">
                            <input type="checkbox" checked={form[fld]} onChange={setCheckbox(fld)} className="w-4 h-4 rounded border-gray-200 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                            {lbl}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h2 className="text-sm font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">Constraints</h2>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-500 w-28 text-right shrink-0">Timeframe</span>
                          <div className="relative flex-1">
                            <select value={form.timeframe} onChange={setField('timeframe')} className="w-full h-8 pl-3 pr-8 text-xs bg-gray-50 border border-gray-200 rounded text-gray-500 focus:outline-none focus:border-gray-400 appearance-none cursor-pointer">
                              <option value="">Choose</option>
                              <option value="Short Term">Short Term</option>
                              <option value="Long Term">Long Term</option>
                            </select>
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">▼</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-500 w-28 text-right shrink-0">Classroom Type</span>
                          <div className="relative flex-1">
                            <select value={form.classroomType} onChange={setField('classroomType')} className="w-full h-8 pl-3 pr-8 text-xs bg-gray-50 border border-gray-200 rounded text-gray-500 focus:outline-none focus:border-gray-400 appearance-none cursor-pointer">
                              <option value="">Choose</option>
                              <option value="Inclusion">Inclusion Classroom</option>
                              <option value="Self-Contained">Self-Contained</option>
                            </select>
                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">▼</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3 VIEW ── */}
            {step === 3 && (
              <div className="flex flex-col items-center justify-center flex-1 py-12 animate-fadeIn">
                <h2 className="text-xl font-bold text-gray-800 tracking-wide mb-6">GENERATE IEP</h2>
                <div className="text-left w-fit mb-8 bg-gray-50 border border-gray-100 p-6 rounded-lg min-w-[320px]">
                  <p className="text-xs font-bold text-gray-700 mb-4 uppercase tracking-wider">Options Included:</p>
                  <div className="flex flex-col gap-3">
                    {[
                      ['Include Measurable Objectives', 'includeObjectives'],
                      ['Include Teaching Strategies', 'includeStrategies'],
                      ['Include Assessment Methods', 'includeMethods']
                    ].map(([lbl, fld]) => (
                      <label key={fld} className="flex items-center gap-3 text-xs font-medium text-gray-600 cursor-pointer select-none">
                        <input type="checkbox" checked={form[fld]} onChange={setCheckbox(fld)} className="w-4 h-4 rounded border-gray-300 text-sky-400 focus:ring-sky-400 cursor-pointer" />
                        {lbl}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGenerateGoals}
                  className="bg-sky-400 hover:bg-sky-500 active:bg-sky-600 text-white text-xs font-bold px-10 py-3.5 rounded shadow-sm tracking-wider uppercase transition-colors"
                >
                  Generate IEP Goals
                </button>
              </div>
            )}

            {/* ── NAVIGATION ACTION BAR (LIGHT BLUE BACK / NEXT CONTROLS) ── */}
            <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={prevStep}
                disabled={step === 1}
                className={`text-xs font-bold px-6 h-9 rounded tracking-wider uppercase transition-colors shadow-sm text-white ${
                  step === 1 
                    ? 'opacity-0 pointer-events-none' 
                    : 'bg-sky-400 hover:bg-sky-500 active:bg-sky-600'
                }`}
              >
                Back
              </button>
              
              {step < 3 && (
                <button
                  onClick={nextStep}
                  className="bg-sky-400 hover:bg-sky-500 active:bg-sky-600 text-white text-xs font-bold px-6 h-9 rounded shadow-sm tracking-wider uppercase ml-auto transition-colors"
                >
                  Next
                </button>
              )}
            </div>

          </div>
        </main>
      </div>

    </div>
  )
}