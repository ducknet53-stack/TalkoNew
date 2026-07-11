import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';
import { TALKO_LOGO_DATA_URL } from './assets';

export const SYSTEM_USER_ID = 'system_talko_destek';

export async function ensureSystemAccount() {
  try {
    const systemRef = doc(db, 'users', SYSTEM_USER_ID);
    const systemSnap = await getDoc(systemRef);

    const systemUser: User = {
      uid: SYSTEM_USER_ID,
      username: 'Talko Destek',
      usernameLower: 'talko destek',
      email: 'destek@talko.app',
      photoURL: TALKO_LOGO_DATA_URL,
      about: 'Talko resmi destek ve duyuru hesabı.',
      isOnline: true,
      lastSeen: Date.now(),
      createdAt: Date.now()
    };

    if (!systemSnap.exists()) {
      await setDoc(systemRef, systemUser);
    } else {
      // Force update to make sure any expired logo is replaced with our high-quality SVG data url
      await updateDoc(systemRef, {
        photoURL: TALKO_LOGO_DATA_URL
      });
    }
  } catch (err) {
    console.error('Failed to ensure system account:', err);
  }
}

// Function to send welcome message
export async function sendWelcomeMessageIfNeeded(userId: string, username: string, photoURL: string | null = null) {
  try {
    const chatId = [SYSTEM_USER_ID, userId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);

    if (!chatSnap.exists()) {
      const now = Date.now();
      // Create chat
      await setDoc(chatRef, {
        id: chatId,
        participants: [SYSTEM_USER_ID, userId],
        participantDetails: {
          [SYSTEM_USER_ID]: { username: 'Talko Destek', photoURL: TALKO_LOGO_DATA_URL },
          [userId]: { username, photoURL: photoURL }
        },
        lastMessage: `Merhaba ${username}, Talko'ya hoş geldin!`,
        lastMessageTimestamp: now,
        updatedAt: now
      });

      // Create message
      const messageId = now.toString();
      const messageRef = doc(db, `chats/${chatId}/messages`, messageId);
      await setDoc(messageRef, {
        id: messageId,
        senderId: SYSTEM_USER_ID,
        text: `Merhaba ${username}, Talko'ya hoş geldin!\n\nPlatformumuz üzerinden mesajlaşabilir, fotoğraf gönderebilir ve profilinizi kişiselleştirebilirsiniz. Herhangi bir duyuru olduğunda bu sohbet üzerinden bilgilendirileceksiniz.\n\nKeyifli sohbetler!`,
        imageUrl: null,
        timestamp: now
      });
    } else {
      // Keep chat details updated with the fresh logo
      await updateDoc(chatRef, {
        [`participantDetails.${SYSTEM_USER_ID}.photoURL`]: TALKO_LOGO_DATA_URL
      });
    }
  } catch (err) {
    console.error('Failed to send welcome message:', err);
  }
}
