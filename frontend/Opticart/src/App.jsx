import { useState } from 'react'
import './App.css'

/* COMPONENT IMPORTS */
import HomeNavbar from './components/home_navbar.jsx';

function App() {

  /*function Home() {
    return (

    );
  }*/

  return (
    <>
      <HomeNavbar />
      <div className="flex flex-col px-30 pt-25 pb-54 text-center items-center justify-center space-y-4">
        <img className="w-45" src="/temporary_logo.svg" alt="opticart_logo"/>
        <h1 className="text-8xl text-temporary-turqoise font-montserrat">Opticart</h1>
        <p className="text-2xl text-temporary-turqoise2 font-manrope">Budget-friendly Meal Planning made easy and effective</p>
      </div>
    </>
  )
}

export default App
