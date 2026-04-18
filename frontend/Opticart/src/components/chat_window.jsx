import { useState, useRef, useEffect } from 'react';


function ChatWindow() {
  // Conversation History
  const [messages, setMessages] = useState([]);
  // Current Input in the Input Box Text
  const [input, setInput] = useState("");
  // Loading status (disables submit button for input Box when prompts are being processed)
  const [isLoading, setIsLoading] = useState(false);
  // Selected Meal to viewed as a Modal
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  // Auto-scroll to bottom of chat
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // Trigger function for Playwright web scraping scripts
  const handleComparePrices = async (recipe) => {
    setSelectedRecipe(null);
    console.log("Triggering price comparison for:", recipe.dish_name);

    // Display process running
    const userMessage = { 
        sender: 'user', 
        type: 'text', 
        content: `Compare prices for ${recipe.dish_name} please.` 
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Call FastAPI endpoint
      const response = await fetch('http://127.0.0.1:8000/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          // Passing the parsed ingredients array to the backend
          ingredients: typeof recipe.ingredients === 'string' 
            ? JSON.parse(recipe.ingredients) 
            : recipe.ingredients 
        })
      });

      if (!response.ok) throw new Error("Scraping connection failed");

      // Receive nested dictionary
      const data = await response.json();

      // Display the new UI component into the chat history
      setMessages(prev => [...prev, {
        sender: 'ai',
        type: 'price_comparison',
        dishName: recipe.dish_name,
        // JSON structure of scraped prices
        comparisonData: data.comparison_data
      }]);

    } catch (error) {
      console.error("Scraping Error:", error);
      setMessages(prev => [...prev, { 
        sender: 'ai', 
        type: 'text', 
        content: `I'm sorry, I couldn't reach the supermarket scrapers right now. Please ensure the backend is running!` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Send prompt to Python backend
  const sendMessage = async () => {
    if (!input.trim()) return;

    // Display User's input to chat UI immediately
    const userMessage = { sender: 'user', type: 'text', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    const queryToSend = input;
    // Clear input box
    setInput("");
    // Disable prompt input box and prompt submit button whilst current prompt is being processed 
    setIsLoading(true);

    try {
      // Send input to FastAPI "/chat" endpoint (Port 8000)
      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryToSend })
      });

      if (!response.ok) throw new Error("Backend connection failed");

      // Receive Resulting Data responded from endpoint
      const data = await response.json();

      // Checking for the recipe grid formatted and returned from python script
      if (data.type === 'recipe_grid') {
          setMessages(prev => [...prev, { 
            sender: 'ai', 
            type: 'recipe_grid', 
            recipes: data.recipes 
          }]);
      } else if (data.dish_name) {  // Logic path remains in the case web scrapers return a single recipe card later on
          setMessages(prev => [...prev, {
            sender: 'ai', 
            type: 'recipe', // Special type for rendering cards
            dish: data.dish_name,
            instructions: data.instructions,
            ingredients: data.ingredients 
          }]);
      } else {
          // Fallback if backend sends a generic error
          setMessages(prev => [...prev, { sender: 'ai', type: 'text', content: data.error || "I couldn't understand that." }]);
      }

    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, { sender: 'ai', type: 'text', content: "Error: Is your Python backend running? (Check terminal)" }]);
    } finally {
      setIsLoading(false);
    }
  };


  {/* PAGE CONTENT */}
  return (
    <>
      <div className="flex flex-col flex-1 h-full relative bg-gray-50">

      {/* --- CHAT AREA --- */}
      <div className={`flex-1 bg-gray-900 overflow-y-auto p-4 md:p-8 flex flex-col ${messages.length === 0 ? 'justify-center' : ''}`}>

        {/* Conditional Rendering for Empty State */}
        {messages.length === 0 ? (
          
          /* Displays Hero greeting when the chat is empty */
          <div className="flex flex-col items-center justify-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold font-montserrat text-white tracking-wide text-center">
              Where should we <span className="text-temporary-turqoise">start?</span>
            </h1>
            <p className="text-gray-400 text-lg font-manrope text-center max-w-lg">
              Ask Opticart for a recipe of your preferred preference, a budget-friendly meal plan, or an ingredient breakdown.
            </p>
          </div>

        ) : (
          
          /* --- Normal Chat View once first prompt is submitted --- */
          <div className="space-y-6 flex-1">
            {messages.map((msg, index) => (
              <div key={index} className="flex">
                
                {/* AI MESSAGES ARE TRANSPARENT FOR GRIDS, BUBBLES FOR TEXT */}
                <div className={`max-w-4xl w-full ${
                  msg.sender === 'user'
                    ? 'p-5 rounded-2xl shadow-sm bg-temporary-turqoise text-white w-fit ml-auto'
                    : msg.type === 'recipe_grid' 
                        ? 'bg-transparent' // Grids look better without a massive bubble behind them
                        : 'p-5 rounded-2xl shadow-sm bg-gray-800 text-white border border-gray-700 w-fit'
                }`}>
                  
                  {msg.type === 'text' && <p className="text-lg font-manrope">{msg.content}</p>}

                  {/* RECIPE GRID */}
                  {msg.type === 'recipe_grid' && (
                    <div className="w-full">
                      <p className="text-gray-300 font-manrope mb-4 text-lg">Here are some great options I found for you:</p>
                      
                      {/* The 3x2 Grid Container */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {msg.recipes.map((recipe, i) => (
                          <div key={i} className="bg-gray-800 rounded-xl overflow-hidden flex flex-col border border-gray-700 shadow-lg hover:border-temporary-turqoise transition-colors">
                            {/* Recipe Image */}
                            {recipe.image_url ? (
                              <img src={recipe.image_url} alt={recipe.dish_name} className="w-full h-40 object-cover" />
                            ) : (
                              <div className="w-full h-40 bg-gray-700 flex items-center justify-center">
                                <span className="text-gray-500 italic">No image available</span>
                              </div>
                            )}
                            
                            <div className="p-5 flex flex-col flex-1">
                              <h4 className="font-bold text-xl text-white line-clamp-1" title={recipe.dish_name}>
                                {recipe.dish_name}
                              </h4>
                              
                              {/* Macros / Badges */}
                              <div className="flex gap-2 text-xs font-bold text-gray-300 mt-2 mb-3">
                                <span className="bg-gray-700 px-2 py-1 rounded">{recipe.ready_in_minutes}mins</span>
                                <span className="bg-gray-700 px-2 py-1 rounded">{recipe.calories} kcal</span>
                              </div>
                              
                              <div className="mt-auto space-y-2">
                                {/* NEW: The More Details Button */}
                                <button 
                                  onClick={() => setSelectedRecipe(recipe)}
                                  className="w-full bg-gray-700 text-white py-2.5 rounded-lg font-bold hover:bg-gray-600 transition-all text-sm"
                                >
                                  More Details
                                </button>
                                
                                <button 
                                  onClick={() => handleComparePrices(recipe)}
                                  className="w-full bg-transparent border-2 border-temporary-turqoise text-temporary-turqoise py-2.5 rounded-lg font-bold hover:bg-temporary-turqoise hover:text-white transition-all text-sm"
                                >
                                  Compare Prices
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* --- PRICE COMPARISON GRID --- */}
                  {msg.type === 'price_comparison' && (
                    <div className="w-full mt-2">
                      <p className="text-gray-300 mb-6 font-manrope text-lg">
                        Here are the live supermarket prices for <span className="font-bold text-white">{msg.dishName}</span>
                      </p>
                      
                      {/* Container for all ingredient blocks */}
                      <div className="space-y-6">
                        {Object.entries(msg.comparisonData).map(([ingredientName, stores]) => (
                          <div key={ingredientName} className="bg-gray-800 rounded-xl p-5 border border-gray-700 shadow-md">
                            
                            {/* Ingredient Header */}
                            <h4 className="text-xl font-bold text-temporary-turqoise capitalize mb-4 border-b border-gray-700 pb-2">
                              {ingredientName}
                            </h4>
                            
                            {/* Grid of 4 Supermarkets */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                              {Object.entries(stores).map(([storeName, info]) => {
                                // Determine text color based on stock status
                                const isError = info.status === "Out of Stock" || info.status === "Error";
                                
                                return (
                                  <div 
                                    key={storeName} 
                                    className={`p-4 rounded-lg flex flex-col justify-between border ${
                                      isError ? 'bg-gray-800 border-red-900/50' : 'bg-gray-900 border-gray-700'
                                    }`}
                                  >
                                    <div>
                                      <p className="font-bold text-gray-400 text-sm mb-1 uppercase tracking-wider">{storeName}</p>
                                      <p className="text-white text-sm line-clamp-2 font-bold" title={info.name}>
                                        {info.name}
                                      </p>
                                    </div>
                                    
                                    <div className="mt-4 flex items-end justify-between">
                                      <span className={`text-xl font-bold ${isError ? 'text-red-400' : 'text-green-400'}`}>
                                        {info.price}
                                      </span>
                                      {isError && (
                                        <span className="text-xs text-red-500 font-bold bg-red-900/20 px-2 py-1 rounded">
                                          Unavailable
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start animate-pulse">
                 <div className="bg-gray-200 text-gray-500 px-4 py-2 rounded-2xl text-sm font-bold">
                   Opticart is thinking...
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* --- INPUT AREA --- */}
      <div className="shrink-0 w-full flex justify-center pb-7 pt-2 bg-transparent dark:bg-gray-900">
        <div className="rounded-4xl bg-sky-950 border border-gray-700 p-6 shadow-xl w-11/12 max-w-4xl">
          <div className="flex flex-row items-center justify-center space-x-4">
            <textarea
              className="flex-1 p-4 border border-gray-300 rounded-xl focus:outline-none bg-gray-600 focus:border-temporary-turqoise font-manrope text-sm field-sizing-content [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-temporary-turqoise [&::-webkit-scrollbar-thumb]:rounded-full max-h-30 resize-none text-white"
              placeholder="Ask Opticart..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Allows Shift+Enter for new lines, Enter to send
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={isLoading}
            ></textarea>
            <button 
              onClick={sendMessage} 
              disabled={isLoading}
              className={`px-5 py-5 rounded-full text-sm font-bold text-white font-montserrat transition-all h-fit ${
                isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-temporary-turqoise hover:opacity-90'
              }`}
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>

      {/* --- MEAL CARD MODAL DETAILS --- */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-gray-900 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl flex flex-col [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-temporary-turqoise [&::-webkit-scrollbar-thumb]:rounded-full">
            
            {/* Modal Header: Image + Close Button */}
            <div className="relative h-64 w-full shrink-0">
              {selectedRecipe.image_url ? (
                <img src={selectedRecipe.image_url} alt={selectedRecipe.dish_name} className="w-full h-full object-cover rounded-t-3xl" />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center rounded-t-3xl">
                  <span className="text-gray-500 italic">No image available</span>
                </div>
              )}
              {/* Absolute Close Button */}
              <button 
                onClick={() => setSelectedRecipe(null)} 
                className="absolute top-4 right-4 bg-black/60 text-white w-10 h-10 rounded-full hover:bg-black/90 flex items-center justify-center font-bold transition-all"
              >
                X
              </button>
            </div>

            {/* Modal Body: Rich Details */}
            <div className="p-8 space-y-8">
              
              {/* Title & Macros */}
              <div>
                <h2 className="text-3xl font-bold text-white font-montserrat">{selectedRecipe.dish_name}</h2>
                <div className="flex flex-wrap gap-2 text-sm font-bold text-gray-300 mt-4">
                  <span className="bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-lg">{selectedRecipe.ready_in_minutes} mins</span>
                  <span className="bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-lg">{selectedRecipe.calories} kcal</span>
                  <span className="bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-lg">{selectedRecipe.protein_g}g Protein</span>
                  {selectedRecipe.is_vegetarian && <span className="bg-green-900/40 text-green-400 border border-green-800 px-3 py-1.5 rounded-lg">Vegetarian</span>}
                </div>
              </div>

              {/* Summary */}
              <div>
                <h3 className="text-xl font-bold text-temporary-turqoise border-b border-gray-800 pb-2 mb-3 font-montserrat">About this meal</h3>
                <p className="text-gray-300 font-manrope leading-relaxed">{selectedRecipe.summary}</p>
              </div>

              {/* Ingredients List */}
              <div>
                <h3 className="text-xl font-bold text-temporary-turqoise border-b border-gray-800 pb-2 mb-3 font-montserrat">Ingredients Needed</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-gray-300 font-manrope list-disc pl-5">
                  {selectedRecipe.ingredients.map((ing, idx) => (
                    <li key={idx} className="capitalize">{ing}</li>
                  ))}
                </ul>
              </div>

              {/* Action Button inside Modal */}
              <div className="pt-4">
                <button 
                  onClick={() => handleComparePrices(selectedRecipe)}
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
    </>
  )
}

export default ChatWindow