import { useState, useRef, useEffect } from 'react';

/* COMPONENT IMPORTS */


/* PAGE IMPORTS */


function ChatWindow() {
  // Conversation History
  const [messages, setMessages] = useState([
    { 
      sender: 'ai', 
      type: 'text', 
      content: 'Hello! I am Opticart. Ask me for a recipe (e.g., "How do I make spaghetti?").' 
    }
  ]);
  
  // Current Input in the Input Box Text
  const [input, setInput] = useState("");
  
  // Loading status (disables submit button for Input Box)
  const [isLoading, setIsLoading] = useState(false);

  // Auto-scroll to bottom of chat
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  // Send message to Python Backend
  const sendMessage = async () => {
    if (!input.trim()) return;

    // Display User's input to chat UI immediately
    const userMessage = { sender: 'user', type: 'text', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    const queryToSend = input;
    setInput(""); // Clear input box
    setIsLoading(true); // Start loading

    try {
      // Send input to FastAPI (Port 8000)
      const response = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryToSend })
      });

      if (!response.ok) throw new Error("Backend connection failed");

      // Receive Resulting Data
      const data = await response.json();

      // Formulate Recipe Card message
      // Checking if data has 'dish_name' to confirm it's a recipe
      if (data.dish_name) {
          const aiResponse = { 
            sender: 'ai', 
            type: 'recipe', // Special type for rendering cards
            dish: data.dish_name,
            instructions: data.instructions,
            ingredients: data.ingredients 
          };
          setMessages(prev => [...prev, aiResponse]);
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

  return (
    <>
      <div className="flex flex-col w-screen bg-gray-50">

      {/* --- CHAT AREA --- */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 pb-32">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            
            {/* MESSAGE BUBBLE */}
            <div className={`max-w-3xl p-5 rounded-2xl shadow-sm ${
              msg.sender === 'user'
                ? 'bg-temporary-turqoise text-white'
                : 'bg-white text-gray-800 border border-gray-200'
            }`}>
              
              {/* RENDER SIMPLE TEXT */}
              {msg.type === 'text' && <p className="text-lg font-manrope">{msg.content}</p>}

              {/* RENDER RECIPE CARD (Data from Python) */}
              {msg.type === 'recipe' && (
                <div className="space-y-4 font-manrope">
                  <h3 className="text-2xl font-bold text-temporary-turqoise font-montserrat">{msg.dish}</h3>
                  
                  {/* Ingredients Table */}
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                    <h4 className="font-bold mb-3 border-b pb-2">Ingredients & Estimated Costs</h4>
                    <ul className="space-y-2">
                      {msg.ingredients.map((ing, i) => (
                        <li key={i} className="flex justify-between text-sm items-center">
                          <span className="capitalize">{ing.name}</span>
                          
                          {/* Price Tag Logic */}
                          {ing.supermarket_data ? (
                             <span className="bg-green-100 text-green-800 px-2 py-1 rounded font-mono text-xs font-bold">
                               {ing.supermarket_data.price}
                             </span>
                          ) : (
                             <span className="text-gray-400 text-xs italic">Check Store</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Instructions */}
                  <div>
                    <h4 className="font-bold mb-1">Instructions</h4>
                    <p className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap">{msg.instructions}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start animate-pulse">
             <div className="bg-gray-200 text-gray-500 px-4 py-2 rounded-2xl text-sm font-bold">
               Opticart is thinking...
             </div>
          </div>
        )}
      </div>

      {/* --- INPUT AREA --- */}
      <div className="fixed bottom-0 w-full bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex space-x-4">
          <input 
            type="text" 
            className="flex-1 p-4 border border-gray-300 rounded-xl focus:outline-none focus:border-temporary-turqoise font-manrope text-lg"
            placeholder="Type a meal (e.g. 'Spaghetti')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={isLoading}
          />
          <button 
            onClick={sendMessage} 
            disabled={isLoading}
            className={`px-8 py-3 rounded-xl font-bold text-white font-montserrat transition-all ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-temporary-turqoise hover:opacity-90'
            }`}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
    </>
  )
}

export default ChatWindow