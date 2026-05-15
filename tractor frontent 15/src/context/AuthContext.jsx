import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext({
  user: null,
  isAuthenticated: false,
  role: null,
  login: async () => ({ success: false, message: 'Auth system not ready' }),
  logout: async () => {},
  register: async () => ({ success: false, message: 'Auth system not ready' }),
  loading: true
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize: Check if token exists and verify with backend
  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem('tractorlink_token');
      if (token) {
        try {
          const response = await api.auth.getMe();
          if (response.success) {
            setUser(response.data);
          } else {
            localStorage.removeItem('tractorlink_token');
          }
        } catch (error) {
          console.error("Auth verification failed:", error);
          localStorage.removeItem('tractorlink_token');
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const login = async (phone, password) => {
    try {
      const cleanPhone = String(phone).replace(/\s+/g, '');
      const response = await api.auth.login(cleanPhone, password);
      if (response.success) {
        const { token, user: userData } = response.data;
        localStorage.setItem('tractorlink_token', token);
        setUser(userData);
        return { success: true };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.auth.register(userData);
      if (response.success) {
        return { success: true };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const logout = async () => {
    try {
      // Notify backend to acknowledge logout (JWT is stateless; real logout = clearing token)
      await api.auth.logout();
    } catch (_) {
      // Ignore errors — always clear client-side session regardless
    } finally {
      localStorage.removeItem('tractorlink_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      role: user?.role, 
      login, 
      logout,
      register,
      loading 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
