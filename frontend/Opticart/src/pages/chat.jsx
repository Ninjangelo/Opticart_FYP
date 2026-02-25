import { useState, useRef, useEffect } from 'react';
import './css/chat.css';

/* COMPONENT IMPORTS */
import Sidebar from '../components/sidebar.jsx';
import ChatWindow from '../components/chat_window.jsx';

/* PAGE IMPORTS */


function Chat() {

  return (
    <>
      <div className='flex flex-row h-screen w-full overflow-hidden bg-gray-50'>
        <Sidebar />
        <ChatWindow />
      </div>
    </>
  )
}

export default Chat
