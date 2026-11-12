import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

const REFRESH_EVERY_MS = 4 * 60 * 1000; // token dura 15 min: renova a cada 4
const MAX_IDLE_MS = 10 * 60 * 1000; // sem atividade por 10 min: deixa a sessão expirar

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const lastActivityRef = useRef(Date.now());

  const validateSession = useCallback(async () => {
    const token = localStorage.getItem('@LashSaaS:token');
    if (!token) {
      setLoadingAuth(false);
      return;
    }
    try {
      const profile = await authService.getProfile();
      setUser(profile.user);
    } catch {
      localStorage.removeItem('@LashSaaS:token');
      localStorage.removeItem('@LashSaaS:user');
      setUser(null);
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    validateSession();
  }, [validateSession]);

  // Sessão deslizante: renova o token enquanto a usuária está ativa.
  // O servidor impõe um teto absoluto de 8 h e revoga a sessão se a conta for desativada.
  useEffect(() => {
    if (!user) return undefined;
    const markActive = () => { lastActivityRef.current = Date.now(); };
    const events = ['pointerdown', 'keydown', 'scroll'];
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

    const timer = setInterval(async () => {
      if (Date.now() - lastActivityRef.current > MAX_IDLE_MS) return;
      try {
        const data = await authService.refresh();
        if (data?.token) localStorage.setItem('@LashSaaS:token', data.token);
      } catch {
        // 401 é tratado pelo interceptor (redireciona ao login); falhas de rede tentam de novo no próximo ciclo.
      }
    }, REFRESH_EVERY_MS);

    return () => {
      clearInterval(timer);
      events.forEach((e) => window.removeEventListener(e, markActive));
    };
  }, [user]);

  const signIn = async (email, password) => {
    const data = await authService.login({ email, password });
    localStorage.setItem('@LashSaaS:token', data.token);
    localStorage.setItem('@LashSaaS:user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const data = await authService.changePassword(currentPassword, newPassword);
    if (data.token) localStorage.setItem('@LashSaaS:token', data.token);
    const profile = await authService.getProfile();
    localStorage.setItem('@LashSaaS:user', JSON.stringify(profile.user));
    setUser(profile.user);
    return data;
  };

  const signOut = () => {
    localStorage.removeItem('@LashSaaS:token');
    localStorage.removeItem('@LashSaaS:user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loadingAuth, signIn, signOut, changePassword, validateSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser utilizado dentro de AuthProvider');
  return context;
};