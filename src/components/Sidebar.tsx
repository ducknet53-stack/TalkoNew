import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, setDoc, doc, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
import { LogOut, User as UserIcon, Search, MessageSquarePlus, BadgeCheck, Moon, Sun } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Chat, User } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { SYSTEM_USER_ID, ensureSystemAccount, sendWelcomeMessageIfNeeded } from '../lib/systemAccount';
import { TALKO_LOGO_DATA_URL } from '../lib/assets';
import { cn } from '../lib/utils';

interface SidebarProps {
  onChatSelect: (chat: Chat) => void;
  activeChatId?: string;
  onOpenProfile: () => void;
}

export default function Sidebar({ onChatSelect, activeChatId, onOpenProfile }: SidebarProps) {
  const { currentUser, userProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [chats, setChats] = useState<Chat[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Subscribe to chats in real-time
  useEffect(() => {
    if (!currentUser) return;

    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef, 
      where('participants', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedChats = snapshot.docs.map(doc => doc.data() as Chat);
      
      // Sort chats: System chat always first, then by updatedAt desc
      fetchedChats.sort((a, b) => {
        const aIsSystem = a.participants.includes(SYSTEM_USER_ID);
        const bIsSystem = b.participants.includes(SYSTEM_USER_ID);
        
        if (aIsSystem && !bIsSystem) return -1;
        if (!aIsSystem && bIsSystem) return 1;
        
        return b.updatedAt - a.updatedAt;
      });

      setChats(fetchedChats);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 2. Subscribe to all registered users in real-time (instant update of online/offline status)
  useEffect(() => {
    if (!currentUser) return;

    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const fetchedUsers = snapshot.docs
        .map(doc => doc.data() as User)
        .filter(u => u.uid !== currentUser?.uid && u.uid !== SYSTEM_USER_ID);

      // Sort users: Online first, then alphabetically
      fetchedUsers.sort((a, b) => {
        const aOnline = a.isOnline || (a as any).online || false;
        const bOnline = b.isOnline || (b as any).online || false;
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
        return a.username.localeCompare(b.username, 'tr');
      });

      setAllUsers(fetchedUsers);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // 3. Proactively ensure the Talko Destek (System Chat) is created for this user
  useEffect(() => {
    if (!currentUser || !userProfile) return;

    const hasSystemChat = chats.some(c => c.participants.includes(SYSTEM_USER_ID));
    if (!hasSystemChat) {
      ensureSystemAccount().then(() => {
        sendWelcomeMessageIfNeeded(currentUser.uid, userProfile.username, userProfile.photoURL);
      }).catch(err => {
        console.error("Proactive system chat generation failed:", err);
      });
    }
  }, [chats, currentUser, userProfile]);

  const startChat = async (targetUser: User) => {
    if (!currentUser || !userProfile) return;

    const chatId = [currentUser.uid, targetUser.uid].sort().join('_');
    
    // Check if chat already exists in our local list
    const existingChat = chats.find(c => c.id === chatId);
    if (existingChat) {
      onChatSelect(existingChat);
      setSearchQuery('');
      return;
    }

    // Create new chat
    const now = Date.now();
    const newChat: Chat = {
      id: chatId,
      participants: [currentUser.uid, targetUser.uid],
      participantDetails: {
        [currentUser.uid]: { username: userProfile.username, photoURL: userProfile.photoURL },
        [targetUser.uid]: { username: targetUser.username, photoURL: targetUser.photoURL }
      },
      lastMessage: null,
      lastMessageTimestamp: null,
      updatedAt: now
    };

    await setDoc(doc(db, 'chats', chatId), newChat);
    onChatSelect(newChat);
    setSearchQuery('');
  };

  const handleLogout = async () => {
    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      try {
        await updateDoc(userRef, {
          isOnline: false,
          online: false,
          lastSeen: serverTimestamp()
        });
      } catch (err) {
        console.error("Error setting offline status on logout:", err);
      }
    }
    await auth.signOut();
  };

  // Instant local filtering
  const filteredChats = chats.filter(chat => {
    if (!chat || !chat.participants) return false;
    const otherUserId = chat.participants.find(id => id !== currentUser?.uid) || currentUser?.uid;
    const isSystem = otherUserId === SYSTEM_USER_ID;
    const userObj = otherUserId === currentUser?.uid ? userProfile : allUsers.find(u => u.uid === otherUserId);
    if (userObj?.isBanned) return false;
    const otherUser = isSystem 
      ? { username: 'Talko Destek' }
      : (userObj || chat.participantDetails?.[otherUserId || ''] || {});
    return otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredUsers = allUsers.filter(user => 
    !user.isBanned && (
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  const renderChatButton = (chat: Chat) => {
    if (!chat || !chat.participants) return null;
    const otherUserId = chat.participants.find(id => id !== currentUser?.uid) || currentUser?.uid;
    if (!otherUserId) return null;
    
    const isSystem = otherUserId === SYSTEM_USER_ID;
    
    // Get latest user object for status and profile photo/username sync
    const userObj = otherUserId === currentUser?.uid ? userProfile : allUsers.find(u => u.uid === otherUserId);
    const otherUser = isSystem 
      ? { username: 'Talko Destek', photoURL: TALKO_LOGO_DATA_URL }
      : (userObj || chat.participantDetails?.[otherUserId] || {});
    const isOnline = userObj ? (userObj.isOnline || (userObj as any).online) : false;
    
    let timeString = '';
    if (chat.lastMessageTimestamp) {
      try {
        timeString = formatDistanceToNow(chat.lastMessageTimestamp, { addSuffix: true, locale: tr });
      } catch (err) {
        console.error("Error formatting distance to now:", err);
      }
    }

    return (
      <button
        key={chat.id}
        onClick={() => onChatSelect(chat)}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left min-w-0",
          activeChatId === chat.id 
            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium" 
            : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
        )}
      >
        <div className="relative w-12 h-12 flex-shrink-0">
          <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800">
            {isSystem ? (
              <img src={TALKO_LOGO_DATA_URL} alt="Talko Destek" className="w-full h-full object-cover" />
            ) : otherUser?.photoURL ? (
              <img src={otherUser.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30">
                <UserIcon size={24} />
              </div>
            )}
          </div>
          {isOnline && !isSystem && (
            <span className="absolute bottom-0 right-0 block w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white dark:border-gray-900 shadow-sm z-10 animate-pulse" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{otherUser?.username}</p>
              {isSystem && <BadgeCheck size={16} className="text-blue-500 fill-blue-500/10 dark:text-blue-400 dark:fill-blue-400/10 flex-shrink-0" />}
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2 flex-shrink-0">
              {timeString.replace('yaklaşık ', '')}
            </span>
          </div>
          <p className={cn(
            "text-sm truncate w-full",
            activeChatId === chat.id ? "text-blue-600 dark:text-blue-400 font-medium" : "text-gray-500 dark:text-gray-400"
          )}>
            {chat.lastMessage || 'Sohbete başla'}
          </p>
        </div>
      </button>
    );
  };

  const renderUserButton = (user: User) => {
    return (
      <button
        key={user.uid}
        onClick={() => startChat(user)}
        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded-xl transition-all duration-200 text-left min-w-0"
      >
        <div className="relative w-10 h-10 flex-shrink-0">
          <div className="w-full h-full rounded-full overflow-hidden bg-gray-100 dark:bg-gray-850">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800">
                <UserIcon size={20} />
              </div>
            )}
          </div>
          {(user.isOnline || (user as any).online) && (
            <span className="absolute bottom-0 right-0 block w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900 shadow-sm z-10 animate-pulse" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate w-full">{user.username}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate w-full">{user.about || 'Merhaba!'}</p>
        </div>
        <MessageSquarePlus size={18} className="text-blue-500 dark:text-blue-400 flex-shrink-0 ml-2" />
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button onClick={onOpenProfile} className="relative group focus:outline-none flex-shrink-0">
            <div className="relative w-10 h-10">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800">
                    <UserIcon size={20} />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                <UserIcon size={16} className="text-white" />
              </div>
              <span className="absolute bottom-0 right-0 block w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-gray-900 shadow-sm z-20" />
            </div>
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-gray-900 dark:text-white leading-tight truncate">{userProfile?.username || 'Yükleniyor...'}</h2>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Çevrimiçi</p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          <button onClick={toggleTheme} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-50 dark:hover:bg-gray-800">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-400 dark:text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Kullanıcı ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-transparent rounded-xl text-sm focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none dark:text-white"
          />
        </div>
      </div>

      {/* Chat List & User List */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery.length > 0 ? (
          <div className="p-2 space-y-4">
            {/* Filtered Chats */}
            {filteredChats.length > 0 && (
              <div>
                <h3 className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Sohbetler</h3>
                <div className="space-y-1">
                  {filteredChats.map(chat => renderChatButton(chat))}
                </div>
              </div>
            )}

            {/* Filtered Users */}
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Kullanıcılar</h3>
              {filteredUsers.length > 0 ? (
                <div className="space-y-1">
                  {filteredUsers.map(user => renderUserButton(user))}
                </div>
              ) : (
                filteredChats.length === 0 && (
                  <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">Sonuç bulunamadı.</p>
                )
              )}
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-4">
            {/* Active Chats Section */}
            {chats.length > 0 && (
              <div>
                <h3 className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Sohbetler</h3>
                <div className="space-y-1">
                  {chats.map(chat => renderChatButton(chat))}
                </div>
              </div>
            )}

            {/* All Registered Users Section */}
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Kullanıcılar</h3>
              {allUsers.length > 0 ? (
                <div className="space-y-1">
                  {allUsers.map(user => renderUserButton(user))}
                </div>
              ) : (
                <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-4">Kayıtlı kullanıcı bulunmuyor.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
