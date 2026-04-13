import React, { useState, useRef, useEffect } from 'react';
import { Send, Scale, Info, MessageSquare, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { cn } from './lib/utils';
import { chatWithGeminiStream } from './services/geminiService';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      content: "Bonjour ! Je suis votre assistant spécialisé sur le **Code du Travail du Sénégal**. Comment puis-je vous aider aujourd'hui ?"
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Add an empty model message that we will populate via streaming
    const modelMessageIndex = newMessages.length;
    setMessages(prev => [...prev, { role: 'model', content: '' }]);

    try {
      const stream = chatWithGeminiStream(newMessages);
      let fullContent = '';
      
      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => {
          const updated = [...prev];
          updated[modelMessageIndex] = { role: 'model', content: fullContent };
          return updated;
        });
      }
    } catch (error) {
      setMessages(prev => {
        const updated = [...prev];
        updated[modelMessageIndex] = { role: 'model', content: "Désolé, une erreur est survenue." };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'model',
        content: "Bonjour ! Je suis votre assistant spécialisé sur le **Code du Travail du Sénégal**. Comment puis-je vous aider aujourd'hui ?"
      }
    ]);
  };

  return (
    <div className="flex flex-col h-screen bg-[#f5f5f5] font-sans text-gray-900" id="app-container">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm" id="app-header">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg text-white">
            <Scale size={24} />
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-tight">Sénégal Travail Bot</h1>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Expertise Juridique</p>
          </div>
        </div>
        <button 
          onClick={clearChat}
          className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
          title="Effacer la conversation"
          id="clear-chat-btn"
        >
          <Trash2 size={20} />
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6" id="chat-messages">
        <div className="max-w-3xl mx-auto space-y-6">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(
                  "flex flex-col max-w-[85%] md:max-w-[75%]",
                  msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                )}
                id={`message-${idx}`}
              >
                <div className={cn(
                  "px-4 py-3 rounded-2xl shadow-sm",
                  msg.role === 'user' 
                    ? "bg-emerald-600 text-white rounded-tr-none" 
                    : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                )}>
                  <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-strong:text-inherit">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-2 uppercase font-semibold tracking-tighter">
                  {msg.role === 'user' ? 'Vous' : 'Assistant'}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-gray-400 text-sm italic"
              id="loading-indicator"
            >
              <Loader2 size={16} className="animate-spin" />
              L'expert analyse le Code du Travail...
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-gray-200 p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]" id="app-footer">
        <div className="max-w-3xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Send' || e.key === 'Enter' ? handleSend() : null}
            placeholder="Posez votre question sur le droit du travail..."
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 pr-14 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
            id="user-input"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 transition-all shadow-md"
            id="send-btn"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-center text-gray-400 mt-3 flex items-center justify-center gap-1">
          <Info size={10} />
          Cet assistant se base sur le Code du Travail du Sénégal. Consultez un expert pour des avis officiels.
        </p>
      </footer>
    </div>
  );
}
