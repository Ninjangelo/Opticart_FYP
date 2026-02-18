import { useState } from 'react'
import { Routes, Route } from 'react-router-dom';
import './App.css'

/* COMPONENT IMPORTS */
import HomeNavbar from './components/home_navbar.jsx';
import HeroButtons from './components/hero_buttons.jsx';
import HomeFooter from './components/home_footer.jsx';

/* PAGE IMPORTS */
import Chat from "./pages/chat.jsx";

function Home() {
  return (
    <>
      <div className="flex flex-col px-30 pt-22 pb-39 text-center items-center justify-center space-y-8">
        <img className="w-45" src="/temporary_logo.svg" alt="opticart_logo"/>
        <h1 className="text-7xl text-temporary-turqoise font-montserrat">Opticart</h1>
        <p className="text-2xl text-temporary-turqoise2 font-manrope">Budget-friendly meal planning made easy</p>
        <HeroButtons />
      </div>
      <HomeFooter />
    </>
  );
}

function App() {

  return (
    <>
      <HomeNavbar />
      <Routes>
        <Route path="/" exact element={<Home />} />
        <Route path="/chat" exact element={<Chat />} />
      </Routes>
    </>
  )
}

export default App
