import { useEffect } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserSession } from '../types';

interface PresenceTrackerProps {
  session: UserSession | null;
  currentContentId?: string | null;
  currentActivity?: string;
}

export const PresenceTracker = ({ session, currentContentId, currentActivity }: PresenceTrackerProps) => {
  useEffect(() => {
    if (!session) return;

    const updatePresence = async (isOnline: boolean) => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser || currentUser.uid !== session.id) {
          return;
        }

        const presenceRef = doc(db, 'presence', session.id);
        const data: any = {
          userId: session.id,
          fullName: (session.name || session.username || 'User').substring(0, 100),
          isOnline,
          lastSeen: serverTimestamp()
        };
        
        if (isOnline) {
          if (currentActivity) data.currentActivity = currentActivity.substring(0, 200);
          if (currentContentId) data.contentId = currentContentId.substring(0, 100);
        }

        await setDoc(presenceRef, data, { merge: true });
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user && user.uid === session.id) {
        updatePresence(true);
      }
    });

    updatePresence(true);
    
    // Set up interval to heartbeat
    const interval = setInterval(() => {
      updatePresence(true);
    }, 60000); // every minute

    const handleBeforeUnload = () => {
      updatePresence(false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      unsubscribeAuth();
      updatePresence(false);
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [session, currentContentId, currentActivity]);

  return null;
};
