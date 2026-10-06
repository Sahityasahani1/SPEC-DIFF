import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUp, Zap, Sparkles, Trash2, ShoppingBag, ExternalLink, Tag, ShieldCheck } from 'lucide-react';
import { sendCopilotMessage } from '../services/api';

// Helper to format markdown text into JSX
function FormattedMessage({ text }) {
  if (!text) return null;

  const lines = text.split('\n');

  return (
    <div className="space-y-1.5 text-xs leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Horizontal rule
        if (trimmed === '---') {
          return <hr key={idx} className="my-2 border-[#e2dfd5]" />;
        }

        // Headers
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-bold text-sm text-forest-950 mt-2.5 mb-1 flex items-center gap-1.5">
              <span>{trimmed.replace('### ', '')}</span>
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="font-bold text-sm text-forest-950 mt-3 mb-1 border-b border-sage-500/20 pb-0.5">
              {trimmed.replace('## ', '')}
            </h3>
          );
        }

        // Bullet lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1.5 my-0.5">
              <span className="text-sage-600 font-bold">•</span>
              <span className="flex-1">{parseInlineStyles(content)}</span>
            </div>
          );
        }

        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1.5 my-0.5">
              <span className="font-mono font-bold text-sage-600">{numMatch[1]}.</span>
              <span className="flex-1">{parseInlineStyles(numMatch[2])}</span>
            </div>
          );
        }

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Regular paragraph
        return (
          <p key={idx} className="leading-relaxed">
            {parseInlineStyles(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

// Parses bold (**text**) and code (`text`) inline styles
function parseInlineStyles(str) {
  if (!str) return '';
  // Split on bold **
  const parts = str.split(/(\*\*.*?\*\*|`.*?`)/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      // Highlight INR pricing specifically
      if (boldText.includes('₹')) {
        return (
          <strong key={i} className="font-bold text-emerald-800 bg-emerald-100/60 px-1 py-0.5 rounded">
            {boldText}
          </strong>
        );
      }
      return <strong key={i} className="font-bold text-forest-950">{boldText}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="bg-porcelain-200 text-forest-900 font-mono text-[10px] px-1 py-0.5 rounded">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function AICopilotDrawer({ 
  activeProductIds, 
  isOpen: controlledIsOpen, 
  onToggle: controlledOnToggle,
  onAddToCart,
  hasBottomDock = false
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalOpen;
  
  const setIsOpen = (val) => {
    if (controlledOnToggle) {
      const nextVal = typeof val === 'function' ? val(isOpen) : val;
      controlledOnToggle(nextVal);
    } else {
      setInternalOpen(val);
    }
  };

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState([
    "🔥 Best coding laptop under ₹80k",
    "📸 Which phone has the craziest camera?",
    "⚡ High-FPS gaming rig with cold thermals",
    "🎧 Headphones with god-tier ANC",
    "🥊 Compare MacBook Air M3 vs ThinkPad",
    "🏷️ Where can I find the best deal right now?"
  ]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isLoading]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSend = async (text) => {
    const query = text || inputValue.trim();
    if (!query) return;

    setInputValue('');
    const userMsg = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await sendCopilotMessage({
        query,
        active_product_ids: activeProductIds || [],
        history: messages
      });
      
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: response.reply,
          relevant_products: response.relevant_products || []
        }
      ]);
      
      if (response.suggested_prompts && response.suggested_prompts.length > 0) {
        setSuggestedPrompts(response.suggested_prompts);
      }
    } catch (error) {
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: "Plug hit a snag. The local hardware database is active—try asking about laptops, phones, gaming rigs, or store deals!",
          relevant_products: []
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setSuggestedPrompts([
      "🔥 Best coding laptop under ₹80k",
      "📸 Which phone has the craziest camera?",
      "⚡ High-FPS gaming rig with cold thermals",
      "🎧 Headphones with god-tier ANC",
      "🥊 Compare MacBook Air M3 vs ThinkPad",
      "🏷️ Where can I find the best deal right now?"
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button: "🔌 Ask SpecPlug" */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed ${
          hasBottomDock ? 'bottom-24 sm:bottom-28 lg:bottom-6' : 'bottom-6'
        } right-4 sm:right-6 z-40 bg-forest-900 text-white rounded-full px-4 py-3 sm:py-3.5 shadow-2xl flex items-center gap-2 border border-sage-500/30 hover:border-sage-400 transition-all ${
          isOpen ? 'hidden' : 'flex'
        }`}
        title="Open SpecPlug AI Hardware Advisor"
      >
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-base">🔌</span>
        <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">Ask SpecPlug</span>
      </motion.button>

      {/* Drawer Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 440 }}
            animate={{ x: 0 }}
            exit={{ x: 440 }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="fixed top-16 right-0 bottom-0 w-full max-w-[430px] bg-white border-l border-[#e8e5dc] shadow-2xl z-50 flex flex-col font-jakarta"
          >
            {/* Header with SpecPlug Persona Branding */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#e8e5dc] bg-[#f7f5ef]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-forest-900 text-white flex items-center justify-center text-lg shadow-sm">
                  🔌
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-forest-950 font-jakarta tracking-tight">SpecPlug</span>
                    <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded-full border border-emerald-300">
                      LIVE
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-forest-900/60 tracking-tight">
                    Your Hardware Plug • No Cap, Only Specs
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button 
                    onClick={handleClearChat}
                    title="Clear Conversation"
                    className="p-1.5 hover:bg-porcelain-200 rounded-lg text-forest-900/60 hover:text-rose-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => setIsOpen(false)} 
                  title="Close Drawer (Esc)"
                  className="p-1.5 hover:bg-porcelain-200 rounded-lg text-forest-900/60 hover:text-forest-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-[#fcfbf9]">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-4">
                  <div className="w-14 h-14 rounded-2xl bg-forest-900 text-white flex items-center justify-center text-2xl mb-3 shadow-lg shadow-forest-900/10">
                    🔌
                  </div>
                  <h3 className="text-xl font-bold text-forest-950 tracking-tight mb-1">
                    Yo! I'm SpecPlug.
                  </h3>
                  <p className="text-xs text-forest-900/70 mb-6 max-w-xs leading-relaxed">
                    Zero marketing fluff, real Indian street prices (₹), and side-by-side spec breakdowns. What are we buying or building today?
                  </p>
                  
                  <div className="flex flex-col gap-2 w-full">
                    <p className="font-mono text-[10px] uppercase tracking-wider text-forest-900/50 text-left font-bold mb-0.5">
                      🔥 POPULAR HARDWARE QUERIES:
                    </p>
                    {suggestedPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt)}
                        className="text-left text-xs bg-white hover:bg-porcelain-100 border border-[#e3dfd4] hover:border-sage-400 p-2.5 rounded-xl text-forest-900 transition-all shadow-2xs font-medium"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} gap-1.5`}>
                      {/* Avatar / Sender tag */}
                      <span className="font-mono text-[10px] text-forest-900/50 uppercase tracking-wider px-1">
                        {msg.role === 'user' ? 'You' : '🔌 SpecPlug'}
                      </span>

                      {/* Main Message Bubble */}
                      <div className={`max-w-[92%] ${
                        msg.role === 'user' 
                          ? 'bg-forest-900 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-sm' 
                          : 'bg-white text-forest-900 rounded-2xl rounded-tl-xs px-4 py-3.5 border border-[#e5e1d6] shadow-xs'
                      }`}>
                        {msg.role === 'user' ? (
                          <p className="text-xs leading-relaxed font-medium">{msg.content}</p>
                        ) : (
                          <FormattedMessage text={msg.content} />
                        )}
                      </div>

                      {/* Mini Interactive Hardware Product Cards from SpecPlug */}
                      {msg.role === 'assistant' && msg.relevant_products && msg.relevant_products.length > 0 && (
                        <div className="w-full mt-2 space-y-2">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-forest-900/50 font-bold px-1">
                            📦 Matching Hardware ({msg.relevant_products.length}):
                          </p>
                          <div className="space-y-2">
                            {msg.relevant_products.map((prod, pIdx) => {
                              const bestDealStore = prod.best_deal_store || 'Amazon India';
                              const formattedBestPrice = prod.formatted_best_price || prod.formatted_price;
                              const savings = prod.savings_vs_highest || 0;

                              return (
                                <div 
                                  key={pIdx} 
                                  className="bg-white rounded-xl p-3 border border-[#dfdbcf] shadow-2xs hover:border-sage-400 transition-all flex flex-col gap-2"
                                >
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1 min-w-0">
                                      <h5 className="font-bold text-xs text-forest-950 truncate" title={prod.name}>
                                        {prod.name}
                                      </h5>
                                      <p className="text-[10px] font-mono text-forest-900/60 truncate">
                                        {prod.processor} • {prod.ram_gb ? `${prod.ram_gb}GB RAM` : ''} {prod.storage_gb ? `• ${prod.storage_gb}GB` : ''}
                                      </p>
                                    </div>
                                    <span className="font-mono font-black text-xs text-forest-950 whitespace-nowrap">
                                      {prod.formatted_price}
                                    </span>
                                  </div>

                                  {/* Store Deal Callout */}
                                  <div className="bg-[#f5f9f5] border border-[#d6ebd6] rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px]">
                                    <div className="flex items-center gap-1.5 text-emerald-800">
                                      <Tag className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span className="font-medium truncate">
                                        Best Deal: <strong>{bestDealStore}</strong> at {formattedBestPrice}
                                      </span>
                                    </div>
                                    {savings > 0 && (
                                      <span className="font-mono text-[9px] font-bold text-emerald-700 bg-emerald-200/50 px-1.5 py-0.5 rounded shrink-0">
                                        Save ₹{savings.toLocaleString()}
                                      </span>
                                    )}
                                  </div>

                                  {/* Action Buttons: Add to Cart & View Deal */}
                                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#f0ece2]">
                                    <button
                                      type="button"
                                      onClick={() => onAddToCart && onAddToCart(prod)}
                                      className="flex-1 py-1.5 px-3 rounded-lg bg-sage-500 hover:bg-sage-600 text-forest-950 font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                    >
                                      <ShoppingBag className="w-3 h-3" />
                                      <span>+ Add to Cart</span>
                                    </button>

                                    {prod.product_url && (
                                      <a
                                        href={prod.product_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="py-1.5 px-3 rounded-lg bg-forest-900 hover:bg-forest-800 text-white font-bold text-[10px] uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                                      >
                                        <span>Deal</span>
                                        <ExternalLink className="w-2.5 h-2.5 text-sage-300" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && (
                    <div className="flex flex-col items-start gap-1">
                      <span className="font-mono text-[10px] text-forest-900/50 uppercase tracking-wider px-1">
                        🔌 SpecPlug is thinking...
                      </span>
                      <div className="bg-white border border-[#e5e1d6] text-forest-900 rounded-2xl rounded-tl-xs px-4 py-3 flex gap-1.5 items-center shadow-xs">
                        <div className="w-2 h-2 rounded-full bg-forest-900/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 rounded-full bg-forest-900/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 rounded-full bg-forest-900/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}

                  {!isLoading && messages[messages.length - 1]?.role === 'assistant' && suggestedPrompts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {suggestedPrompts.map((prompt, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(prompt)}
                          className="text-[10px] font-medium bg-white hover:bg-porcelain-100 border border-[#e0dcce] hover:border-sage-400 px-3 py-1.5 rounded-full text-forest-900 transition-all whitespace-nowrap shadow-2xs"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-[#e8e5dc] bg-white">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask SpecPlug (e.g. Best coding laptop under 80k?)..."
                  className="w-full bg-[#f6f5f0] border border-[#e5e1d6] rounded-full pl-4 pr-12 py-3 text-xs focus:outline-none focus:border-sage-500 focus:bg-white text-forest-950 placeholder:text-forest-900/40 transition-colors font-medium"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!inputValue.trim() || isLoading}
                  className="absolute right-1.5 top-1.5 bottom-1.5 aspect-square bg-forest-900 hover:bg-forest-800 disabled:bg-porcelain-300 disabled:text-forest-900/30 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                  title="Send message"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
