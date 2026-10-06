import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Monitor, Smartphone, Watch, Headphones, Laptop } from 'lucide-react';
import { getProducts } from '../services/api';

export default function CommandPalette({ isOpen, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedIndex(0);
      setIsLoading(true);
      getProducts({ limit: 200 }).then(data => {
        setProducts(data.products || []);
        setIsLoading(false);
      }).catch(() => setIsLoading(false));
      
      // small delay to allow animation to start before focus
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  const getCategoryIcon = (category) => {
    const c = (category || '').toLowerCase();
    if (c.includes('phone')) return <Smartphone className="w-4 h-4" />;
    if (c.includes('watch')) return <Watch className="w-4 h-4" />;
    if (c.includes('audio') || c.includes('headphone')) return <Headphones className="w-4 h-4" />;
    if (c.includes('monitor')) return <Monitor className="w-4 h-4" />;
    return <Laptop className="w-4 h-4" />;
  };

  const filteredResults = products.filter(p => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (p.name || '').toLowerCase().includes(query) || 
           (p.brand || '').toLowerCase().includes(query) ||
           (p.category || '').toLowerCase().includes(query) ||
           (p.processor || '').toLowerCase().includes(query);
  }).slice(0, 15); // limit to 15 results

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        // Just close for now, parent can handle selection if needed
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-2xl shadow-2xl border border-[#e8e5dc] overflow-hidden w-full max-w-2xl relative z-10 mx-4"
          >
            <div className="flex items-center px-5 py-4 border-b border-[#e8e5dc]">
              <Search className="w-6 h-6 text-forest-900/40 mr-3" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search products..."
                className="flex-1 text-lg font-jakarta outline-none bg-transparent placeholder-forest-900/30 text-forest-950"
              />
              <span className="text-[10px] font-mono border border-[#e8e5dc] rounded px-1.5 py-0.5 text-forest-900/40 bg-porcelain-50">Esc</span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {isLoading ? (
                <div className="p-8 text-center text-forest-900/50 text-sm">Loading products...</div>
              ) : filteredResults.length > 0 ? (
                <div className="py-2">
                  <div className="px-5 py-2 font-mono text-[10px] uppercase tracking-widest text-forest-900/50 bg-porcelain-50">
                    Results
                  </div>
                  <ul>
                    {filteredResults.map((product, idx) => (
                      <li 
                        key={product.product_id || idx}
                        className={`px-5 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                          idx === selectedIndex ? 'bg-sage-500/20 border-l-2 border-sage-500' : 'hover:bg-porcelain-100 border-l-2 border-transparent'
                        }`}
                        onClick={() => onClose()}
                        onMouseEnter={() => setSelectedIndex(idx)}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-[#e8e5dc] text-forest-900">
                            {getCategoryIcon(product.category)}
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="font-bold text-sm text-forest-950 truncate">{product.name}</span>
                            <span className="text-xs text-forest-900/60 font-mono">{product.brand}</span>
                          </div>
                        </div>
                        <span className="font-mono text-sm font-bold text-forest-900 shrink-0 ml-4">
                          {product.formatted_price}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-8 text-center text-forest-900/50 text-sm">No products found</div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
