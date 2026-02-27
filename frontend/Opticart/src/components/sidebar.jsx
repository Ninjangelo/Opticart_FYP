import { Link } from "react-router-dom";

function Sidebar() {

    return (
        <div className="w-105 h-full dark:bg-sky-950 text-white flex flex-col border-r border-gray-700">
            <div className="p-4 border-b border-gray-700">
                <Link to="/" className="flex flex-row items-center gap-3">
                    <img className="w-10" src="../opticart_logo(inverted).svg" alt="opticart_logo"/>
                    <h2 className="text-xl font-bold font-montserrat">Opticart</h2>
                </Link>
            </div>
            
            <div className="flex flex-col p-4 overflow-y-auto space-y-4 ">
                <button className="flex flex-row items-center bg-temporary-turqoise gap-3 p-3 rounded-xl w-69 font-bold">
                    <div className="flex justify-center p-1 bg-white rounded-full">
                        <img className="w-12" src="../hot-meal.svg" alt="meals"/>
                    </div>
                    <div>Saved Meals</div>
                </button>
                <button className="flex flex-row items-center bg-temporary-turqoise gap-3 p-3 rounded-xl w-69 font-bold">
                    <div className="flex justify-center p-2 bg-white rounded-full">
                        <img className="w-10" src="../trolley(blue).svg" alt="lists"/>
                    </div>
                    <div>Saved Lists</div>
                </button>
                <button className="flex flex-row items-center bg-temporary-turqoise gap-3 p-3 rounded-xl w-69 font-bold">
                    <div className="flex justify-center p-2 bg-white rounded-full">
                        <img className="w-10" src="../idea.svg" alt="recommendations"/>
                    </div>
                    <div>Recommendations</div>
                </button>
                <button className="flex flex-row items-center bg-temporary-turqoise gap-3 p-3 rounded-xl w-69 font-bold">
                    <div className="flex justify-center p-3 bg-white rounded-full">
                        <img className="w-8" src="../calendar.svg" alt="meal_calendar"/>
                    </div>
                    <div>Meal Calendar</div>
                </button>
                <button className="flex flex-row items-center bg-temporary-turqoise gap-3 p-3 rounded-xl w-69 font-bold">
                    <div className="flex justify-center p-1 bg-white rounded-full">
                        <img className="w-12" src="../food-menu.svg" alt="browse meals"/>
                    </div>
                    <div>Browse Meals</div>
                </button>
                <h3 className="text-sm text-gray-400 font-bold mb-3 uppercase tracking-wider border-b border-b-gray-700 pb-2">Chats</h3>
                <p className="text-sm text-gray-300 italic">No previous chats yet.</p>
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