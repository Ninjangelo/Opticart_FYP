import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

function Recommendations({ onComparePrices }) {
    const { user } = useAuth();
    
    // Core State
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hasSavedMeals, setHasSavedMeals] = useState(true);
    
    // Modal State (Reused from your other components)
    const [selectedRecipe, setSelectedRecipe] = useState(null);
    const [savedMealIds, setSavedMealIds] = useState(new Set());

    // 1. Fetch User's Saved Meals & Generate Recommendations
    useEffect(() => {
        if (!user) return;
        
        const fetchAndGenerate = async () => {
            setLoading(true);
            
            // Step A: Get all the user's saved meals from Supabase
            const { data: savedData, error: savedError } = await supabase
                .from('saved_meals')
                .select(`
                    recipe_id,
                    recipes (dish_name)
                `)
                .eq('user_id', user.id);

            if (savedError || !savedData || savedData.length === 0) {
                setHasSavedMeals(false);
                setLoading(false);
                return;
            }

            // Extract the dish names and IDs
            const savedDishNames = savedData
                .map(d => d.recipes?.dish_name)
                .filter(name => name != null);
                
            const savedRecipeIds = savedData
                .map(d => d.recipe_id)
                .filter(id => id != null);
                
            setSavedMealIds(new Set(savedRecipeIds));

            // Step B: Send the lists to our new Python endpoint
            try {
                const response = await fetch('http://127.0.0.1:8000/recommendations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        saved_dish_names: savedDishNames,
                        saved_recipe_ids: savedRecipeIds,
                        limit: 8 // We want a max of 8 meals for the 4x2 grid
                    })
                });

                if (!response.ok) throw new Error("Failed to fetch recommendations");

                const data = await response.json();
                if (data.recommendations) {
                    setRecommendations(data.recommendations);
                }
            } catch (error) {
                console.error("Error fetching recommendations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAndGenerate();
    }, [user]);

    // 2. The Save Meal Toggle (Same logic as chat_window.jsx)
    const handleToggleSave = async (recipe) => {
        if (!user) return;
        const isSaved = savedMealIds.has(recipe.id);

        if (isSaved) {
            const { error } = await supabase.from('saved_meals').delete().match({ user_id: user.id, recipe_id: recipe.id });
            if (!error) setSavedMealIds(prev => { const next = new Set(prev); next.delete(recipe.id); return next; });
        } else {
            const { error } = await supabase.from('saved_meals').insert({ user_id: user.id, recipe_id: recipe.id });
            if (!error) setSavedMealIds(prev => { const next = new Set(prev); next.add(recipe.id); return next; });
        }
    };


    // --- RENDERING VIEWS ---
    if (loading) {
        return (
            <div className="flex-1 bg-gray-900 flex flex-col items-center justify-center p-8">
                <div className="w-16 h-16 border-4 border-gray-700 border-t-temporary-turqoise rounded-full animate-spin mb-4"></div>
                <p className="text-white font-bold animate-pulse text-xl font-montserrat">Analyzing your taste profile...</p>
            </div>
        );
    }

    if (!hasSavedMeals) {
        return (
            <div className="flex-1 bg-gray-900 overflow-y-auto p-4 md:p-8">
                <div className="max-w-7xl mx-auto text-center mt-20">
                    <h1 className="text-4xl font-bold font-montserrat text-white mb-4">
                        Discover New <span className="text-temporary-turqoise">Favorites</span>
                    </h1>
                    <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700 inline-block max-w-lg">
                        <p className="text-gray-400 font-manrope text-lg">
                            We need to learn what you like first!
                        </p>
                        <p className="text-gray-500 font-manrope mt-2">
                            Go to the chat, ask for a few recipes, and click "Save Meal". Once you have a few saved, return here for personalized recommendations.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-gray-900 overflow-y-auto p-4 md:p-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-900 [&::-webkit-scrollbar-thumb]:bg-temporary-turqoise [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="max-w-7xl mx-auto">
                
                <h1 className="pbtext-4xl md:text-5xl font-bold font-montserrat text-white tracking-wide mb-2 pl-20">
                    Recommended <span className="text-temporary-turqoise">Meals</span>
                </h1>
                <p className="text-gray-400 font-manrope text-lg mb-8 pl-20">
                    Based on the meals you've saved, we think you'll love these.
                </p>

                {/* 4x2 Grid Container */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {recommendations.map((recipe, i) => {
                        const isSaved = savedMealIds.has(recipe.id);

                        return (
                            <div 
                                key={recipe.id} 
                                className="bg-gray-800 rounded-xl overflow-hidden flex flex-col border border-gray-700 shadow-lg hover:border-temporary-turqoise transition-colors animate-card"
                                style={{ animationDelay: `${i * 0.1}s` }}
                            >
                                {/* Image */}
                                {recipe.image_url ? (
                                    <img src={recipe.image_url} alt={recipe.dish_name} className="w-full h-48 object-cover" />
                                ) : (
                                    <div className="w-full h-48 bg-gray-700 flex items-center justify-center">
                                        <span className="text-gray-500 italic">No image available</span>
                                    </div>
                                )}
                                
                                <div className="p-5 flex flex-col flex-1">
                                    <h4 className="font-bold text-xl text-white mb-2 leading-tight" title={recipe.dish_name}>
                                        {recipe.dish_name}
                                    </h4>
                                    
                                    {/* Badges */}
                                    <div className="flex flex-wrap gap-2 text-xs font-bold text-gray-300 mb-4">
                                        <span className="bg-gray-700 px-2 py-1 rounded">{recipe.ready_in_minutes}mins</span>
                                        <span className="bg-gray-700 px-2 py-1 rounded">{recipe.calories} kcal</span>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="mt-auto space-y-2">
                                        <button 
                                            onClick={() => setSelectedRecipe(recipe)}
                                            className="w-full bg-gray-700 text-white py-2.5 rounded-lg font-bold hover:bg-gray-600 transition-all text-sm"
                                        >
                                            More Details
                                        </button>
                                        
                                        <button 
                                            onClick={() => onComparePrices(recipe)}
                                            className="w-full bg-transparent border-2 border-temporary-turqoise text-temporary-turqoise py-2.5 rounded-lg font-bold hover:bg-temporary-turqoise hover:text-white transition-all text-sm"
                                        >
                                            Compare Prices
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleToggleSave(recipe)}
                                            className={`w-full border-2 py-2.5 rounded-lg font-bold transition-all text-sm ${
                                                isSaved 
                                                ? 'bg-red-900/20 text-red-400 border-red-500/50 hover:bg-red-500 hover:text-white' 
                                                : 'bg-gray-800 border-pink-500/50 text-pink-400 hover:bg-pink-500 hover:text-white hover:border-pink-500'
                                            }`}
                                        >
                                            {isSaved ? '⊘ Remove Save' : '❤︎⁠ Save Meal'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

            </div>

            {/* --- MEAL DETAILS MODAL (Reused) --- */}
            {selectedRecipe && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-gray-900 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl flex flex-col [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-temporary-turqoise [&::-webkit-scrollbar-thumb]:rounded-full">
                        
                        <div className="relative h-64 w-full shrink-0">
                            {selectedRecipe.image_url ? (
                                <img src={selectedRecipe.image_url} alt={selectedRecipe.dish_name} className="w-full h-full object-cover rounded-t-3xl" />
                            ) : (
                                <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-t-3xl">
                                    <span className="text-gray-500 italic">No image available</span>
                                </div>
                            )}
                            <button 
                                onClick={() => setSelectedRecipe(null)} 
                                className="absolute top-4 right-4 bg-black/60 text-white w-10 h-10 rounded-full hover:bg-black/90 flex items-center justify-center font-bold transition-all"
                            >
                                X
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            <div>
                                <h2 className="text-3xl font-bold text-white font-montserrat">{selectedRecipe.dish_name}</h2>
                                <div className="flex flex-wrap gap-3 mt-4 text-sm font-bold">
                                    <span className="bg-temporary-turqoise/20 text-temporary-turqoise border border-temporary-turqoise/50 px-4 py-2 rounded-lg flex items-center">
                                        ⏱︎ {selectedRecipe.ready_in_minutes} mins
                                    </span>
                                    <span className="bg-purple-900/30 text-purple-400 border border-purple-800 px-4 py-2 rounded-lg flex items-center">
                                        Serves up to {selectedRecipe.servings}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Nutrition & Dietary</h3>
                                <div className="flex flex-wrap gap-2 text-sm font-bold text-gray-200">
                                    <span className="bg-gray-700 px-3 py-1.5 rounded shadow-sm">{selectedRecipe.calories} kcal</span>
                                    {selectedRecipe.is_vegetarian && <span className="bg-green-900/40 text-green-400 border border-green-800 px-3 py-1.5 rounded">Vegetarian</span>}
                                    {selectedRecipe.is_vegan && <span className="bg-green-900/40 text-green-400 border border-green-800 px-3 py-1.5 rounded">Vegan</span>}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-temporary-turqoise pb-2 mb-3 font-montserrat">About this meal</h3>
                                <p className="text-gray-300 font-manrope leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedRecipe.summary }} />
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-temporary-turqoise border-t border-gray-800 pt-6 pb-2 mb-3 font-montserrat">Ingredients Needed</h3>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-300 font-manrope list-disc pl-5">
                                    {(typeof selectedRecipe.ingredients === 'string' ? JSON.parse(selectedRecipe.ingredients || "[]") : selectedRecipe.ingredients || []).map((ing, idx) => (
                                        <li key={idx} className="capitalize">{ing}</li>
                                    ))}
                                </ul>
                            </div>

                            <div className="pt-4">
                                <button 
                                    onClick={() => onComparePrices(selectedRecipe)}
                                    className="w-full bg-temporary-turqoise text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-all font-montserrat shadow-lg"
                                >
                                    Compare Supermarket Prices
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Recommendations;