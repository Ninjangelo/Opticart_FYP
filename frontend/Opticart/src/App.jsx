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
      <h1 className="text-2xl font-bold underline text-blue-600 text-center p-78">TailwindCSS</h1>
    </>
  )
}

export default App
