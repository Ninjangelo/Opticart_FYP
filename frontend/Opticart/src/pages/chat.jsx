import { useState } from 'react';
import './css/chat.css';

/* COMPONENT IMPORTS */
import Sidebar from '../components/sidebar.jsx';
import ChatWindow from '../components/chat_window.jsx';

/* PAGE IMPORTS */


function Chat() {
  const [activeView, setActiveView] = useState('chat');

  return (
    <>
      <div className='flex flex-row h-screen w-full overflow-hidden bg-gray-50'>
        <Sidebar activeView={activeView} setActiveView={setActiveView} />
        
        {activeView === 'chat' && <ChatWindow />}
        
        {/* {activeView === 'saved_meals' && <SavedMealsWindow />} */}
      </div>
    </>
  )
}

export default Chat
