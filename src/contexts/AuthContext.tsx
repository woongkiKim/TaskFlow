// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../FBase';
import { Box, CircularProgress } from '@mui/material';

const IS_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateDisplayName: (newName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// 커스텀 훅: 컴포넌트에서 쉽게 사용하기 위함
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// ─── Mock User (Firebase Auth 없이 사용) ─────────────────
const MOCK_USER = {
  uid: 'mock_user_001',
  displayName: '김영수 (Mock)',
  email: 'youngsoo@test.com',
  photoURL: null,
  emailVerified: true,
  // Stubs for Firebase User interface fields that might be accessed
  isAnonymous: false,
  metadata: {},
  providerData: [],
  refreshToken: '',
  tenantId: null,
  delete: async () => { },
  getIdToken: async () => 'mock-token',
  getIdTokenResult: async () => ({ token: 'mock-token', claims: {}, authTime: '', issuedAtTime: '', expirationTime: '', signInProvider: null, signInSecondFactor: null }),
  reload: async () => { },
  toJSON: () => ({}),
  phoneNumber: null,
  providerId: 'mock',
} as unknown as User;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(IS_MOCK ? MOCK_USER : null);
  const [loading, setLoading] = useState(!IS_MOCK);

  // 1. 로그인 상태 감지 (Firebase Listener) — mock 모드에서는 skip
  useEffect(() => {
    if (IS_MOCK) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. 구글 로그인 함수
  const signInWithGoogle = async () => {
    if (IS_MOCK) {
      setUser(MOCK_USER);
      return;
    }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login Failed", error);
      throw error;
    }
  };

  // 3. 로그아웃 함수
  const logout = async () => {
    if (IS_MOCK) {
      setUser(null);
      return;
    }
    return signOut(auth);
  };

  // 4. 프로필 업데이트 함수
  const updateDisplayName = async (newName: string) => {
    if (IS_MOCK) {
      if (user) setUser({ ...user, displayName: newName } as User);
      return;
    }
    if (auth.currentUser) {
      const { updateProfile } = await import('firebase/auth');
      await updateProfile(auth.currentUser, { displayName: newName });
      setUser({ ...auth.currentUser }); // Force refresh of user object in state
    }
  };

  const value = { user, loading, signInWithGoogle, logout, updateDisplayName };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};