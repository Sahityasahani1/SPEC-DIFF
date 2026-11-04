import React from 'react';
import { Laptop, Layers, Search, Sparkles, ShoppingBag, Bookmark, Bell, Sliders, ShieldCheck } from 'lucide-react';

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
  onOpenCart,
  watchlistCount = 0,
  alertCount = 0,
  onOpenWatchlist
}) {
  return (
    <>
      <header className="sticky top-0 z-50 bg-forest-900/90 backdrop-blur-md border-b border-white/10 text-white">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand Logo matching LOFY from Reference Image */}
            <div 
              className="flex items-center space-x-2 cursor-pointer group" 
              onClick={() => setActiveTab('recommend')}
            >
              <div className="flex items-center space-x-1">
                <span className="font-spartan font-black text-xl sm:text-3xl tracking-tighter text-white group-hover:text-sage-400 transition-colors">
                  SPEC<span className="text-sage-400">DIFF</span>
                </span>
                <span className="w-1.5 sm:w-2 h-3 sm:h-4 rounded-full bg-sage-500 inline-block ml-1 opacity-90"></span>
              </div>
            </div>

            {/* Clean Desktop Navigation Links */}
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
            <div className="flex items-center space-x-1.5 sm:space-x-3">
              <div className="hidden xl:flex items-center space-x-2 text-[11px] font-mono uppercase text-white/60 tracking-wider">
                <span>🇮🇳 INDIA</span>
                <span>•</span>
                <span>VERIFIED STREET PRICES</span>
              </div>

              {/* Instant Search Engine Button */}
              <button
                onClick={onOpenSearch}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] sm:min-h-[38px] rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white text-xs tracking-wider uppercase transition-all cursor-pointer"
                title="Instant Search Engine (1,000+ Products)"
              >
                <Search className="w-3.5 h-3.5 text-sage-400" />
                <span className="font-semibold text-xs hidden sm:inline">Search</span>
              </button>

              {/* SpecPlug AI Button */}
              <button
                onClick={onToggleCopilot}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3 py-1.5 min-h-[36px] sm:min-h-[38px] rounded-full bg-sage-500/20 text-sage-300 hover:bg-sage-500/30 hover:text-sage-200 text-xs tracking-wider uppercase transition-all cursor-pointer"
                title="Open SpecPlug AI Hardware Plug"
              >
                <span className="text-xs">🔌</span>
                <span className="hidden sm:inline font-mono text-[10px] font-bold">SpecPlug</span>
              </button>

              {/* Hardware Stash & Alerts Pill (Desktop & Tablet) */}
              <button
                onClick={onOpenWatchlist}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 min-h-[38px] rounded-full bg-white/10 hover:bg-white/20 text-white text-xs tracking-wider uppercase transition-all cursor-pointer relative"
                title="Hardware Stash & Price Drop Alerts"
              >
                <Bookmark className="w-3.5 h-3.5 text-sage-400" />
                <span className="font-semibold text-xs">STASH</span>
                {watchlistCount > 0 && (
                  <span className="font-mono text-[10px] font-bold bg-emerald-400 text-forest-950 px-1.5 py-0.2 rounded-full">
                    {watchlistCount}
                  </span>
                )}
                {alertCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                )}
              </button>

              {/* Shopping Cart Pill Button */}
              <button
                onClick={onOpenCart}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 min-h-[36px] sm:min-h-[38px] rounded-full bg-sage-500 hover:bg-sage-400 text-forest-950 font-bold text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
                title="Open Shopping Cart Drawer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>CART{cartCount > 0 ? ` (${cartCount})` : ''}</span>
              </button>

              {/* Compare Pill Button */}
              <button
                onClick={onOpenCompare}
                className="flex items-center space-x-1 sm:space-x-1.5 px-2.5 sm:px-3.5 py-1.5 min-h-[36px] sm:min-h-[38px] rounded-full bg-white text-forest-900 hover:bg-sage-400 hover:text-forest-950 font-bold text-xs tracking-wider uppercase transition-all shadow-sm cursor-pointer"
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

      {/* Mobile Bottom Navigation Bar (Screens < md) with thumb-ergonomic 48px targets */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-forest-950/95 backdrop-blur-xl border-t border-white/10 md:hidden flex items-center justify-around h-16 px-1 text-white/70 safe-area-bottom">
        <button
          onClick={() => setActiveTab('recommend')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[48px] transition-colors cursor-pointer ${
            activeTab === 'recommend' ? 'text-sage-400 font-bold' : 'hover:text-white'
          }`}
        >
          <Sliders className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-wider uppercase">Config</span>
          {activeTab === 'recommend' && (
            <span className="w-1 h-1 rounded-full bg-sage-400 mt-0.5" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[48px] transition-colors cursor-pointer ${
            activeTab === 'catalog' ? 'text-sage-400 font-bold' : 'hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-wider uppercase">Catalog</span>
          {activeTab === 'catalog' && (
            <span className="w-1 h-1 rounded-full bg-sage-400 mt-0.5" />
          )}
        </button>

        <button
          onClick={onOpenWatchlist}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[48px] transition-colors relative hover:text-white cursor-pointer"
        >
          <div className="relative">
            <Bookmark className="w-4 h-4 mb-0.5" />
            {watchlistCount > 0 && (
              <span className="absolute -top-1 -right-2.5 font-mono text-[9px] font-bold bg-emerald-400 text-forest-950 w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {watchlistCount}
              </span>
            )}
            {alertCount > 0 && (
              <span className="absolute -top-0.5 -left-1.5 w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            )}
          </div>
          <span className="text-[10px] tracking-wider uppercase">Stash</span>
        </button>

        <button
          onClick={onOpenCart}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[48px] transition-colors relative hover:text-white cursor-pointer"
        >
          <div className="relative">
            <ShoppingBag className="w-4 h-4 mb-0.5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-2.5 font-mono text-[9px] font-bold bg-sage-400 text-forest-950 w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-wider uppercase">Cart</span>
        </button>

        <button
          onClick={() => setActiveTab('admin')}
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 min-h-[48px] transition-colors cursor-pointer ${
            activeTab === 'admin' ? 'text-sage-400 font-bold' : 'hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-wider uppercase">Admin</span>
          {activeTab === 'admin' && (
            <span className="w-1 h-1 rounded-full bg-sage-400 mt-0.5" />
          )}
        </button>
      </nav>
    </>
  );
}
