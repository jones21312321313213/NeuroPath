import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

function Router() {
  const [page, setPage] = useState('landing')
  const [successMessage, setSuccessMessage] = useState('')

  const navigate = (to, msg = '') => {
    setSuccessMessage(msg)
    setPage(to)
  }

  return (
    <>
      {page === 'landing' && (
        <LandingPage onGetStarted={() => navigate('login')} />
      )}
      {page === 'login' && (
        <LoginPage
          onNavigateRegister={() => navigate('register')}
          successMessage={successMessage}
          onClearMessage={() => setSuccessMessage('')}
        />
      )}
      {page === 'register' && (
        <RegisterPage
          onNavigateLogin={(msg) => navigate('login', msg)}
        />
      )}
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Router />
    </AuthProvider>
  )
}
