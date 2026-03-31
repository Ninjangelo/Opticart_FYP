import { Link } from "react-router-dom";

function Sidebar({ activeView, setActiveView}) {

    const getButtonClass = (viewName) => {
        const baseClass = "group flex flex-row items-center gap-3 p-3 rounded-xl w-69 font-bold transition-all duration-200";
        const activeClass = "bg-temporary-turqoise text-white";
        const inactiveClass = "bg-transparent text-gray-300 hover:bg-sky-800 hover:text-white";
        
        return `${baseClass} ${activeView === viewName ? activeClass : inactiveClass}`;
    };

    return (
        <div className="w-105 h-full bg-sky-950 text-white flex flex-col border-r border-gray-700">
            <div className="p-4 border-b border-gray-700">
                <Link to="/" className="flex flex-row items-center gap-3">
                    <img className="w-10" src="../opticart_logo(inverted).svg" alt="opticart_logo"/>
                    <h2 className="text-xl font-bold font-montserrat">Opticart</h2>
                </Link>
            </div>
            
            <div className="flex flex-col p-4 overflow-y-auto space-y-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-temporary-turqoise [&::-webkit-scrollbar-thumb]:rounded-full">
                {/* CHAT BUTTON */}
                <button 
                    onClick={() => setActiveView('chat')}
                    className={getButtonClass('chat')}
                >
                    <div className="flex justify-center p-2.5 bg-white rounded-full group-hover:bg-sky-200">
                        <img className="w-9" src="../chat.svg" alt="chat"/>
                    </div>
                    <div className="transition-colors duration-200">Chat</div>
                </button>

                {/* SAVED MEALS BUTTON */}
                <button 
                    onClick={() => setActiveView('saved_meals')}
                    className={getButtonClass('saved_meals')}
                >
                    <div className="flex justify-center p-1 bg-white rounded-full group-hover:bg-sky-200">
                        <img className="w-12" src="../hot-meal.svg" alt="meals"/>
                    </div>
                    <div className="transition-colors duration-200">Saved Meals</div>
                </button>

                <button 
                    onClick={() => setActiveView('saved_lists')}
                    className={getButtonClass('saved_lists')}
                >
                    <div className="flex justify-center p-1 bg-white rounded-full group-hover:bg-sky-200">
                        <img className="w-12" src="../trolley(blue).svg" alt="meals"/>
                    </div>
                    <div className="transition-colors duration-200">Saved Lists</div>
                </button>

                <button 
                    onClick={() => setActiveView('recommendations')}
                    className={getButtonClass('recommendations')}
                >
                    <div className="flex justify-center p-2 bg-white rounded-full group-hover:bg-sky-200">
                        <img className="w-10" src="../idea.svg" alt="meals"/>
                    </div>
                    <div className="transition-colors duration-200">Recommendations</div>
                </button>

                <button 
                    onClick={() => setActiveView('meal_calendar')}
                    className={getButtonClass('meal_calendar')}
                >
                    <div className="flex justify-center p-2.5 bg-white rounded-full group-hover:bg-sky-200">
                        <img className="w-9" src="../calendar.svg" alt="meals"/>
                    </div>
                    <div className="transition-colors duration-200">Meal Calendar</div>
                </button>

                <button 
                    onClick={() => setActiveView('browse_meals')}
                    className={getButtonClass('browse_meals')}
                >
                    <div className="flex justify-center p-1 bg-white rounded-full group-hover:bg-sky-200">
                        <img className="w-12" src="../food-menu.svg" alt="meals"/>
                    </div>
                    <div className="transition-colors duration-200">Browse Meals</div>
                </button>

                {/* You will repeat this pattern for the rest of your buttons! */}
                {/* e.g., onClick={() => setActiveView('saved_lists')} */}

                <h3 className="text-sm text-gray-400 font-bold mb-3 uppercase tracking-wider border-b border-b-gray-700 pb-2">Chats</h3>
                <div className="flex flex-col">
                    <p className="text-sm text-gray-300 italic break-all">No previous chats yet.</p>
                </div>
            </div>
            
            <div className="p-4 border-t border-gray-700">
                <button className="w-full bg-temporary-turqoise text-white py-2 rounded-lg font-bold hover:opacity-90 transition-all">
                + New Recipe
                </button>
            </div>
        </div>
    )
}

export default Sidebar