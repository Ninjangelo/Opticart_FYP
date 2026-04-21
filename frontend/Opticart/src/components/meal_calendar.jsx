import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TIMES = ['Breakfast', 'Lunch', 'Dinner'];

function MealCalendar({ onComparePrices }) {
    const { user } = useAuth();
    
    // Core State
    const [plannerData, setPlannerData] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // View Management
    const [activeSlot, setActiveSlot] = useState(null); // { day, time }
    const [savedMeals, setSavedMeals] = useState([]);
    const [selectedRecipeModal, setSelectedRecipeModal] = useState(null);

    // 1. Fetch Planner Data on Load
    useEffect(() => {
        fetchPlanner();
    }, [user]);

    const fetchPlanner = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('meal_planner')
            .select('*')
            .eq('user_id', user.id);

        if (!error && data) {
            setPlannerData(data);
        }
        setLoading(false);
    };

    // 2. Fetch Saved Meals for the "Add Meal" View
    const openAddMealView = async (day, time) => {
        setActiveSlot({ day, time });
        
        // Fetch the user's saved meals using a join
        const { data, error } = await supabase
            .from('saved_meals')
            .select(`
                recipe_id,
                recipes (*)
            `)
            .eq('user_id', user.id);

        if (!error && data) {
            // Extract just the recipe objects from the join
            setSavedMeals(data.map(d => d.recipes));
        }
    };

    // 3. Assign a meal to the planner slot
    const handleAssignMeal = async (recipe) => {
        if (!activeSlot) return;

        const newEntry = {
            user_id: user.id,
            day_of_week: activeSlot.day,
            meal_time: activeSlot.time,
            recipe_data: recipe
        };

        // UPSERT: Insert or Update if the slot is already taken
        const { error } = await supabase
            .from('meal_planner')
            .upsert(newEntry, { onConflict: 'user_id, day_of_week, meal_time' });

        if (!error) {
            await fetchPlanner(); // Refresh board
            setActiveSlot(null);  // Close selection view
        } else {
            alert("Failed to assign meal to calendar.");
        }
    };

    // 4. Remove a meal from the planner
    const handleRemoveMeal = async (id) => {
        const { error } = await supabase.from('meal_planner').delete().eq('id', id);
        if (!error) {
            setPlannerData(prev => prev.filter(item => item.id !== id));
        }
    };

    // Helper: Find a specific meal in the planner state
    const getMealForSlot = (day, time) => {
        return plannerData.find(p => p.day_of_week === day && p.meal_time === time);
    };

    // --- RENDER: ADD MEAL SELECTION VIEW ---
    if (activeSlot) {
        return (
            <div className="flex-1 bg-gray-900 overflow-y-auto p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <button 
                        onClick={() => setActiveSlot(null)}
                        className="mb-6 text-temporary-turqoise font-bold hover:text-white transition-colors flex items-center gap-2"
                    >
                        ← Back to Corkboard
                    </button>
                    
                    <h1 className="text-4xl font-bold font-montserrat text-white mb-2">
                        Select a <span className="text-temporary-turqoise">Saved Meal</span>
                    </h1>
                    <p className="text-gray-400 font-manrope mb-8 text-lg">
                        Assigning to: <span className="text-white font-bold">{activeSlot.day} - {activeSlot.time}</span>
                    </p>

                    {savedMeals.length === 0 ? (
                        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 text-center">
                            <p className="text-gray-400">You don't have any saved meals yet! Go to the chat to find and save some recipes.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {savedMeals.map((recipe, idx) => (
                                <div key={idx} className="bg-gray-800 rounded-xl overflow-hidden flex flex-col border border-gray-700 hover:border-temporary-turqoise cursor-pointer transition-all hover:-translate-y-1 shadow-lg"
                                     onClick={() => handleAssignMeal(recipe)}>
                                    <img src={recipe.image_url} alt={recipe.dish_name} className="w-full h-32 object-cover" />
                                    <div className="p-4 flex flex-col flex-1">
                                        <h4 className="font-bold text-white leading-tight mb-2">{recipe.dish_name}</h4>
                                        <div className="mt-auto pt-3 border-t border-gray-700 text-sm text-temporary-turqoise font-bold text-center">
                                            + Assign to {activeSlot.time}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- RENDER: MAIN CORKBOARD VIEW ---
    return (
        <div className="flex-1 overflow-hidden flex flex-col bg-gray-900">
            {/* Header */}
            <div className="p-8 pl-20 shrink-0 border-b border-gray-800">
                <h1 className="text-4xl md:text-5xl font-bold font-montserrat text-white tracking-wide mb-2">
                    Weekly <span className="text-temporary-turqoise">Meal Planner</span>
                </h1>
                <p className="text-gray-400 font-manrope text-lg">
                    Plan your week. Click an empty slot to add a meal.
                </p>
            </div>

            {/* Horizontal Scrolling Corkboard Area */}
            <div className="flex-1 overflow-x-auto overflow-y-auto p-6 [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:bg-gray-900 [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full">
                {loading ? (
                    <div className="h-full flex items-center justify-center text-white font-bold animate-pulse">Loading Planner...</div>
                ) : (
                    <div className="flex gap-6 min-w-max pb-8">
                        {DAYS.map(day => (
                            <div key={day} className="w-[320px] bg-gray-800/50 rounded-2xl border border-gray-700 p-4 shrink-0 flex flex-col shadow-2xl">
                                
                                {/* Day Header */}
                                <div className="text-center pb-4 mb-4 border-b border-gray-700">
                                    <h2 className="text-2xl font-bold text-white font-montserrat uppercase tracking-widest">{day}</h2>
                                </div>

                                {/* 3 Meal Slots */}
                                <div className="space-y-4 flex-1">
                                    {MEAL_TIMES.map(time => {
                                        const plannedMeal = getMealForSlot(day, time);
                                        
                                        return (
                                            <div key={`${day}-${time}`} className="flex flex-col">
                                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">{time}</h3>
                                                
                                                {plannedMeal ? (
                                                    /* FILLED SLOT: Traditional Meal Card */
                                                    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-600 shadow-md flex flex-col">
                                                        {plannedMeal.recipe_data.image_url && (
                                                            <div className="relative h-28 w-full">
                                                                <img src={plannedMeal.recipe_data.image_url} alt="meal" className="w-full h-full object-cover" />
                                                                <button 
                                                                    onClick={() => handleRemoveMeal(plannedMeal.id)}
                                                                    className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg transition-colors"
                                                                    title="Remove from planner"
                                                                >
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        )}
                                                        <div className="p-4 flex flex-col">
                                                            <h4 className="font-bold text-white text-lg leading-tight mb-3 truncate" title={plannedMeal.recipe_data.dish_name}>
                                                                {plannedMeal.recipe_data.dish_name}
                                                            </h4>
                                                            <div className="grid grid-cols-2 gap-2 mt-auto">
                                                                <button 
                                                                    onClick={() => setSelectedRecipeModal(plannedMeal.recipe_data)}
                                                                    className="bg-gray-700 text-white py-2 rounded-lg font-bold hover:bg-gray-600 transition-all text-xs"
                                                                >
                                                                    Details
                                                                </button>
                                                                <button 
                                                                    onClick={() => onComparePrices(plannedMeal.recipe_data)}
                                                                    className="bg-transparent border border-temporary-turqoise text-temporary-turqoise py-2 rounded-lg font-bold hover:bg-temporary-turqoise hover:text-white transition-all text-xs"
                                                                >
                                                                    Prices
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* EMPTY SLOT */
                                                    <button 
                                                        onClick={() => openAddMealView(day, time)}
                                                        className="h-28 rounded-xl border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-500 hover:text-temporary-turqoise hover:border-temporary-turqoise hover:bg-sky-900/10 transition-all group"
                                                    >
                                                        <span className="text-2xl font-light mb-1 group-hover:scale-125 transition-transform">+</span>
                                                        <span className="font-bold text-sm tracking-wide">Add {time}</span>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* --- REUSED MEAL DETAILS MODAL --- */}
            {selectedRecipeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-gray-900 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl flex flex-col [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-temporary-turqoise [&::-webkit-scrollbar-thumb]:rounded-full">
                    
                    {/* Modal Header */}
                    <div className="relative h-64 w-full shrink-0">
                    {selectedRecipeModal.image_url ? (
                        <img src={selectedRecipeModal.image_url} alt={selectedRecipeModal.dish_name} className="w-full h-full object-cover rounded-t-3xl" />
                    ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-t-3xl">
                        <span className="text-gray-500 italic">No image available</span>
                        </div>
                    )}
                    <button 
                        onClick={() => setSelectedRecipeModal(null)} 
                        className="absolute top-4 right-4 bg-black/60 text-white w-10 h-10 rounded-full hover:bg-black/90 flex items-center justify-center font-bold transition-all"
                    >
                        ✕
                    </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-8 space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-white font-montserrat">{selectedRecipeModal.dish_name}</h2>
                            <div className="flex flex-wrap gap-3 mt-4 text-sm font-bold">
                                <span className="bg-temporary-turqoise/20 text-temporary-turqoise border border-temporary-turqoise/50 px-4 py-2 rounded-lg flex items-center">
                                    ⏱︎ {selectedRecipeModal.ready_in_minutes} mins
                                </span>
                                <span className="bg-purple-900/30 text-purple-400 border border-purple-800 px-4 py-2 rounded-lg flex items-center">
                                    Serves up to {selectedRecipeModal.servings}
                                </span>
                            </div>
                        </div>

                        {/* Ingredients */}
                        <div>
                            <h3 className="text-xl font-bold text-temporary-turqoise border-t border-gray-800 pt-6 pb-2 mb-3 font-montserrat">Ingredients</h3>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-300 font-manrope list-disc pl-5">
                            {(typeof selectedRecipeModal.ingredients === 'string' 
                                ? JSON.parse(selectedRecipeModal.ingredients || "[]") 
                                : selectedRecipeModal.ingredients || []
                            ).map((ing, idx) => (
                                <li key={idx} className="capitalize">{ing}</li>
                            ))}
                            </ul>
                        </div>

                        {/* Instructions */}
                        <div>
                            <h3 className="text-xl font-bold text-temporary-turqoise border-t border-gray-800 pt-6 pb-2 mb-3 font-montserrat">Instructions</h3>
                            <div 
                                className="text-gray-300 font-manrope leading-relaxed space-y-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>ul]:list-disc [&>ul]:pl-5 [&_li]:mb-2"
                                dangerouslySetInnerHTML={{ __html: selectedRecipeModal.instructions || "No instructions provided." }}
                            />
                        </div>
                    </div>
                </div>
                </div>
            )}
        </div>
    );
}

export default MealCalendar;