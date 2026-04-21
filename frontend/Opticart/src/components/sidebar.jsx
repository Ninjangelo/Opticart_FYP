import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabaseClient";

function Sidebar({ activeView, setActiveView, isOpen}) {
    const { user } = useAuth();
    const navigate = useNavigate();

    const getButtonClass = (viewName) => {
        const baseClass = "group flex flex-row items-center gap-3 p-3 rounded-xl w-69 font-bold transition-all duration-200";
        const activeClass = "bg-temporary-turqoise text-white";
        const inactiveClass = "bg-transparent text-gray-300 hover:bg-sky-800 hover:text-white";
        
        return `${baseClass} ${activeView === viewName ? activeClass : inactiveClass}`;
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate("/");
    };

    return (
        <div className={`shrink-0 h-full bg-sky-950 flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${
            isOpen ? 'w-[330px] border-r border-gray-700' : 'w-0 border-none'
        }`}>
            
            {/* INNER CONTAINER */}
            <div className="w-[330px] h-full flex flex-col text-white">
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex flex-row items-center gap-3">
                        <img className="w-10" src="../opticart_logo(inverted).svg" alt="opticart_logo"/>
                        <h2 className="text-xl font-bold font-montserrat whitespace-nowrap">Opticart</h2>
                    </div>
                    <Link to="/" className="bg-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">
                        🏠︎ Return home
                    </Link>
                </div>

                <div className="flex flex-col pt-2 pb-4 items-center">
                    {/* CHAT BUTTON */}
                    <button onClick={() => setActiveView('chat')} className={getButtonClass('chat')}>
                        <div className="flex justify-center p-2.5 bg-white rounded-full group-hover:bg-sky-200 shrink-0">
                            <img className="w-9" src="../chat.svg" alt="chat"/>
                        </div>
                        <div className="transition-colors duration-200 whitespace-nowrap">Chat</div>
                    </button>

                    {/* SAVED MEALS BUTTON */}
                    <button onClick={() => setActiveView('saved_meals')} className={getButtonClass('saved_meals')}>
                        <div className="flex justify-center p-1 bg-white rounded-full group-hover:bg-sky-200 shrink-0">
                            <img className="w-12" src="../hot-meal.svg" alt="meals"/>
                        </div>
                        <div className="transition-colors duration-200 whitespace-nowrap">Saved Meals</div>
                    </button>

                    <button onClick={() => setActiveView('saved_lists')} className={getButtonClass('saved_lists')}>
                        <div className="flex justify-center p-1 bg-white rounded-full group-hover:bg-sky-200 shrink-0">
                            <img className="w-12" src="../trolley(blue).svg" alt="meals"/>
                        </div>
                        <div className="transition-colors duration-200 whitespace-nowrap">Saved Lists</div>
                    </button>

                    <button onClick={() => setActiveView('recommendations')} className={getButtonClass('recommendations')}>
                        <div className="flex justify-center p-2 bg-white rounded-full group-hover:bg-sky-200 shrink-0">
                            <img className="w-10" src="../idea.svg" alt="meals"/>
                        </div>
                        <div className="transition-colors duration-200 whitespace-nowrap">Recommendations</div>
                    </button>

                    <button onClick={() => setActiveView('meal_calendar')} className={getButtonClass('meal_calendar')}>
                        <div className="flex justify-center p-2.5 bg-white rounded-full group-hover:bg-sky-200 shrink-0">
                            <img className="w-9" src="../calendar.svg" alt="meals"/>
                        </div>
                        <div className="transition-colors duration-200 whitespace-nowrap">Meal Calendar</div>
                    </button>

                    <button onClick={() => setActiveView('browse_meals')} className={getButtonClass('browse_meals')}>
                        <div className="flex justify-center p-1 bg-white rounded-full group-hover:bg-sky-200 shrink-0">
                            <img className="w-12" src="../food-menu.svg" alt="meals"/>
                        </div>
                        <div className="transition-colors duration-200 whitespace-nowrap">Browse Meals</div>
                    </button>
                </div>
                
                
                <div className="p-6 border-t border-gray-700 space-y-3">
                    {/*<button className="w-full bg-temporary-turqoise text-white py-2 rounded-lg font-bold hover:opacity-90 transition-all whitespace-nowrap">
                    + New Recipe
                    </button>*/}

                    {/* Display the user's email */}
                    {user && (
                        <div className="text-sm font-manrope text-gray-400 break-all">
                            Logged in as: <br/>
                            <span className="text-white font-bold text-base">{user.email}</span>
                        </div>
                    )}
                    
                    <button 
                        onClick={handleLogout}
                        className="w-full bg-gray-600 py-3 rounded-xl hover:bg-temporary-turqoise hover:text-white transition-all whitespace-nowrap cursor-pointer"
                    >
                        Log out
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Sidebar