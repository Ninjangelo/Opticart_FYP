import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

function SavedMeals({ onComparePrices }) {
    const { user } = useAuth();
    const [savedMeals, setSavedMeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRecipe, setSelectedRecipe] = useState(null);

    const parseArray = (data) => {
        if (!data) return 'Unspecified';
        if (Array.isArray(data)) return data.join(', ');
        try { return JSON.parse(data).join(', '); } catch { return data; }
    };

    useEffect(() => {
        const fetchSavedMeals = async () => {
            if (!user) return;
            setLoading(true);
            const { data, error } = await supabase.from('saved_meals').select(`id, recipe_id, recipes (*)`).eq('user_id', user.id).order('created_at', { ascending: false });
            if (data) {
                setSavedMeals(data.map(item => item.recipes).filter(r => r !== null));
            }
            setLoading(false);
        };
        fetchSavedMeals();
    }, [user]);

    const handleRemoveMeal = async (recipeId) => {
        const { error } = await supabase.from('saved_meals').delete().match({ user_id: user.id, recipe_id: recipeId });
        if (!error) {
            setSavedMeals(savedMeals.filter(meal => meal.id !== recipeId));
        }
    };

    const handleCloseModal = () => setSelectedRecipe(null);

    return (
        <div className="flex-1 bg-gray-900 p-8 overflow-y-auto w-full h-full flex flex-col items-center relative">
            <div className="w-full max-w-7xl flex flex-col md:flex-row justify-between items-center mb-8 border-b border-gray-700 pb-4 shrink-0">
                <h1 className="text-4xl font-bold font-montserrat text-white">Saved Meals</h1>
            </div>

            {loading ? (
                <div className="text-temporary-turqoise font-bold text-xl animate-pulse mt-20">Loading your meals...</div>
            ) : savedMeals.length === 0 ? (
                <div className="text-gray-400 font-manrope text-lg mt-20">You haven't saved any meals yet! Head to the Chat or Browse Meals to find some.</div>
            ) : (
                <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {savedMeals.map((recipe, i) => (
                        <div key={recipe.id || i} className="bg-gray-800 rounded-xl overflow-hidden flex flex-col border border-gray-700 shadow-lg hover:border-temporary-turqoise transition-colors">
                            {recipe.image_url ? (
                                <img src={recipe.image_url} alt={recipe.dish_name} className="w-full h-40 object-cover" />
                            ) : (
                                <div className="w-full h-40 bg-gray-700 flex items-center justify-center">
                                    <span className="text-gray-500 italic">No image available</span>
                                </div>
                            )}
                            <div className="p-5 flex flex-col flex-1">
                                <h4 className="font-bold text-xl text-white line-clamp-2" title={recipe.dish_name}>{recipe.dish_name}</h4>
                                <div className="flex gap-2 text-xs font-bold text-gray-300 mt-2 mb-4">
                                    <span className="bg-gray-700 px-2 py-1 rounded">{recipe.ready_in_minutes || '?'} mins</span>
                                    <span className="bg-gray-700 px-2 py-1 rounded">{recipe.calories || '?'} kcal</span>
                                </div>
                                <div className="mt-auto space-y-2">
                                    <button onClick={() => setSelectedRecipe(recipe)} className="w-full bg-gray-700 text-white py-2.5 rounded-lg font-bold hover:bg-gray-600 transition-all text-sm">
                                        ⓘ More Details
                                    </button>
                                    <button onClick={() => onComparePrices(recipe)} className="w-full bg-transparent border-2 border-temporary-turqoise text-temporary-turqoise py-2.5 rounded-lg font-bold hover:bg-temporary-turqoise hover:text-white transition-all text-sm">
                                        🛒 Compare Prices
                                    </button>
                                    {/* CONSTANT REMOVE BUTTON */}
                                    <button onClick={() => handleRemoveMeal(recipe.id)} className="w-full border-2 py-2.5 rounded-lg font-bold transition-all text-sm bg-red-900/20 text-red-400 border-red-500/50 hover:bg-red-500 hover:text-white">
                                        ⊘ Remove Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* RICH MODAL - Now identical to Chat */}
            {selectedRecipe && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
                  <div className="bg-gray-900 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl flex flex-col [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-temporary-turqoise [&::-webkit-scrollbar-thumb]:rounded-full">
                    
                    <div className="relative h-64 w-full shrink-0">
                      {selectedRecipe.image_url ? (
                        <img src={selectedRecipe.image_url} alt={selectedRecipe.dish_name} className="w-full h-full object-cover rounded-t-3xl" />
                      ) : (
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-t-3xl"><span className="text-gray-500 italic">No image available</span></div>
                      )}
                      <button onClick={handleCloseModal} className="absolute top-4 right-4 bg-black/60 text-white w-10 h-10 rounded-full hover:bg-black/90 flex items-center justify-center font-bold transition-all">X</button>
                    </div>
        
                    <div className="p-8 space-y-8">
                      <div>
                        <h2 className="text-3xl font-bold text-white font-montserrat">{selectedRecipe.dish_name}</h2>
                        <div className="flex flex-wrap gap-3 mt-4 text-sm font-bold">
                          <span className="bg-temporary-turqoise/20 text-temporary-turqoise border border-temporary-turqoise/50 px-4 py-2 rounded-lg flex items-center">⏱︎ {selectedRecipe.ready_in_minutes || '?'} mins</span>
                          <span className="bg-purple-900/30 text-purple-400 border border-purple-800 px-4 py-2 rounded-lg flex items-center">Serves up to {selectedRecipe.servings || '?'}</span>
                        </div>
                      </div>
        
                      <div className="bg-gray-800/50 p-5 rounded-2xl border border-gray-700">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Nutrition & Dietary</h3>
                        <div className="flex flex-wrap gap-2 text-sm font-bold text-gray-200">
                          <span className="bg-gray-700 px-3 py-1.5 rounded shadow-sm">{selectedRecipe.calories} kcal</span>
                          <span className="bg-gray-700 px-3 py-1.5 rounded shadow-sm">{selectedRecipe.protein_g}g Protein</span>
                          <span className="bg-gray-700 px-3 py-1.5 rounded shadow-sm">{selectedRecipe.fat_g}g Fat</span>
                          <span className="bg-gray-700 px-3 py-1.5 rounded shadow-sm">{selectedRecipe.carbs_g}g Carbs</span>
                          {selectedRecipe.is_vegetarian && <span className="bg-green-900/40 text-green-400 border border-green-800 px-3 py-1.5 rounded">Vegetarian</span>}
                          {selectedRecipe.is_vegan && <span className="bg-green-900/40 text-green-400 border border-green-800 px-3 py-1.5 rounded">Vegan</span>}
                          {selectedRecipe.is_gluten_free && <span className="bg-yellow-900/40 text-yellow-400 border border-yellow-800 px-3 py-1.5 rounded">Gluten-Free</span>}
                          {selectedRecipe.is_dairy_free && <span className="bg-blue-900/40 text-blue-400 border border-blue-800 px-3 py-1.5 rounded">Dairy-Free</span>}
                        </div>
                      </div>
        
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm font-manrope border-y border-gray-800 py-4">
                        <div><span className="block text-gray-500 font-bold mb-1">Cuisine</span><span className="text-gray-300 capitalize">{parseArray(selectedRecipe.cuisines)}</span></div>
                        <div><span className="block text-gray-500 font-bold mb-1">Dish Type</span><span className="text-gray-300 capitalize">{parseArray(selectedRecipe.dish_types)}</span></div>
                        <div><span className="block text-gray-500 font-bold mb-1">Dietary Profile</span><span className="text-gray-300 capitalize">{parseArray(selectedRecipe.diets)}</span></div>
                      </div>
        
                      <div>
                        <h3 className="text-xl font-bold text-temporary-turqoise pb-2 mb-3 font-montserrat">About this meal</h3>
                        <p className="text-gray-300 font-manrope leading-relaxed [&>a]:text-temporary-turqoise [&>a]:underline" dangerouslySetInnerHTML={{ __html: selectedRecipe.summary }}/>
                      </div>
        
                      <div>
                        <h3 className="text-xl font-bold text-temporary-turqoise border-t border-gray-800 pt-6 pb-2 mb-3 font-montserrat">Ingredients Needed</h3>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-300 font-manrope list-disc pl-5">
                          {(typeof selectedRecipe.ingredients === 'string' ? JSON.parse(selectedRecipe.ingredients || "[]") : selectedRecipe.ingredients || []).map((ing, idx) => (
                            <li key={idx} className="capitalize">{ing}</li>
                          ))}
                        </ul>
                      </div>
        
                      <div>
                        <h3 className="text-xl font-bold text-temporary-turqoise border-t border-gray-800 pt-6 pb-2 mb-3 font-montserrat">Instructions</h3>
                        <div className="text-gray-300 font-manrope leading-relaxed space-y-4 [&>ol]:list-decimal [&>ol]:pl-5 [&>ul]:list-disc [&>ul]:pl-5 [&_li]:mb-2" dangerouslySetInnerHTML={{ __html: selectedRecipe.instructions || "No specific instructions provided for this recipe." }}/>
                      </div>
        
                      <div className="pt-4">
                        <button onClick={() => { handleCloseModal(); onComparePrices(selectedRecipe); }} className="w-full bg-temporary-turqoise text-white py-4 rounded-xl font-bold text-lg hover:opacity-90 transition-all font-montserrat shadow-lg">
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

export default SavedMeals;