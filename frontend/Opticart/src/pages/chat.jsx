import { useState } from 'react';
import './css/chat.css';

/* COMPONENT IMPORTS */
import Sidebar from '../components/sidebar.jsx';
import ChatWindow from '../components/chat_window.jsx';

/* PAGE IMPORTS */


function Chat() {
  const [activeView, setActiveView] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <>
      <div className='flex flex-row h-screen w-full overflow-hidden bg-gray-50 relative'>
        
        <Sidebar 
          activeView={activeView} 
          setActiveView={setActiveView} 
          isOpen={isSidebarOpen} 
        />
        
        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 h-full relative flex flex-col overflow-hidden">
          
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute top-5 left-5 z-50 p-2.5 bg-gray-800 border border-gray-700 rounded-xl shadow-lg text-white hover:bg-gray-700 hover:text-temporary-turqoise transition-all focus:outline-none group"
            title="Toggle Sidebar"
          >
            <svg className="w-6 h-6 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* ACTIVE VIEWS */}
          {activeView === 'chat' && <ChatWindow />}
          {/* {activeView === 'saved_meals' && <SavedMealsWindow />} */}

        </div>
      </div>
    </>
  )
}

export default Chat
