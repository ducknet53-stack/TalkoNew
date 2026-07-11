import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types';
import { ensureSystemAccount, sendWelcomeMessageIfNeeded } from '../lib/systemAccount';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userProfile: null,
  loading: true,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let cleanupEvents: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      // Clean up previous user listeners and event handlers if any exist
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (cleanupEvents) {
        cleanupEvents();
        cleanupEvents = null;
      }

      setCurrentUser(user);
      
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        
        let welcomeChecked = false;
        // Listen to profile updates
        unsubscribeProfile = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as User;
            setUserProfile(data);
            
            // Ensure system account and welcome message are set up exactly once per login session
            if (!welcomeChecked && !data.isBanned) {
              welcomeChecked = true;
              ensureSystemAccount().then(() => {
                sendWelcomeMessageIfNeeded(user.uid, data.username, data.photoURL);
              }).catch(e => console.error("Error setting up system account or welcome message:", e));
            }
          }
        });

        // Set online status to true
        await updateDoc(userRef, {
          isOnline: true,
          online: true,
          lastSeen: serverTimestamp()
        }).catch(err => console.error("Error setting online status:", err));

        // Define event handlers
        const setOffline = () => {
          if (auth.currentUser) {
            updateDoc(userRef, {
              isOnline: false,
              online: false,
              lastSeen: serverTimestamp()
            }).catch(() => {});
          }
        };

        const setOnline = () => {
          if (auth.currentUser) {
            updateDoc(userRef, {
              isOnline: true,
              online: true,
              lastSeen: serverTimestamp()
            }).catch(() => {});
          }
        };

        const handleVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
            setOffline();
          } else {
            setOnline();
          }
        };

        const handleBeforeUnload = () => {
          setOffline();
        };

        const handlePageHide = () => {
          setOffline();
        };

        const handleOffline = () => {
          setOffline();
        };

        const handleOnline = () => {
          setOnline();
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        cleanupEvents = () => {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
          window.removeEventListener('beforeunload', handleBeforeUnload);
          window.removeEventListener('pagehide', handlePageHide);
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('online', handleOnline);
          setOffline();
        };

        setLoading(false);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      if (cleanupEvents) {
        cleanupEvents();
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, userProfile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
