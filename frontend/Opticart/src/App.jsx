import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './App.css'

/* COMPONENT IMPORTS */
import HomeNavbar from './components/home_navbar.jsx';
import HeroButtons from './components/hero_buttons.jsx';
import HomeFooter from './components/home_footer.jsx';
import AuthForm from './components/AuthForm.jsx';

/* PAGE IMPORTS */
import Chat from "./pages/chat.jsx";

// if no user logged in, simply re-directs it to home
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="h-screen w-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  
  return children;
};

function Home() {
  const { user } = useAuth();

  return (
    <>
      <HomeNavbar />
      <div className="flex flex-col px-30 pt-22 pb-39 text-center items-center justify-center space-y-8 bg-gray-900 min-h-[80vh]">
        <img className="w-45" src="/temporary_logo.svg" alt="opticart_logo"/>
        <h1 className="text-7xl text-white font-montserrat">OptiCart</h1>
        <p className="text-3xl text-white font-manrope">Budget-friendly meal planning made easy</p>
        
        {/* Conditional Rendering: Show Dashboard button if logged in, else show AuthForm */}
        {user ? (
          <div className="flex flex-col items-center space-y-4 animate-fade-in">
            <p className="text-temporary-turqoise font-bold">Hello, {user.email}!</p>
            <HeroButtons />
          </div>
        ) : (
          <div className="mt-8 bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md">
            <AuthForm />
          </div>
        )}
      </div>
      <HomeFooter />
    </>
  );
}

function App() {

  return (
    <>
      <Routes>
        <Route path="/" exact element={<Home />} />
        {/* Wrap the Chat component in our bouncer */}
        <Route 
          path="/chat" 
          exact 
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </>
  )
}

export default App
