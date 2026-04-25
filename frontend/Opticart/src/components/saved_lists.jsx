import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

function SavedLists() {
    const { user } = useAuth();
    const [savedLists, setSavedLists] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Edit Modal State
    const [editingList, setEditingList] = useState(null);

    // 1. Fetch Lists on Load
    useEffect(() => {
        fetchSavedLists();
    }, [user]);

    const fetchSavedLists = async () => {
        if (!user) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('saved_lists')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching lists:', error);
        } else {
            setSavedLists(data);
        }
        setLoading(false);
    };

    // 2. Delete List Function
    const handleDeleteList = async (listId) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this shopping list?");
        if (!confirmDelete) return;

        const { error } = await supabase
            .from('saved_lists')
            .delete()
            .eq('id', listId);

        if (!error) {
            setSavedLists(prev => prev.filter(list => list.id !== listId));
        } else {
            alert("Failed to delete list.");
        }
    };

    // 3. Update Quantity & Recalculate Function (For the Modal)
    const handleQuantityChange = (ingredientIndex, newQuantity) => {
        if (!editingList || newQuantity < 1) return;

        // Create a fresh array and a fresh item object to avoid mutating original state
        const updatedItems = editingList.items.map((item, index) => {
            if (index === ingredientIndex) {
                return { ...item, quantity: newQuantity }; // Copy the item and update its quantity
            }
            return item; // Leave other items untouched
        });

        // Recalculate the total basket price based on new quantities
        const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Set the editing list with our new fresh data
        setEditingList({
            ...editingList,
            items: updatedItems,
            total_price: newTotal
        });
    };

    // 4. Save Edited List back to Supabase
    const handleSaveEdits = async () => {
        const { error } = await supabase
            .from('saved_lists')
            .update({ 
                items: editingList.items, 
                total_price: editingList.total_price 
            })
            .eq('id', editingList.id);

        if (error) {
            alert("Failed to save changes.");
        } else {
            // Update the local state so the UI reflects the change immediately
            setSavedLists(prev => prev.map(list => list.id === editingList.id ? editingList : list));
            setEditingList(null); // Close modal
        }
    };


    if (loading) {
        return (
            <div className="flex-1 bg-gray-900 flex items-center justify-center p-8">
                <p className="text-white font-bold animate-pulse text-xl font-montserrat">Loading your shopping lists...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-gray-900 overflow-y-auto p-4 md:p-8 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-900 [&::-webkit-scrollbar-thumb]:bg-temporary-turqoise [&::-webkit-scrollbar-thumb]:rounded-full">
            <div className="max-w-7xl mx-auto">
                
                <h1 className="text-4xl md:text-5xl font-bold font-montserrat text-white tracking-wide mb-2 pl-14 py-4 border-b">
                    My Saved <span className="text-temporary-turqoise">Lists</span>
                </h1>
                <p className="text-gray-400 font-manrope text-lg mb-8">
                    Manage your grocery baskets and track your estimated totals.
                </p>

                {savedLists.length === 0 ? (
                    <div className="bg-gray-800 p-8 rounded-2xl text-center border border-gray-700">
                        <p className="text-gray-400 font-manrope text-lg">You haven't saved any shopping lists yet!</p>
                        <p className="text-gray-500 font-manrope text-sm mt-2">Compare prices in the chat and click "Save Basket" to add one.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {savedLists.map(list => (
                            <div key={list.id} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 shadow-xl flex flex-col hover:border-temporary-turqoise transition-colors">
                                
                                {/* Card Header */}
                                <div className="flex justify-between items-start border-b border-gray-700 pb-4 mb-4">
                                    <div>
                                        <h3 className="text-2xl font-bold text-white font-montserrat">{list.dish_name}</h3>
                                        <p className="text-temporary-turqoise font-bold uppercase tracking-wider text-sm mt-1">
                                            {list.supermarket}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Estimated Total</p>
                                        <p className="text-3xl font-bold text-white">£{list.total_price.toFixed(2)}</p>
                                    </div>
                                </div>

                                {/* Preview of Items */}
                                <div className="flex-1 mb-6">
                                    <p className="text-gray-400 font-manrope text-sm mb-3">Items ({list.items.length}):</p>
                                    <div className="space-y-2">
                                        {/* Show only first 3 items as preview */}
                                        {list.items.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm text-gray-300 font-manrope">
                                                <span>{item.quantity}x {item.product_name}</span>
                                                <span className="font-bold text-white">£{(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                        ))}
                                        {list.items.length > 3 && (
                                            <p className="text-gray-500 text-xs italic mt-2">+ {list.items.length - 3} more items...</p>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 mt-auto">
                                    <button 
                                        onClick={() => setEditingList(list)}
                                        className="flex-1 bg-sky-900 hover:bg-temporary-turqoise text-white py-3 rounded-xl font-bold transition-colors text-sm"
                                    >
                                        Edit Quantities
                                    </button>
                                    <button 
                                        onClick={() => handleDeleteList(list.id)}
                                        className="bg-red-900/30 text-red-400 hover:bg-red-600 hover:text-white px-5 py-3 rounded-xl font-bold transition-colors border border-red-800/50 hover:border-red-600"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            </div>

            {/* --- EDIT MODAL --- */}
            {editingList && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-gray-900 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-gray-700 shadow-2xl">
                        
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold text-white font-montserrat">Edit Shopping List</h2>
                                <p className="text-temporary-turqoise font-bold text-sm mt-1">{editingList.dish_name} • {editingList.supermarket}</p>
                            </div>
                            <button 
                                onClick={() => setEditingList(null)} 
                                className="text-gray-400 hover:text-white text-2xl font-bold p-2"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body (Scrollable Items) */}
                        <div className="p-6 overflow-y-auto flex-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-900 [&::-webkit-scrollbar-thumb]:bg-temporary-turqoise [&::-webkit-scrollbar-thumb]:rounded-full space-y-4">
                            {editingList.items.map((item, idx) => (
                                <div key={idx} className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex items-center gap-4">
                                    {/* Small Image Preview */}
                                    {item.image ? (
                                        <div className="w-16 h-16 bg-white rounded-md flex items-center justify-center p-1 shrink-0">
                                            <img src={item.image} alt={item.product_name} className="max-h-full object-contain mix-blend-multiply" />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 bg-gray-700 rounded-md shrink-0 border border-gray-600" />
                                    )}

                                    {/* Item Details */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-temporary-turqoise font-bold uppercase tracking-wider mb-1">{item.ingredient_name}</p>
                                        <p className="text-white font-bold text-sm truncate" title={item.product_name}>{item.product_name}</p>
                                        <p className="text-gray-400 text-xs mt-1">£{item.price.toFixed(2)} each</p>
                                    </div>

                                    {/* Quantity Controls & Math */}
                                    <div className="flex flex-col items-end shrink-0">
                                        <p className="text-white font-bold text-lg mb-2">£{(item.price * item.quantity).toFixed(2)}</p>
                                        
                                        <div className="flex items-center bg-gray-900 rounded-lg border border-gray-600 overflow-hidden">
                                            <button 
                                                onClick={() => handleQuantityChange(idx, item.quantity - 1)}
                                                disabled={item.quantity <= 1}
                                                className="px-3 py-1 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent font-bold transition-colors"
                                            >-</button>
                                            <span className="px-3 py-1 text-white font-bold text-sm bg-gray-800 min-w-[40px] text-center">
                                                {item.quantity}
                                            </span>
                                            <button 
                                                onClick={() => handleQuantityChange(idx, item.quantity + 1)}
                                                className="px-3 py-1 text-gray-300 hover:bg-gray-700 font-bold transition-colors"
                                            >+</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Modal Footer (Total & Save) */}
                        <div className="p-6 border-t border-gray-800 bg-gray-900 rounded-b-3xl shrink-0 flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-1">New Total</p>
                                <p className="text-3xl font-bold text-temporary-turqoise">£{editingList.total_price.toFixed(2)}</p>
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setEditingList(null)}
                                    className="px-6 py-3 rounded-xl font-bold text-white bg-gray-700 hover:bg-gray-600 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleSaveEdits}
                                    className="px-6 py-3 rounded-xl font-bold text-white bg-temporary-turqoise hover:opacity-90 transition-opacity"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

export default SavedLists;