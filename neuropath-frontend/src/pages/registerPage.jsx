import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage({ onNavigateLogin }) {
  const { register } = useAuth()
  const [form, setForm] = useState({
    firstName: '', 
    lastName: '', 
    email: '',
    role: 'special_ed_teacher', // Defaulted to the only available role
    password: '', 
    confirmPassword: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'First name is required.'
    if (!form.lastName.trim()) e.lastName = 'Last name is required.'
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
  e.email = 'Enter a valid email.'
}
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters.'
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match.'
    return e
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      const data = await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: form.role,
      })
      onNavigateLogin(`Account created for ${data.teacher.firstName}! Please sign in.`)
    } catch (err) {
      const msg = err.message || 'Registration failed.'
      if (msg.toLowerCase().includes('email')) {
        setErrors({ email: msg })
      } else {
        setErrors({ general: msg })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-50 text-slate-800 font-sans">
      
      {/* LEFT VISUAL SIDEBAR */}
      <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 p-12 flex-col justify-between relative overflow-hidden text-left">
        {/* Background Decorative Ambient Blobs */}
        <div className="absolute top-[-10%] left-[-10%] w-[350px] h-[350px] bg-sky-500/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-[10%] right-[-10%] w-[350px] h-[350px] bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        {/* Top Header Logo */}
        <div className="flex items-center gap-2 select-none relative z-10">
          <span className="text-2xl text-sky-400">⚡</span>
          <span className="text-xl font-bold tracking-tight text-white">NeuroPath</span>
        </div>

        {/* Process Steps Card Component */}
        <div className="relative z-10 my-auto max-w-sm w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl">
          <p className="text-white font-bold text-lg mb-6">Getting started is easy</p>
          <ul className="space-y-6">
            <li className="flex gap-4 items-start">
              <span className="w-7 h-7 shrink-0 rounded-lg bg-sky-500/10 border border-sky-400/20 text-sky-400 font-bold text-sm flex items-center justify-center">1</span>
              <div>
                <strong className="block text-white text-sm font-semibold">Create your account</strong>
                <span className="text-xs text-slate-400">Takes less than a minute</span>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <span className="w-7 h-7 shrink-0 rounded-lg bg-white/5 border border-white/10 text-slate-400 font-bold text-sm flex items-center justify-center">2</span>
              <div>
                <strong className="block text-white/80 text-sm font-semibold">Add your students</strong>
                <span className="text-xs text-slate-400">Import or add individually</span>
              </div>
            </li>
            <li className="flex gap-4 items-start">
              <span className="w-7 h-7 shrink-0 rounded-lg bg-white/5 border border-white/10 text-slate-400 font-bold text-sm flex items-center justify-center">3</span>
              <div>
                <strong className="block text-white/80 text-sm font-semibold">Build your first IEP</strong>
                <span className="text-xs text-slate-400">Guided templates included</span>
              </div>
            </li>
          </ul>
        </div>

        {/* Bottom Context Pill */}
        <div className="relative z-10 text-xs text-slate-500">
          🔒 FERPA Compliant Documentation Platform
        </div>
      </div>

      {/* RIGHT REGISTER FIELDS FORM */}
      <div className="col-span-1 lg:col-span-7 flex items-center justify-center p-6 sm:p-12 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md flex flex-col text-left">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-2">Create your account</h1>
            <p className="text-sm text-slate-500 font-medium">Join NeuroPath and start building better IEPs</p>
          </div>

          {/* General Alert Banner */}
          {errors.general && (
            <div className="mb-6 flex items-center gap-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-sm p-3.5 rounded-xl">
              <span className="text-base">⚠️</span>
              <p className="font-medium">{errors.general}</p>
            </div>
          )}

          {/* Core Form Element */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            
            {/* First Name & Last Name Grid Layout Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="firstName" className="text-xs font-bold text-slate-700 uppercase tracking-wider">First Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">👤</span>
                  <input 
                    id="firstName" name="firstName" type="text" placeholder="Lyster"
                    value={form.firstName} onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-sm font-medium shadow-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 ${errors.firstName ? 'border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200'}`} 
                  />
                </div>
                {errors.firstName && <span className="block text-xs font-bold text-rose-600 mt-1">{errors.firstName}</span>}
              </div>
              
              <div className="space-y-1.5">
                <label htmlFor="lastName" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Last Name</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">👤</span>
                  <input 
                    id="lastName" name="lastName" type="text" placeholder="Palautog"
                    value={form.lastName} onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-sm font-medium shadow-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 ${errors.lastName ? 'border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200'}`} 
                  />
                </div>
                {errors.lastName && <span className="block text-xs font-bold text-rose-600 mt-1">{errors.lastName}</span>}
              </div>
            </div>

            {/* Email Address Field Block */}
            <div className="space-y-1.5">
              <label htmlFor="reg-email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">✉️</span>
                <input 
                  id="reg-email" name="email" type="email" placeholder="you@school.edu"
                  value={form.email} onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-sm font-medium shadow-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 ${errors.email ? 'border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200'}`} 
                />
              </div>
              {errors.email && <span className="block text-xs font-bold text-rose-600 mt-1">{errors.email}</span>}
            </div>

            {/* Password Field Block */}
            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">🔒</span>
                <input 
                  id="reg-password" name="password"
                  type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password} onChange={handleChange}
                  className={`w-full pl-10 pr-12 py-3 bg-white border rounded-xl text-sm font-medium shadow-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 ${errors.password ? 'border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200'}`} 
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-sm hover:bg-slate-100 active:scale-95 transition-all"
                  onClick={() => setShowPass(!showPass)}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span className="block text-xs font-bold text-rose-600 mt-1">{errors.password}</span>}
            </div>

            {/* Confirm Password Field Block */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Confirm Password</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">🔒</span>
                <input 
                  id="confirmPassword" name="confirmPassword"
                  type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={form.confirmPassword} onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-sm font-medium shadow-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 ${errors.confirmPassword ? 'border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-500/10' : 'border-slate-200'}`} 
                />
              </div>
              {errors.confirmPassword && <span className="block text-xs font-bold text-rose-600 mt-1">{errors.confirmPassword}</span>}
            </div>

            {/* Submit Action Button */}
            <button 
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md shadow-sky-500/5 hover:shadow-lg hover:shadow-sky-500/15 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none text-sm mt-2" 
              type="submit" 
              disabled={loading}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>Create Account <span className="text-base">→</span></>
              )}
            </button>
          </form>

          {/* Form Bottom Nav Switch Link Row */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-[1px] bg-slate-200" />
            <span className="text-xs font-bold text-slate-400 px-3 uppercase tracking-wider select-none">or</span>
            <div className="flex-1 h-[1px] bg-slate-200" />
          </div>

          <p className="text-sm font-medium text-slate-500 text-center">
            Already have an account?{' '}
            <button 
              className="text-sky-600 hover:text-sky-700 font-bold hover:underline transition-colors outline-none focus:underline" 
              onClick={() => onNavigateLogin('')}
            >
              Sign in here
            </button>
          </p>

        </div>
      </div>

    </div>
  )
}