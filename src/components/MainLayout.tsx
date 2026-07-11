import { useState } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import ProfileModal from './ProfileModal';
import { User, Chat } from '../types';

export default function MainLayout() {
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleChatSelect = (chat: Chat) => {
    setActiveChat(chat);
    // On mobile, close sidebar when a chat is selected
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden transition-colors">
      <div className={`md:w-80 lg:w-96 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 h-full ${isSidebarOpen ? 'block' : 'hidden md:block'}`}>
        <Sidebar 
          onChatSelect={handleChatSelect} 
          activeChatId={activeChat?.id} 
          onOpenProfile={() => setIsProfileOpen(true)}
        />
      </div>
      
      <div className={`flex-1 h-full ${!isSidebarOpen ? 'block' : 'hidden md:block'}`}>
        {activeChat ? (
          <ChatArea 
            chat={activeChat} 
            onBack={() => setIsSidebarOpen(true)}
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-500 transition-colors">
            <p>Sohbet başlatmak için bir konuşma seçin.</p>
          </div>
        )}
      </div>

      {isProfileOpen && (
        <ProfileModal onClose={() => setIsProfileOpen(false)} />
      )}
    </div>
  );
}
