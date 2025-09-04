import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, CornerDownLeft, Loader2, AlertTriangle } from 'lucide-react';

// --- Type Definitions for Clarity ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

// --- Mock API Function (Replace with your actual fetch call) ---
// This simulates the call to your Supabase Edge Function.
const getBotResponse = async (userMessage: string, userAuthToken: string): Promise<string> => {
  // In a real app, you would use the userAuthToken to authenticate the request
  console.log("Sending to backend:", { message: userMessage, token: userAuthToken });

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mocking the "Intent and Parameter" logic from our previous discussion
  const lowerCaseMessage = userMessage.toLowerCase();
  
  if (lowerCaseMessage.includes("high priority tasks")) {
    return "Okay, fetching your high priority tasks. It looks like you have 3 critical items:\n\n* **Finalize Q4 chef acquisition targets** (Due: Tomorrow)\n* **Review legal docs for Rotterdam expansion** (Due: Friday)\n* **Deploy v1.2 of the Chef Onboarding App** (Due: Next Monday)";
  } else if (lowerCaseMessage.includes("city expansion")) {
    return "The 'City Expansion' project is currently 75% complete. The main remaining blocker is the legal review for the Rotterdam delivery zone.";
  } else if (lowerCaseMessage.includes("onboarding")) {
    return "There are currently 5 chefs in the onboarding pipeline. 3 are in the 'Kitchen Inspection' phase and 2 are in 'Profile Setup'.";
  } else {
    return "I'm sorry, I'm not sure how to help with that. You can ask me about your tasks, the status of a project, or about the chef onboarding pipeline.";
  }
  
  // Example of a real fetch call:
  /*
  const response = await fetch('/api/internal-chatbot', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${userAuthToken}`
    },
    body: JSON.stringify({ message: userMessage })
  });

  if (!response.ok) {
    throw new Error('Failed to get a response from the assistant.');
  }

  const data = await response.json();
  return data.reply;
  */
};


// --- The Main Chatbot Component ---
export const InternalChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: "Hi there! I'm your Homemade internal assistant. How can I help you track your work today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Effect to scroll to the bottom of the message list when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // NOTE: In a real app, you would get the actual user auth token here.
      const MOCK_AUTH_TOKEN = 'your-supabase-jwt-here'; 
      
      const botResponseContent = await getBotResponse(userMessage.content, MOCK_AUTH_TOKEN);
      
      const botMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: botResponseContent,
      };
      setMessages((prev) => [...prev, botMessage]);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSuggestionClick = (suggestion: string) => {
      setInput(suggestion);
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col h-[70vh] w-full max-w-lg mx-auto font-sans">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Internal Assistant</h2>
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Online"></div>
      </div>

      {/* Message Display Area */}
      <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
        <div className="space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 bg-homemade-orange text-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={20} />
                </div>
              )}
              <div 
                className={`max-w-xs md:max-w-md p-3 rounded-lg text-sm whitespace-pre-wrap ${
                  msg.role === 'user' 
                    ? 'bg-blue-500 text-white rounded-br-none' 
                    : 'bg-gray-200 text-gray-800 rounded-bl-none'
                }`}
              >
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 bg-gray-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                  <User size={20} />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
               <div className="w-8 h-8 bg-homemade-orange text-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot size={20} />
                </div>
              <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-gray-200 text-gray-800 rounded-bl-none flex items-center space-x-2">
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Suggestion Chips */}
       {!isLoading && messages.length <= 2 && (
         <div className="p-4 border-t border-gray-200 bg-white">
            <p className="text-xs text-gray-500 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
                <SuggestionChip onClick={() => handleSuggestionClick("What are my high priority tasks?")} />
                <SuggestionChip text="How is the City Expansion project?" onClick={() => handleSuggestionClick("How is the City Expansion project going?")} />
                <SuggestionChip text="Chef onboarding status" onClick={() => handleSuggestionClick("What is the chef onboarding status?")} />
            </div>
         </div>
       )}

      {/* Input Form */}
      <div className="p-4 border-t border-gray-200 bg-white">
         {error && (
            <div className="mb-2 flex items-center gap-2 text-sm text-red-600">
                <AlertTriangle size={16} />
                <p>Error: {error}</p>
            </div>
          )}
        <form onSubmit={handleSubmit} className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your tasks, projects, or data..."
            className="flex-1 px-4 py-2 text-sm bg-gray-100 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-homemade-orange-dark"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-full bg-homemade-orange text-white disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-homemade-orange-dark transition-colors focus:outline-none focus:ring-2 focus:ring-homemade-orange-dark"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <CornerDownLeft size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
};

// --- Helper component for suggestion chips ---
const SuggestionChip = ({ text, onClick }: { text?: string; onClick: () => void }) => (
    <button onClick={onClick} className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors">
        {text || "What are my high priority tasks?"}
    </button>
)

// Define some CSS variables if they are not globally available
// This is useful for making the component self-contained.
const style = document.createElement('style');
style.innerHTML = `
  :root {
    --homemade-orange: #F97316;
    --homemade-orange-dark: #EA580C;
  }
  .bg-homemade-orange { background-color: var(--homemade-orange); }
  .hover\\:bg-homemade-orange-dark:hover { background-color: var(--homemade-orange-dark); }
  .focus\\:ring-homemade-orange-dark:focus { --tw-ring-color: var(--homemade-orange-dark); }
`;
document.head.appendChild(style);

