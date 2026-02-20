// src/services/mock/MockAuthProvider.tsx
// Provides a fake user for mock mode, bypassing Firebase Auth entirely

import { createContext, useContext, useState, type ReactNode } from 'react';
import { MOCK_USER_ID } from './mockData';

// Minimal User interface matching Firebase User fields we actually use
interface MockUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

interface MockAuthContextType {
  user: MockUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const MockAuthContext = createContext<MockAuthContextType | null>(null);

export const useMockAuth = () => {
  const ctx = useContext(MockAuthContext);
  if (!ctx) throw new Error('useMockAuth must be inside MockAuthProvider');
  return ctx;
};

const MOCK_USER: MockUser = {
  uid: MOCK_USER_ID,
  displayName: '김영수 (Mock)',
  email: 'youngsoo@test.com',
  photoURL: null,
  emailVerified: true,
};

export const MockAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<MockUser | null>(MOCK_USER);

  const signInWithGoogle = async () => {
    setUser(MOCK_USER);
  };

  const logout = async () => {
    setUser(null);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value = { user: user as any, loading: false, signInWithGoogle, logout };

  return (
    <MockAuthContext.Provider value={value}>
      {children}
    </MockAuthContext.Provider>
  );
};
