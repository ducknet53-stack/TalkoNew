import { useState, useEffect, FormEvent } from 'react';
import { collection, doc, updateDoc, getDocs, onSnapshot, query, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { User, Chat, Message } from '../types';
import { Shield, Users, MessageSquare, ArrowLeft, Ban, Search, ShieldCheck, KeyRound, Clock, Eye, Trash2 } from 'lucide-react';
import { TALKO_LOGO_DATA_URL } from '../lib/assets';
import toast from 'react-hot-toast';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function AdminPanel() {
  const { currentUser } = useAuth();
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(() => {
    return localStorage.getItem('talko_admin_auth') === 'true';
  });
  
  const [activeTab, setActiveTab] = useState<'users' | 'chats'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [selectedChatMessages, setSelectedChatMessages] = useState<Message[]>([]);
  const [searchUserQuery, setSearchUserQuery] = useState('');
  const [searchChatQuery, setSearchChatQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Check and authorize
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (password === '9999') {
      setIsAuthorized(true);
      localStorage.setItem('talko_admin_auth', 'true');
      toast.success('Admin girişi başarılı!');
      
      // Update the user profile in Firestore to have isAdmin: true so Firebase Rules approve queries
      if (currentUser) {
        try {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            isAdmin: true
          });
        } catch (err) {
          console.error("Could not set isAdmin field in Firestore. Make sure rules are updated:", err);
        }
      }
    } else {
      toast.error('Hatalı şifre! Lütfen tekrar deneyin.');
    }
  };

  const handleLogout = () => {
    setIsAuthorized(false);
    localStorage.removeItem('talko_admin_auth');
    toast.success('Admin oturumu kapatıldı.');
  };

  // 1. Fetch all users for Admin
  useEffect(() => {
    if (!isAuthorized) return;

    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const fetchedUsers = snapshot.docs.map(doc => doc.data() as User);
      // Sort: Banned first, then online, then name
      fetchedUsers.sort((a, b) => {
        if (a.isBanned && !b.isBanned) return -1;
        if (!a.isBanned && b.isBanned) return 1;
        const aOnline = a.isOnline || (a as any).online || false;
        const bOnline = b.isOnline || (b as any).online || false;
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
        return a.username.localeCompare(b.username, 'tr');
      });
      setUsers(fetchedUsers);
    }, (error) => {
      console.error("Error fetching users for admin:", error);
    });

    return () => unsubscribe();
  }, [isAuthorized]);

  // 2. Fetch all chats for Admin
  useEffect(() => {
    if (!isAuthorized) return;

    const chatsRef = collection(db, 'chats');
    const unsubscribe = onSnapshot(chatsRef, (snapshot) => {
      const fetchedChats = snapshot.docs.map(doc => doc.data() as Chat);
      fetchedChats.sort((a, b) => b.updatedAt - a.updatedAt);
      setChats(fetchedChats);
    }, (error) => {
      console.error("Error fetching chats for admin:", error);
    });

    return () => unsubscribe();
  }, [isAuthorized]);

  // 3. Fetch messages of selected chat
  useEffect(() => {
    if (!isAuthorized || !selectedChat) {
      setSelectedChatMessages([]);
      return;
    }

    const messagesRef = collection(db, `chats/${selectedChat.id}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMsgs = snapshot.docs.map(doc => doc.data() as Message);
      setSelectedChatMessages(fetchedMsgs);
    }, (error) => {
      console.error("Error fetching messages for admin logs:", error);
    });

    return () => unsubscribe();
  }, [isAuthorized, selectedChat]);

  // Ban/Unban user action
  const handleToggleBan = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const willBan = !user.isBanned;
    
    try {
      await updateDoc(userRef, {
        isBanned: willBan,
        bannedAt: willBan ? Date.now() : null,
        isOnline: false,
        online: false
      });
      
      toast.success(willBan ? `${user.username} başarıyla engellendi.` : `${user.username} engeli kaldırıldı.`);
    } catch (err: any) {
      console.error("Error toggling ban status:", err);
      toast.error("İşlem başarısız oldu. Yetkilerinizi kontrol edin.");
    }
  };

  // Filter users lists
  const filteredUsers = users.filter(u => 
    u.username?.toLowerCase().includes(searchUserQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchUserQuery.toLowerCase())
  );

  const filteredChats = chats.filter(chat => {
    const participantsNames = chat.participants.map(pId => {
      if (pId === 'system_talko_destek') return 'Talko Destek';
      const userObj = users.find(u => u.uid === pId);
      return userObj ? userObj.username : pId;
    }).join(' ');
    
    return participantsNames.toLowerCase().includes(searchChatQuery.toLowerCase()) || 
           (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchChatQuery.toLowerCase()));
  });

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-slate-800/60 backdrop-blur-md rounded-3xl border border-slate-700/50 p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/5">
              <Shield size={32} className="animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Talko Yönetim Paneli</h1>
            <p className="text-sm text-slate-400">Güvenlik ve denetim paneline erişmek için şifreyi girin</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Giriş Şifresi</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <KeyRound size={18} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/50 border border-slate-700/60 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-center tracking-widest font-bold placeholder-slate-600 text-lg text-white"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <ShieldCheck size={18} />
              Giriş Yap
            </button>
          </form>

          <button
            onClick={() => { window.location.hash = ''; }}
            className="w-full mt-4 py-2.5 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700/30 rounded-xl font-medium transition-all flex items-center justify-center gap-2 text-sm"
          >
            <ArrowLeft size={16} />
            Sohbete Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-slate-900/80 border-b border-slate-800 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
            <Shield size={20} />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white flex items-center gap-2">
              Talko Yönetim Paneli
              <span className="text-[10px] bg-red-500/15 text-red-400 border border-red-500/30 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Yetkili
              </span>
            </h1>
            <p className="text-xs text-slate-400">Sistem denetimi, hesap engelleme ve güvenlik günlükleri</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { window.location.hash = ''; }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Sohbete Dön
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-950/40 hover:bg-red-950/60 border border-red-900/30 text-red-400 hover:text-red-300 rounded-xl text-sm font-semibold transition-all"
          >
            Güvenli Çıkış
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center">
            <Users size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Toplam Kayıtlı Kullanıcı</span>
            <h3 className="text-2xl font-bold text-white mt-1">{users.length}</h3>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-xl flex items-center justify-center">
            <Ban size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Engellenen Hesaplar</span>
            <h3 className="text-2xl font-bold text-red-400 mt-1">
              {users.filter(u => u.isBanned).length}
            </h3>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
            <MessageSquare size={24} />
          </div>
          <div>
            <span className="text-xs text-slate-400 uppercase font-semibold">Aktif Sohbet Odası</span>
            <h3 className="text-2xl font-bold text-emerald-400 mt-1">{chats.length}</h3>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <main className="flex-1 px-6 pb-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Action and Listings Block */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden lg:col-span-6 xl:col-span-5 flex flex-col h-[600px]">
          {/* Tab buttons */}
          <div className="flex border-b border-slate-800 bg-slate-900/60">
            <button
              onClick={() => setActiveTab('users')}
              className={cn(
                "flex-1 py-4 px-5 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2",
                activeTab === 'users' 
                  ? "border-blue-500 text-blue-400 bg-slate-950/20" 
                  : "border-transparent text-slate-400 hover:text-white"
              )}
            >
              <Users size={16} />
              Kullanıcı Listesi
            </button>
            <button
              onClick={() => setActiveTab('chats')}
              className={cn(
                "flex-1 py-4 px-5 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2",
                activeTab === 'chats' 
                  ? "border-blue-500 text-blue-400 bg-slate-950/20" 
                  : "border-transparent text-slate-400 hover:text-white"
              )}
            >
              <MessageSquare size={16} />
              Sohbet Günlükleri
            </button>
          </div>

          {/* Search Inputs */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-950/20">
            {activeTab === 'users' ? (
              <div className="relative">
                <Search size={16} className="absolute inset-y-0 left-3 my-auto text-slate-500" />
                <input
                  type="text"
                  placeholder="Kullanıcı adı veya e-posta ile ara..."
                  value={searchUserQuery}
                  onChange={(e) => setSearchUserQuery(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-0 transition-all text-slate-200"
                />
              </div>
            ) : (
              <div className="relative">
                <Search size={16} className="absolute inset-y-0 left-3 my-auto text-slate-500" />
                <input
                  type="text"
                  placeholder="Katılımcı isimlerine göre sohbet ara..."
                  value={searchChatQuery}
                  onChange={(e) => setSearchChatQuery(e.target.value)}
                  className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:border-blue-500 focus:ring-0 transition-all text-slate-200"
                />
              </div>
            )}
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
            {activeTab === 'users' ? (
              filteredUsers.length > 0 ? (
                filteredUsers.map(user => {
                  const isOnline = user.isOnline || (user as any).online || false;
                  return (
                    <div key={user.uid} className="p-4 flex items-center justify-between hover:bg-slate-900/20 transition-all">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <div className="w-full h-full rounded-full overflow-hidden bg-slate-800 border border-slate-700/60">
                            {user.photoURL ? (
                              <img src={user.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-800">
                                <Users size={16} />
                              </div>
                            )}
                          </div>
                          {isOnline && (
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-100 truncate text-[14px]">
                            {user.username}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{user.email || 'E-posta yok'}</p>
                          {user.isBanned && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 text-[9px] font-extrabold bg-red-950/80 text-red-400 border border-red-900/50 rounded uppercase tracking-wider">
                              Yasaklı
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleBan(user)}
                          className={cn(
                            "p-2 rounded-lg border transition-all text-xs font-semibold flex items-center gap-1.5",
                            user.isBanned 
                              ? "bg-emerald-950/30 border-emerald-900/40 text-emerald-400 hover:bg-emerald-950/60" 
                              : "bg-red-950/30 border-red-900/40 text-red-400 hover:bg-red-950/60"
                          )}
                          title={user.isBanned ? "Engeli Kaldır" : "Engelle"}
                        >
                          <Ban size={14} />
                          {user.isBanned ? 'Aç' : 'Banla'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm">Kullanıcı bulunamadı.</div>
              )
            ) : (
              filteredChats.length > 0 ? (
                filteredChats.map(chat => {
                  const pNames = chat.participants.map(pId => {
                    if (pId === 'system_talko_destek') return 'Talko Destek';
                    const userObj = users.find(u => u.uid === pId);
                    return userObj ? userObj.username : pId;
                  }).join(' ↔ ');

                  const isSelected = selectedChat?.id === chat.id;

                  return (
                    <button
                      key={chat.id}
                      onClick={() => setSelectedChat(chat)}
                      className={cn(
                        "w-full p-4 text-left flex items-center justify-between hover:bg-slate-900/20 transition-all border-l-2",
                        isSelected ? "border-blue-500 bg-blue-950/15" : "border-transparent"
                      )}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <p className="font-semibold text-slate-200 text-sm truncate">{pNames}</p>
                        <p className="text-xs text-slate-500 truncate mt-1">
                          {chat.lastMessage || 'Mesaj yok'}
                        </p>
                        <span className="inline-block mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                          <Clock size={10} />
                          Güncelleme: {format(chat.updatedAt, 'dd MMM HH:mm', { locale: tr })}
                        </span>
                      </div>
                      <Eye size={16} className={cn("text-slate-500 flex-shrink-0", isSelected && "text-blue-400")} />
                    </button>
                  );
                })
              ) : (
                <div className="p-8 text-center text-slate-500 text-sm">Sohbet bulunamadı.</div>
              )
            )}
          </div>
        </div>

        {/* Right Log Display / Message Inspection Box */}
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden lg:col-span-6 xl:col-span-7 flex flex-col h-[600px]">
          {selectedChat ? (
            <>
              {/* Inspection Header */}
              <div className="px-5 py-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {selectedChat.participants.map(pId => {
                      if (pId === 'system_talko_destek') return 'Talko Destek';
                      const userObj = users.find(u => u.uid === pId);
                      return userObj ? userObj.username : pId;
                    }).join(' ↔ ')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Sohbet Odası Logları (Gözlem Modu)</p>
                </div>
                <div className="text-xs bg-slate-800 px-2.5 py-1 rounded-full text-slate-400 border border-slate-700/60 font-mono">
                  ID: {selectedChat.id.substring(0, 12)}...
                </div>
              </div>

              {/* Inspection Message History */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-950/20">
                {selectedChatMessages.length > 0 ? (
                  selectedChatMessages.map((msg) => {
                    const sender = users.find(u => u.uid === msg.senderId);
                    const senderName = msg.senderId === 'system_talko_destek' ? 'Talko Destek' : (sender ? sender.username : 'Bilinmeyen Kullanıcı');
                    const isSystem = msg.senderId === 'system_talko_destek';

                    return (
                      <div key={msg.id} className="p-3 bg-slate-900/60 border border-slate-800/60 rounded-xl max-w-full flex gap-3">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-800 flex-shrink-0">
                          {isSystem ? (
                            <img src={TALKO_LOGO_DATA_URL} alt="" className="w-full h-full object-cover" />
                          ) : sender?.photoURL ? (
                            <img src={sender.photoURL} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                              {senderName.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={cn("font-bold text-xs text-slate-200", isSystem && "text-blue-400")}>
                              {senderName}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {format(msg.timestamp, 'dd/MM/yyyy HH:mm:ss')}
                            </span>
                          </div>
                          {msg.imageUrl && (
                            <img src={msg.imageUrl} alt="Shared" className="max-h-40 rounded-lg mb-2 object-cover border border-slate-800" />
                          )}
                          {msg.text && (
                            <p className="text-sm text-slate-300 whitespace-pre-wrap break-words leading-relaxed">
                              {msg.text}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    Bu sohbette henüz mesaj bulunmuyor.
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <div className="w-16 h-16 bg-slate-900 border border-slate-800 text-slate-600 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare size={28} />
              </div>
              <h3 className="font-semibold text-slate-400 mb-1">Sohbet Seçilmedi</h3>
              <p className="text-xs max-w-xs leading-relaxed text-slate-500">
                Sol listeden gözlemlemek istediğiniz sohbet odasını seçerek tüm mesaj geçmişini inceleyebilirsiniz.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
