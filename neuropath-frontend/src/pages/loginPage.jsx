import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage({ onNavigateRegister, successMessage, onClearMessage }) {
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => onClearMessage(), 5000)
      return () => clearTimeout(t)
    }
  }, [successMessage, onClearMessage])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      const data = await login(form.email, form.password)
      alert(`Welcome back, ${data.teacher.firstName}! 🎉\nYou are now signed in to NeuroPath.`)
    } catch (err) {
      setError(err.message || 'Invalid email or password.')
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

        {/* Testimonial Quote Card Component */}
        <div className="relative z-10 my-auto max-w-sm w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-6 shadow-2xl">
          <p className="text-white font-medium text-base italic leading-relaxed">
            "NeuroPath helped us cut IEP writing time in half while keeping every goal measurable and compliant."
          </p>
          <div className="mt-4 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center border border-sky-400/10">
              EP
            </div>
            <span className="text-xs text-slate-400 font-semibold tracking-wide">
              Special Education Team
            </span>
          </div>
        </div>

        {/* Bottom Context Pill */}
        <div className="relative z-10 text-xs text-slate-500">
          🔒 FERPA Compliant Documentation Platform
        </div>
      </div>

      {/* RIGHT LOGIN FORM SIDE */}
      <div className="col-span-1 lg:col-span-7 flex items-center justify-center p-6 sm:p-12 md:p-16">
        <div className="w-full max-w-md flex flex-col text-left">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 mb-2">Welcome back</h1>
            <p className="text-sm text-slate-500 font-medium">Sign in to your NeuroPath account</p>
          </div>

          {/* Success Notification Banner */}
          {successMessage && (
            <div className="mb-6 flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm p-3.5 rounded-xl">
              <span className="text-base">✅</span>
              <p className="font-medium">{successMessage}</p>
            </div>
          )}

          {/* Error Notification Banner */}
          {error && (
            <div className="mb-6 flex items-center gap-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-sm p-3.5 rounded-xl">
              <span className="text-base">⚠️</span>
              <p className="font-medium">{error}</p>
            </div>
          )}

          {/* Core Login Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            
            {/* Email Field Block */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <input
                  id="email" 
                  name="email" 
                  type="email"
                  value={form.email} 
                  onChange={handleChange}
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium shadow-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
                />
              </div>
            </div>

            {/* Password Field Block */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  id="password" 
                  name="password"
                  type={showPass ? 'text' : 'password'} 
                  
                  value={form.password} 
                  onChange={handleChange}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium shadow-sm outline-none transition-all focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10"
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
                <>Sign In <span className="text-base">→</span></>
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
            Don't have an account?{' '}
            <button 
              className="text-sky-600 hover:text-sky-700 font-bold hover:underline transition-colors outline-none focus:underline" 
              onClick={onNavigateRegister}
            >
              Create one here
            </button>
          </p>

        </div>
      </div>

    </div>
  )
}