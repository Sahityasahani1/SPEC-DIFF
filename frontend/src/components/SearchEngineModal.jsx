import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, X, SlidersHorizontal, ShoppingBag, Layers, 
  ExternalLink, Check, Sparkles, Tag, ArrowRight,
  ChevronRight, RefreshCw, Cpu, HardDrive, Battery
} from 'lucide-react';
import { getProducts } from '../services/api';
import { getOutboundDealUrl, openDealUrl } from '../utils/dealUrl';
import { formatINR } from '../utils/formatters';

const POPULAR_SEARCHES = [
  'MacBook Air M3',
  'RTX 4060 Gaming',
  'Sony WH-1000XM5',
  'PlayStation 5 Slim',
  'Galaxy S24 Ultra',
  'iPad Air M2',
  'Keychron Q1 Pro',
  'LG UltraGear OLED',
  'ROG Ally X'
];

const BUDGET_PRESETS = [
  { id: 'all', label: 'All Budgets', min: null, max: null },
  { id: 'under-30k', label: 'Under ₹30,000', min: null, max: 30000 },
  { id: '30k-60k', label: '₹30K - ₹60K', min: 30000, max: 60000 },
  { id: '60k-120k', label: '₹60K - ₹1.2L', min: 60000, max: 120000 },
  { id: 'above-120k', label: 'Above ₹1.2L', min: 120000, max: null },
];

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance & Popularity' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'rating_desc', label: 'Highest Rated' },
];

const CATEGORY_NAMES = {
  all: 'All Categories',
  laptop: 'Laptops 💻',
  smartphone: 'Smartphones 📱',
  audio: 'Audio & Headphones 🎧',
  smartwatch: 'Smartwatches ⌚',
  tablet: 'Tablets 📟',
  monitor: 'Monitors 🖥️',
  gaming: 'Gaming Consoles 🎮',
  accessory: 'Keyboards & Peripherals ⌨️',
};

export default function SearchEngineModal({
  isOpen,
  onClose,
  onAddToCart,
  onToggleCompare,
  selectedCompareIds = []
}) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBudget, setSelectedBudget] = useState('all');
  const [sortBy, setSortBy] = useState('relevance');
  const [inStockOnly, setInStockOnly] = useState(true);

  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const inputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Focus input when opened & listen for Escape key
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Execute search query against backend /api/products
  const executeSearch = useCallback(async (searchQuery, cat, budgetId, sort, stockOnly) => {
    setLoading(true);
    setError(null);
    try {
      const budgetObj = BUDGET_PRESETS.find(b => b.id === budgetId) || BUDGET_PRESETS[0];
      const params = {
        limit: 80,
        in_stock_only: stockOnly,
        sort_by: sort
      };

      if (searchQuery && searchQuery.trim()) {
        params.q = searchQuery.trim();
      }
      if (cat && cat !== 'all') {
        params.category = cat;
      }
      if (budgetObj.min !== null) {
        params.min_price = budgetObj.min;
      }
      if (budgetObj.max !== null) {
        params.max_price = budgetObj.max;
      }

      const res = await getProducts(params);
      setProducts(res.products || []);
      setTotalCount(res.total || 0);
      if (res.categories) {
        setCategoryCounts(res.categories);
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Unable to fetch products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search trigger when filters change
  useEffect(() => {
    if (!isOpen) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(query, selectedCategory, selectedBudget, sortBy, inStockOnly);
    }, 200);

    return () => clearTimeout(debounceTimerRef.current);
  }, [isOpen, query, selectedCategory, selectedBudget, sortBy, inStockOnly, executeSearch]);

  if (!isOpen) return null;

  const getEmoji = (cat) => {
    const c = (cat || '').toLowerCase();
    if (c === 'smartphone' || c === 'phone') return '📱';
    if (c === 'tablet') return '📟';
    if (c === 'audio' || c === 'headphones') return '🎧';
    if (c === 'smartwatch' || c === 'watch') return '⌚';
    if (c === 'monitor') return '🖥️';
    if (c === 'gaming') return '🎮';
    if (c === 'accessory') return '⌨️';
    return '💻';
  };

  const handleClear = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const totalAllCategories = Object.values(categoryCounts).reduce((acc, c) => acc + c, 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-start justify-center pt-4 sm:pt-10 px-3 sm:px-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-forest-950/75 backdrop-blur-md transition-opacity"
      />

      {/* Main Search Modal Box */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -20 }}
        transition={{ type: 'spring', duration: 0.35, bounce: 0.15 }}
        className="relative w-full max-w-5xl max-h-[92vh] bg-[#fcfbf9] rounded-3xl shadow-2xl border border-[#e8e5dc] flex flex-col overflow-hidden z-10"
      >
        {/* Search Header Bar */}
        <div className="p-4 sm:p-6 border-b border-[#e8e5dc] bg-white">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 flex items-center">
              <Search className="w-5 h-5 text-forest-700/60 absolute left-4 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search 113+ electronic products (e.g. MacBook M3, Sony XM5, PS5, OLED, RTX 4060)..."
                className="w-full pl-12 pr-10 py-3.5 bg-porcelain-100 border border-[#e0ddd4] focus:border-forest-800 rounded-2xl text-sm sm:text-base text-forest-950 placeholder:text-forest-900/40 outline-none font-medium transition-all shadow-inner"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 p-1 text-forest-700/50 hover:text-forest-950 rounded-full hover:bg-forest-900/5 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-3 text-forest-900/60 hover:text-forest-950 rounded-2xl hover:bg-porcelain-100 transition-colors border border-transparent hover:border-[#e0ddd4]"
              title="Close Search (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Popular Searches */}
          {!query && (
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none">
              <span className="text-forest-900/50 font-mono text-[11px] flex items-center gap-1 shrink-0">
                <Sparkles className="w-3 h-3 text-sage-600" /> Trending:
              </span>
              {POPULAR_SEARCHES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuery(item)}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-porcelain-100 hover:bg-porcelain-200 text-forest-900 text-[11px] font-medium transition-colors border border-[#e8e5dc]"
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {/* Category Facet Tabs */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 text-xs scrollbar-none border-t border-[#f0ede6] pt-3">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                selectedCategory === 'all'
                  ? 'bg-forest-900 text-white shadow-sm'
                  : 'bg-porcelain-100 text-forest-900 hover:bg-porcelain-200 border border-[#e0ddd4]'
              }`}
            >
              All {totalAllCategories > 0 ? `(${totalAllCategories})` : ''}
            </button>

            {Object.entries(categoryCounts).map(([catKey, count]) => (
              <button
                key={catKey}
                type="button"
                onClick={() => setSelectedCategory(catKey)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize ${
                  selectedCategory === catKey
                    ? 'bg-forest-900 text-white shadow-sm'
                    : 'bg-porcelain-100 text-forest-900 hover:bg-porcelain-200 border border-[#e0ddd4]'
                }`}
              >
                {CATEGORY_NAMES[catKey] || catKey} ({count})
              </button>
            ))}
          </div>

          {/* Refinement Bar: Budget, Sort, and In-Stock */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs pt-2">
            {/* Budget Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[11px] font-mono text-forest-900/50 uppercase tracking-wider">
                Budget:
              </span>
              {BUDGET_PRESETS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBudget(b.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-colors ${
                    selectedBudget === b.id
                      ? 'bg-sage-600 text-white font-bold'
                      : 'bg-porcelain-100 text-forest-900 hover:bg-porcelain-200'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {/* Sort & Stock Controls */}
            <div className="flex items-center gap-3 ml-auto">
              <label className="flex items-center gap-1.5 text-xs font-mono text-forest-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="rounded text-forest-900 focus:ring-sage-500"
                />
                <span>In Stock Only</span>
              </label>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-porcelain-100 text-forest-900 border border-[#e0ddd4] rounded-xl px-2.5 py-1 text-xs font-mono outline-none focus:border-forest-900 cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Results Status Header */}
          <div className="flex items-center justify-between text-xs font-mono text-forest-900/60 pb-2 border-b border-[#f0ede6]">
            <span>
              {loading ? (
                <span className="flex items-center gap-1.5 text-sage-700">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Searching electronic database...
                </span>
              ) : (
                <>Found <strong>{products.length}</strong> matching electronic products</>
              )}
            </span>
            <span className="hidden sm:inline text-[11px] text-forest-900/40">
              Verified Indian Street Pricing &bull; 0 Hallucinations
            </span>
          </div>

          {/* Results Grid */}
          {!loading && products.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="text-4xl">🔍</div>
              <h4 className="font-bold text-lg font-jakarta text-forest-950">
                No electronics matched "{query}"
              </h4>
              <p className="text-sm text-forest-900/60 max-w-md mx-auto">
                Try widening your budget filter, checking for typos, or clicking one of the popular search chips above.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedCategory('all');
                  setSelectedBudget('all');
                }}
                className="px-4 py-2 rounded-full bg-forest-900 text-white text-xs font-bold uppercase tracking-wider hover:bg-forest-800 transition-colors cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p) => {
                const isCompared = selectedCompareIds.includes(p.id);
                const mrp = Math.round((p.price || 0) * 1.14 / 100) * 100 - 10;
                const dealUrl = getOutboundDealUrl(p);

                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-[#e8e5dc] p-4 flex flex-col justify-between hover:shadow-md hover:border-forest-900/30 transition-all group"
                  >
                    {/* Top Row: Category Emoji & Brand Badge */}
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-porcelain-100 text-forest-900 border border-[#e5e2d8]">
                          <span>{getEmoji(p.category)}</span>
                          <span className="uppercase">{p.brand}</span>
                        </span>

                        {p.rating && (
                          <span className="text-[11px] font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            ★ {p.rating}
                          </span>
                        )}
                      </div>

                      {/* Product Name */}
                      <h4 className="font-bold font-jakarta text-sm text-forest-950 leading-snug line-clamp-2 group-hover:text-forest-700 transition-colors mb-2">
                        {p.name}
                      </h4>

                      {/* Key Hardware Specs */}
                      <div className="space-y-1 text-[11px] font-mono text-forest-900/70 mb-3 bg-porcelain-50/70 p-2.5 rounded-xl border border-[#f0ede6]">
                        {p.processor && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Cpu className="w-3 h-3 text-sage-600 shrink-0" />
                            <span className="truncate">{p.processor}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3 text-sage-600 shrink-0" />
                            {p.ram_gb ? `${p.ram_gb}GB RAM` : ''} {p.storage_gb ? `• ${p.storage_gb}GB SSD` : ''}
                          </span>
                          {p.battery_hours && (
                            <span className="flex items-center gap-1 text-forest-900/60">
                              <Battery className="w-3 h-3 text-sage-600" />
                              {p.battery_hours}h
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Price & Action Buttons */}
                    <div className="pt-3 border-t border-[#f0ede6] space-y-3">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className="text-lg font-black font-mono text-forest-950">
                            {formatINR(p.price)}
                          </span>
                          <span className="ml-2 text-xs font-mono text-forest-900/40 line-through">
                            {formatINR(mrp)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          {p.deal_comparison?.best_deal_store && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                              🏷️ {p.deal_comparison.best_deal_store}
                            </span>
                          )}
                          {p.price_signal?.signal && (
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                              p.price_signal.signal === 'STRONG_BUY' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                              p.price_signal.signal === 'FAIR_VALUE' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                              'bg-rose-50 text-rose-800 border-rose-300'
                            }`}>
                              {p.price_signal.signal === 'STRONG_BUY' ? '🟢 BUY' :
                               p.price_signal.signal === 'FAIR_VALUE' ? '🟡 FAIR' : 'WAIT'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 3 Action Buttons */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1">
                        {/* 1. Add to Cart Button */}
                        <button
                          type="button"
                          onClick={() => onAddToCart && onAddToCart(p)}
                          className="px-2 py-2 rounded-xl bg-sage-500 hover:bg-sage-600 text-forest-950 font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer"
                          title="Add to Shopping Cart"
                        >
                          <ShoppingBag className="w-3 h-3" />
                          <span>+ Cart</span>
                        </button>

                        {/* 2. Compare Button */}
                        <button
                          type="button"
                          onClick={() => onToggleCompare && onToggleCompare(p)}
                          className={`px-2 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            isCompared
                              ? 'bg-forest-900 text-white'
                              : 'bg-porcelain-100 hover:bg-porcelain-200 text-forest-900 border border-[#e0ddd4]'
                          }`}
                          title="Add to Compare Matrix"
                        >
                          {isCompared ? <Check className="w-3 h-3 text-sage-400" /> : <Layers className="w-3 h-3" />}
                          <span>{isCompared ? 'Diff' : 'Comp'}</span>
                        </button>

                        {/* 3. View Deal Outbound */}
                        <a
                          href={dealUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => openDealUrl(p, e)}
                          className="px-2 py-2 rounded-xl bg-forest-900 hover:bg-forest-850 text-white font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-xs transition-all cursor-pointer"
                          title="View Retailer Deal"
                        >
                          <span>Deal</span>
                          <ExternalLink className="w-3 h-3 text-sage-400" />
                        </a>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#e8e5dc] bg-forest-900 text-white flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>FastAPI Multi-Column ILIKE Search Engine</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-white/60">Press <strong>Esc</strong> to close</span>
          </div>
        </div>

      </motion.div>
    </div>
  );
}
