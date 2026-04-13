import { useEffect, useState, useCallback, type ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  reload,
  type User,
} from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

// ─── Context type ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u ? { ...u } : null);
      setLoading(false);
    });
    return unsub;
  }, []);

  const refreshUser = useCallback(async () => {
    if (!auth.currentUser) return;
    await reload(auth.currentUser);
    setUser({ ...auth.currentUser });
  }, []);

  const loginWithEmail = async (e: string, p: string) => { await signInWithEmailAndPassword(auth, e, p); };
  const loginWithGoogle = async () => { await signInWithPopup(auth, googleProvider); };
  const register = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    setUser({ ...cred.user });

    // Envia o e-mail de confirmação
    await sendEmailVerification(cred.user);
  };
  const logout = async () => { await signOut(auth); };
  const resetPassword = async (email: string) => { await sendPasswordResetEmail(auth, email); };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithEmail, loginWithGoogle, register, logout, resetPassword, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}
