import { createContext, useContext, useState, useCallback } from 'react';
import axios from "axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Load user from local storage on initial render
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('neuropath_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const login = async (email, password) => {
    // 1. Send credentials to Django
    const response = await axios.post(
      'http://127.0.0.1:8000/api/users/login/', 
      { email, password },
      { withCredentials: true } // Crucial: Tells the browser to save the session cookie!
    );
    
    const data = response.data;
    
    // 2. Save the non-sensitive teacher info to local storage for the UI
    localStorage.setItem('neuropath_user', JSON.stringify(data.teacher));
    
    // 3. Update the React state so App.jsx knows to show the Dashboard
    setUser(data.teacher);
    
    return data;
  };

  const register = async (userData) => {
    const response = await axios.post('http://127.0.0.1:8000/api/users/register/', userData);
    return response.data; 
  };

  const logout = useCallback(() => {
    // Note: The actual database logout is handled in Sidebar.jsx!
    // This just clears the React state if needed.
    localStorage.removeItem('neuropath_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}