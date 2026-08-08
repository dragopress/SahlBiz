import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  orgId: string;
  orgName: string;
  createdAt: string;
  plan?: string;
  billingCycle?: 'monthly' | 'annually';
  paymentMethod?: string;
  paymentStatus?: 'confirmed' | 'pending' | 'trial';
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  login: (e: string, p: string) => Promise<void>;
  register: (e: string, p: string, displayName: string, orgName: string, planData?: { plan: string; billingCycle: 'monthly' | 'annually'; paymentMethod: string; paymentStatus?: 'confirmed' | 'pending' | 'trial' }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync user profile from Firestore whenever Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            setUserProfile(userSnap.data() as UserProfile);
          } else {
            // Auto-provision default organization for user if not existing
            const defaultOrgName = user.displayName ? `${user.displayName}'s Company` : 'SahlBiz Enterprise';
            const defaultOrgId = `org_${user.uid.slice(0, 8)}`;
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
              orgId: defaultOrgId,
              orgName: defaultOrgName,
              createdAt: new Date().toISOString(),
            };

            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
          }
        } catch (err) {
          console.error('Error fetching user profile in AuthProvider:', err);
          // Fallback profile if Firestore read fails initially
          setUserProfile({
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Utilisateur',
            orgId: `org_${user.uid.slice(0, 8)}`,
            orgName: 'Ma Société SahlBiz',
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        console.warn('Firebase Email/Password Auth is not enabled in Firebase Console. Logging in locally.');
        
        const fallbackUsersRaw = localStorage.getItem('sahlbiz_fallback_users');
        const fallbackUsers = fallbackUsersRaw ? JSON.parse(fallbackUsersRaw) : [];
        
        const matched = fallbackUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
        
        if (matched) {
          if (matched.pass === pass) {
            const mockUid = `demo_${matched.email.replace(/[^a-zA-Z0-9]/g, '')}`;
            const mockUser = {
              uid: mockUid,
              email: matched.email,
              displayName: matched.displayName,
              emailVerified: true,
            } as User;
            
            const mockProfile: UserProfile = {
              uid: mockUid,
              email: matched.email,
              displayName: matched.displayName,
              orgId: `org_${mockUid.slice(0, 8)}`,
              orgName: matched.orgName || 'Ma Société SahlBiz (Démo)',
              createdAt: new Date().toISOString(),
              plan: 'pro',
              billingCycle: 'monthly',
              paymentMethod: 'cmi_card',
              paymentStatus: 'confirmed',
            };
            
            setCurrentUser(mockUser);
            setUserProfile(mockProfile);
            return;
          } else {
            const wrongPasswordError = new Error('Wrong password');
            (wrongPasswordError as any).code = 'auth/wrong-password';
            throw wrongPasswordError;
          }
        } else {
          // Special admin/master bypass so the system owner can enter their console immediately
          if (email.toLowerCase() === 'elbyoutydragopress@gmail.com' || email.toLowerCase() === 'admin@sahlbiz.ma') {
            const mockUid = 'demo_admin';
            const mockUser = {
              uid: mockUid,
              email: email,
              displayName: 'Admin SahlBiz',
              emailVerified: true,
            } as User;
            
            const mockProfile: UserProfile = {
              uid: mockUid,
              email: email,
              displayName: 'Admin SahlBiz',
              orgId: 'org_master',
              orgName: 'SahlBiz Technologies',
              createdAt: new Date().toISOString(),
              plan: 'business',
              billingCycle: 'annually',
              paymentMethod: 'cmi_card',
              paymentStatus: 'confirmed',
            };
            
            setCurrentUser(mockUser);
            setUserProfile(mockProfile);
            return;
          }

          const notFoundError = new Error('User not found');
          (notFoundError as any).code = 'auth/user-not-found';
          throw notFoundError;
        }
      }
      throw err;
    }
  };

  const register = async (
    email: string,
    pass: string,
    displayName: string,
    orgName: string,
    planData?: { plan: string; billingCycle: 'monthly' | 'annually'; paymentMethod: string; paymentStatus?: 'confirmed' | 'pending' | 'trial' }
  ) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        await updateProfile(res.user, { displayName });
        const orgId = `org_${res.user.uid.slice(0, 8)}`;
        const newProfile: UserProfile = {
          uid: res.user.uid,
          email: res.user.email || email,
          displayName,
          orgId,
          orgName: orgName.trim() || 'Ma Société SahlBiz',
          createdAt: new Date().toISOString(),
          plan: planData?.plan || 'pro',
          billingCycle: planData?.billingCycle || 'monthly',
          paymentMethod: planData?.paymentMethod || 'free_trial',
          paymentStatus: planData?.paymentStatus || 'confirmed',
        };

        await setDoc(doc(db, 'users', res.user.uid), newProfile);
        setUserProfile(newProfile);
      }
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        console.warn('Firebase Email/Password Auth is not enabled in Firebase Console. Registering locally.');
        
        const fallbackUsersRaw = localStorage.getItem('sahlbiz_fallback_users');
        const fallbackUsers = fallbackUsersRaw ? JSON.parse(fallbackUsersRaw) : [];
        
        if (fallbackUsers.some((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
          const inUseError = new Error('Email already in use');
          (inUseError as any).code = 'auth/email-already-in-use';
          throw inUseError;
        }

        const newUser = {
          email,
          pass,
          displayName,
          orgName
        };
        fallbackUsers.push(newUser);
        localStorage.setItem('sahlbiz_fallback_users', JSON.stringify(fallbackUsers));

        const mockUid = `demo_${Math.random().toString(36).substr(2, 9)}`;
        const mockUser = {
          uid: mockUid,
          email: email,
          displayName: displayName,
          emailVerified: true,
        } as User;
        
        const mockProfile: UserProfile = {
          uid: mockUid,
          email: email,
          displayName,
          orgId: `org_${mockUid.slice(0, 8)}`,
          orgName: orgName.trim() || 'Ma Société SahlBiz (Démo)',
          createdAt: new Date().toISOString(),
          plan: planData?.plan || 'pro',
          billingCycle: planData?.billingCycle || 'monthly',
          paymentMethod: planData?.paymentMethod || 'free_trial',
          paymentStatus: planData?.paymentStatus || 'confirmed',
        };

        setCurrentUser(mockUser);
        setUserProfile(mockProfile);
        return;
      }
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed' || (err.message && err.message.includes('operation-not-allowed'))) {
        console.warn('Firebase password reset is not enabled. Simulating local reset.');
        const fallbackUsersRaw = localStorage.getItem('sahlbiz_fallback_users');
        const fallbackUsers = fallbackUsersRaw ? JSON.parse(fallbackUsersRaw) : [];
        const matched = fallbackUsers.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
        if (!matched && email.toLowerCase() !== 'elbyoutydragopress@gmail.com' && email.toLowerCase() !== 'admin@sahlbiz.ma') {
          const notFoundError = new Error('User not found');
          (notFoundError as any).code = 'auth/user-not-found';
          throw notFoundError;
        }
        return;
      }
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
