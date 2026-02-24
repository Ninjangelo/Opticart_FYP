import { Link } from "react-router-dom";

function Sidebar() {

    return (
        <div className="w-64 h-screen bg-gray-900 text-white flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-gray-700">
                <h2 className="text-xl font-bold font-montserrat">Opticart</h2>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto">
                <h3 className="text-sm text-gray-400 font-bold mb-3 uppercase tracking-wider">Chat History</h3>
                {/* We will populate this later! */}
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