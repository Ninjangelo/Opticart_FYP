import { useState, useRef, useEffect } from 'react';
import HomeNavbar from '../components/home_navbar.jsx';
import './css/chat.css';

/* COMPONENT IMPORTS */
import Sidebar from '../components/sidebar.jsx';
import ChatWindow from '../components/chat_window.jsx';

/* PAGE IMPORTS */


function Chat() {

  return (
    <>
      <div className='flex flex-row'>
        <Sidebar />
        <ChatWindow />
      </div>
    </>
  )
}

export default Chat
