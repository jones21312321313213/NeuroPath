import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import '../styles/auth.css'

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
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email.'
    // Role validation removed as it is set by default
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
        role: form.role, // Still passed cleanly to the backend payload
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
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-left-content">
          <div className="logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">NeuroPath</span>
          </div>
          <div className="auth-visual">
            <div className="auth-blob auth-blob-1" />
            <div className="auth-blob auth-blob-2" />
            <div className="register-steps-card">
              <p className="steps-title">Getting started is easy</p>
              <ul className="steps-list">
                <li>
                  <span className="step-num">1</span>
                  <div><strong>Create your account</strong><span>Takes less than a minute</span></div>
                </li>
                <li>
                  <span className="step-num">2</span>
                  <div><strong>Add your students</strong><span>Import or add individually</span></div>
                </li>
                <li>
                  <span className="step-num">3</span>
                  <div><strong>Build your first IEP</strong><span>Guided templates included</span></div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <h1>Create your account</h1>
            <p>Join NeuroPath and start building better IEPs</p>
          </div>

          {errors.general && (
            <div className="alert alert-error"><span>⚠️</span> {errors.general}</div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="firstName">First Name</label>
                <div className="input-wrap">
                  <span className="input-icon">👤</span>
                  <input id="firstName" name="firstName" type="text" placeholder="Lyster"
                    value={form.firstName} onChange={handleChange}
                    className={errors.firstName ? 'input-error' : ''} />
                </div>
                {errors.firstName && <span className="field-error">{errors.firstName}</span>}
              </div>
              <div className="form-group">
                <label htmlFor="lastName">Last Name</label>
                <div className="input-wrap">
                  <span className="input-icon">👤</span>
                  <input id="lastName" name="lastName" type="text" placeholder="Arbiol"
                    value={form.lastName} onChange={handleChange}
                    className={errors.lastName ? 'input-error' : ''} />
                </div>
                {errors.lastName && <span className="field-error">{errors.lastName}</span>}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email Address</label>
              <div className="input-wrap">
                <input id="reg-email" name="email" type="email"
                  value={form.email} onChange={handleChange}
                  className={errors.email ? 'input-error' : ''} />
              </div>
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>

            {/* Note: The role UI section has been removed completely to streamline onboarding. 
                The 'special_ed_teacher' string is handled purely in state. */}

            <div className="form-group">
              <label htmlFor="reg-password">Password</label>
              <div className="input-wrap">
                <input id="reg-password" name="password"
                  type={showPass ? 'text' : 'password'}
                  value={form.password} onChange={handleChange}
                  className={errors.password ? 'input-error' : ''} />
                <button type="button" className="toggle-pass"
                  onClick={() => setShowPass(!showPass)}>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrap">
                <input id="confirmPassword" name="confirmPassword"
                  type={showPass ? 'text' : 'password'}
                  value={form.confirmPassword} onChange={handleChange}
                  className={errors.confirmPassword ? 'input-error' : ''} />
              </div>
              {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
            </div>

            <button className="btn-submit" type="submit" disabled={loading}>
              {loading ? <span className="spinner" /> : <>Create Account <span className="btn-arrow">→</span></>}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <p className="auth-switch">
            Already have an account?{' '}
            <button className="link-btn" onClick={() => onNavigateLogin('')}>Sign in here</button>
          </p>
        </div>
      </div>
    </div>
  )
}