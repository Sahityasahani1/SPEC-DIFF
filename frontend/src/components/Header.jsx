import React from 'react';
import { Laptop, Layers, Search, Sparkles, ShoppingBag } from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  healthData, 
  selectedCompareCount = 0, 
  onOpenCompare, 
  onOpenCommandPalette, 
  onToggleCopilot,
  onOpenSearch,
  cartCount = 0,
  onOpenCart
}) {
  return (
    <header className="sticky top-0 z-50 bg-forest-900/90 backdrop-blur-md border-b border-white/10 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo matching LOFY from Reference Image */}
          <div 
            className="flex items-center space-x-2.5 cursor-pointer group" 
            onClick={() => setActiveTab('recommend')}
          >
            <div className="flex items-center space-x-1">
              <span className="font-spartan font-black text-2xl sm:text-3xl tracking-tighter text-white group-hover:text-sage-400 transition-colors">
                SPEC<span className="text-sage-400">DIFF</span>
              </span>
              <span className="w-2 h-4 rounded-full bg-sage-500 inline-block ml-1 opacity-90"></span>
            </div>
          </div>

          {/* Clean Navigation Links matching Reference Image */}
          <nav className="hidden md:flex items-center space-x-8 text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
            <button
              onClick={() => setActiveTab('recommend')}
              className={`transition-colors py-1 relative ${
                activeTab === 'recommend' ? 'text-white' : 'hover:text-white'
              }`}
            >
              <span>Configurator</span>
              {activeTab === 'recommend' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sage-400 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('recommend')}
              className="hover:text-white transition-colors py-1"
            >
              <span>Collection</span>
            </button>

            <button
              onClick={() => setActiveTab('catalog')}
              className={`transition-colors py-1 relative ${
                activeTab === 'catalog' ? 'text-white' : 'hover:text-white'
              }`}
            >
              <span>Catalog</span>
              {activeTab === 'catalog' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sage-400 rounded-full" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`transition-colors py-1 relative ${
                activeTab === 'admin' ? 'text-white' : 'hover:text-white'
              }`}
            >
              <span>Admin</span>
              {activeTab === 'admin' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-sage-400 rounded-full" />
              )}
            </button>
          </nav>

          {/* Right: Country Tag, Search, Copilot, Cart & Compare Pill Buttons */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="hidden xl:flex items-center space-x-2 text-[11px] font-mono uppercase text-white/60 tracking-wider">
              <span>🇮🇳 INDIA</span>
              <span>•</span>
              <span>VERIFIED STREET PRICES</span>
            </div>

            {/* Instant Search Engine Button */}
            <button
              onClick={onOpenSearch}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white text-xs tracking-wider uppercase transition-all cursor-pointer"
              title="Instant Search Engine (1,000+ Products)"
            >
              <Search className="w-3.5 h-3.5 text-sage-400" />
              <span className="font-semibold text-xs hidden sm:inline">Search</span>
            </button>

            {/* SpecPlug AI Button */}
            <button
              onClick={onToggleCopilot}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-sage-500/20 text-sage-300 hover:bg-sage-500/30 hover:text-sage-200 text-xs tracking-wider uppercase transition-all cursor-pointer"
              title="Open SpecPlug AI Hardware Plug"
            >
              <span className="text-xs">🔌</span>
              <span className="hidden sm:inline font-mono text-[10px] font-bold">SpecPlug</span>
            </button>

            {/* Shopping Cart Pill Button matching LOFY Style */}
            <button
              onClick={onOpenCart}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-sage-500 hover:bg-sage-400 text-forest-950 font-bold text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
              title="Open Shopping Cart Drawer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>CART{cartCount > 0 ? ` (${cartCount})` : ''}</span>
            </button>

            {/* Compare Pill Button from Reference */}
            <button
              onClick={onOpenCompare}
              className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-full bg-white text-forest-900 hover:bg-sage-400 hover:text-forest-950 font-bold text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">COMPARE</span>
              <span className="sm:hidden">DIFF</span>
              {selectedCompareCount > 0 ? ` (${selectedCompareCount})` : ''}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
