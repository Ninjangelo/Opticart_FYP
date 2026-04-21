import { useState } from 'react';
import './css/chat.css';

import Sidebar from '../components/sidebar.jsx';
import ChatWindow from '../components/chat_window.jsx';
import BrowseMeals from '../components/browse_meals.jsx';
import SavedMeals from '../components/saved_meals.jsx';

function Chat() {
  const [activeView, setActiveView] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // State to hold the recipe being sent from Browse Meals
  const [recipeToCompare, setRecipeToCompare] = useState(null);

  // The function that switches the view AND saves the recipe
  const handleTriggerPriceComparison = (recipe) => {
    setRecipeToCompare(recipe);
    setActiveView('chat'); 
  };

  return (
    <>
      <div className='flex flex-row h-screen w-full overflow-hidden bg-gray-50 relative'>
        <Sidebar activeView={activeView} setActiveView={setActiveView} isOpen={isSidebarOpen} />
        
        <div className="flex-1 h-full relative flex flex-col overflow-hidden">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute top-5 left-5 z-50 p-2.5 bg-gray-800 border border-gray-700 rounded-xl shadow-lg text-white hover:bg-gray-700 hover:text-temporary-turqoise transition-all group"
          >
            <svg className="w-6 h-6 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* ACTIVE VIEWS */}
          <div className={activeView === 'chat' ? 'flex-1 h-full relative flex flex-col overflow-hidden' : 'hidden'}>
             <ChatWindow 
               recipeToCompare={recipeToCompare} 
               clearRecipeToCompare={() => setRecipeToCompare(null)} 
             />
          </div>

          <div className={activeView === 'browse_meals' ? 'flex-1 h-full relative flex flex-col overflow-hidden' : 'hidden'}>
             <BrowseMeals onComparePrices={handleTriggerPriceComparison} />
          </div>

          <div className={activeView === 'saved_meals' ? 'flex-1 h-full relative flex flex-col overflow-hidden' : 'hidden'}>
             <SavedMeals onComparePrices={handleTriggerPriceComparison} />
          </div>
        </div>
      </div>
    </>
  )
}

export default Chat;