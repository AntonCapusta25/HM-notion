import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, CornerDownLeft, Loader2, AlertTriangle, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

// --- Type Definitions ---
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: {
    task_created?: string;
    query_executed?: string;
    intent?: string;
  };
}

interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

interface TaskCreationContext {
  step: 'title' | 'assignee' | 'description' | 'due_date' | 'priority' | 'confirmation' | 'completed';
  data: {
    title?: string;
    assignee_id?: string;
    assignee_name?: string;
    description?: string;
    due_date?: string;
    priority?: 'low' | 'medium' | 'high';
  };
}

// --- Enhanced API Functions ---
const chatbotAPI = {
  // Send message to intelligent backend
  sendMessage: async (message: string, sessionId: string, userAuthToken: string): Promise<{
    response: string;
    intent?: string;
    task_created?: any;
    query_result?: any;
  }> => {
    const response = await fetch('https://wqpmhnsxqcsplfdyxrih.supabase.co/functions/v1/chatbot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAuthToken}`
      },
      body: JSON.stringify({
        message,
        session_id: sessionId,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to get response from chatbot');
    }

    return response.json();
  },

  // Load conversation history
  loadSession: async (sessionId: string, userAuthToken: string): Promise<ChatSession | null> => {
    const response = await fetch(`https://wqpmhnsxqcsplfdyxrih.supabase.co/functions/v1/chatbot/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${userAuthToken}`
      }
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to load session');

    return response.json();
  },

  // Get all user sessions
  getUserSessions: async (userAuthToken: string): Promise<ChatSession[]> => {
    const response = await fetch('https://wqpmhnsxqcsplfdyxrih.supabase.co/functions/v1/chatbot/sessions', {
      headers: {
        'Authorization': `Bearer ${userAuthToken}`
      }
    });

    if (!response.ok) throw new Error('Failed to load sessions');
    return response.json();
  },

  // Create new session
  createSession: async (userAuthToken: string): Promise<ChatSession> => {
    const response = await fetch('https://wqpmhnsxqcsplfdyxrih.supabase.co/functions/v1/chatbot/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userAuthToken}`
      },
      body: JSON.stringify({
        title: `Chat ${new Date().toLocaleDateString()}`
      })
    });

    if (!response.ok) throw new Error('Failed to create session');
    return response.json();
  },

  // Delete session
  deleteSession: async (sessionId: string, userAuthToken: string): Promise<void> => {
    const response = await fetch(`/api/chatbot/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${userAuthToken}`
      }
    });

    if (!response.ok) throw new Error('Failed to delete session');
  }
};

// --- Enhanced Chatbot Component ---
export const EnhancedChatbot = ({ userAuthToken, userId }: { userAuthToken: string; userId: string }) => {
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(false);
  const [taskContext, setTaskContext] = useState<TaskCreationContext | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load sessions on mount
  useEffect(() => {
    loadUserSessions();
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (currentSession) {
      setMessages(currentSession.messages || []);
    }
  }, [currentSession]);

  const loadUserSessions = async () => {
    try {
      const userSessions = await chatbotAPI.getUserSessions(userAuthToken);
      setSessions(userSessions);
      
      // Load most recent session or create new one
      if (userSessions.length > 0) {
        const latest = userSessions[0];
        setCurrentSession(latest);
      } else {
        await createNewSession();
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      await createNewSession();
    }
  };

  const createNewSession = async () => {
    try {
      const newSession = await chatbotAPI.createSession(userAuthToken);
      setCurrentSession(newSession);
      setSessions(prev => [newSession, ...prev]);
      setMessages([{
        id: 'init-1',
        role: 'assistant',
        content: "Hi! I'm your intelligent assistant. I can help you:\n\n• Create and manage tasks\n• Find information from your workspace\n• Calculate productivity metrics\n• Answer questions about your work\n\nWhat would you like to do today?",
        timestamp: new Date().toISOString()
      }]);
    } catch (err) {
      setError('Failed to create new session');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !currentSession) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const result = await chatbotAPI.sendMessage(
        userMessage.content, 
        currentSession.id, 
        userAuthToken
      );
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.response,
        timestamp: new Date().toISOString(),
        metadata: {
          intent: result.intent,
          task_created: result.task_created,
          query_executed: result.query_result ? 'executed' : undefined
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle task creation context
      if (result.intent === 'task_creation_in_progress') {
        // Backend will maintain the task creation state
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const switchToSession = async (sessionId: string) => {
    try {
      const session = await chatbotAPI.loadSession(sessionId, userAuthToken);
      if (session) {
        setCurrentSession(session);
        setShowSessions(false);
      }
    } catch (err) {
      setError('Failed to load session');
    }
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;

    try {
      await chatbotAPI.deleteSession(sessionId, userAuthToken);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (currentSession?.id === sessionId) {
        if (sessions.length > 1) {
          const remaining = sessions.filter(s => s.id !== sessionId);
          setCurrentSession(remaining[0]);
        } else {
          await createNewSession();
        }
      }
    } catch (err) {
      setError('Failed to delete session');
    }
  };

  const getSmartSuggestions = () => {
    if (messages.length <= 1) {
      return [
        "Create a task for Alex to do outreach",
        "What tasks did the team complete last week?",
        "Show team productivity metrics",
        "Who has the most overdue tasks?",
        "What is Sarah working on this week?",
        "Show all high priority tasks across the team"
      ];
    }
    return [];
  };

  if (!currentSession) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-xl flex items-center justify-center h-[70vh] w-full max-w-lg mx-auto">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">Loading your conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col h-[70vh] w-full max-w-lg mx-auto font-sans">
      {/* Header with Session Management */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-800">AI Assistant</h2>
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" title="Online"></div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSessions(!showSessions)}
            title="Conversation History"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={createNewSession}
            title="New Conversation"
          >
            <Bot className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Session Selector */}
      {showSessions && (
        <div className="border-b border-gray-200 bg-gray-50 max-h-32 overflow-y-auto">
          <div className="p-2 space-y-1">
            {sessions.map(session => (
              <div
                key={session.id}
                onClick={() => switchToSession(session.id)}
                className={`flex items-center justify-between p-2 rounded cursor-pointer hover:bg-gray-100 ${
                  currentSession?.id === session.id ? 'bg-blue-100' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{session.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => deleteSession(session.id, e)}
                  className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

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
                {msg.metadata?.task_created && (
                  <div className="mt-2 text-xs text-green-600 bg-green-50 p-2 rounded">
                    ✓ Task created successfully
                  </div>
                )}
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
      
      {/* Smart Suggestions */}
      {!isLoading && getSmartSuggestions().length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <p className="text-xs text-gray-500 mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {getSmartSuggestions().map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1 text-xs text-blue-600 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors"
              >
                {suggestion}
              </button>
            ))}
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
            placeholder="Ask me anything about your work..."
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

// CSS variables (same as before)
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
