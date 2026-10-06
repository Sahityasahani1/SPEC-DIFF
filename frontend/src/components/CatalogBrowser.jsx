import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, CheckCircle2, XCircle, ExternalLink, ShoppingBag, 
  LayoutGrid, List, Star, SlidersHorizontal, Layers, Check, 
  ChevronLeft, ChevronRight, RotateCcw, Sparkles, X, ArrowUpDown
} from 'lucide-react';
import { getProducts } from '../services/api';
import { formatINR } from '../utils/formatters';
import { getOutboundDealUrl, openDealUrl } from '../utils/dealUrl';

const CATEGORIES = [
  { id: 'all', label: 'All Items ⚡' },
  { id: 'laptop', label: 'Laptops 💻' },
  { id: 'smartphone', label: 'Phones 📱' },
  { id: 'audio', label: 'Audio 🎧' },
  { id: 'tablet', label: 'Tablets 📟' },
  { id: 'smartwatch', label: 'Watches ⌚' },
  { id: 'monitor', label: 'Monitors 🖥️' },
  { id: 'gaming', label: 'Gaming Consoles 🎮' },
  { id: 'accessory', label: 'Accessories ⌨️' },
];

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Recommended / Relevance' },
  { id: 'price_asc', label: 'Price: Low to High' },
  { id: 'price_desc', label: 'Price: High to Low' },
  { id: 'rating_desc', label: 'Highest Rated' },
  { id: 'name_asc', label: 'Product Name (A-Z)' },
];

export default function CatalogBrowser({ onSelectForCompare, selectedCompareIds = [], onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [currentPage, setCurrentPage] = useState(1);

  const catalogTopRef = useRef(null);

  useEffect(() => {
    loadProducts();
  }, [selectedBrand, inStockOnly, selectedCategory]);

  // Reset pagination to page 1 whenever search, brand, category, stock or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, selectedCategory, selectedBrand, inStockOnly, sortBy]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = { limit: 250, in_stock_only: inStockOnly };
      if (selectedBrand !== 'All Brands') {
        params.brand = selectedBrand;
      }
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      const data = await getProducts(params);
      setProducts(data.products || []);
    } catch (err) {
      console.error('Failed to load catalog products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Derive unique brands from loaded products
  const availableBrands = useMemo(() => {
    const brands = Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort();
    return ['All Brands', ...brands];
  }, [products]);

  // Category Emoji resolver
  const getCategoryEmoji = (category) => {
    const c = (category || '').toLowerCase();
    if (c === 'smartphone' || c === 'phone') return '📱';
    if (c === 'tablet') return '📟';
    if (c === 'audio' || c === 'headphones') return '🎧';
    if (c === 'smartwatch' || c === 'watch') return '⌚';
    if (c === 'monitor') return '🖥️';
    if (c === 'gaming') return '🎮';
    if (c === 'accessory') return '⌨️';
    return '💻';
  };

  // Filtered products list
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'all' && (p.category || '').toLowerCase() !== selectedCategory) {
        return false;
      }
      const q = search.toLowerCase().trim();
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.processor && p.processor.toLowerCase().includes(q)) ||
        (p.gpu && p.gpu.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    });
  }, [products, selectedCategory, search]);

  // Sorted products list
  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortBy === 'price_asc') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sortBy === 'rating_desc') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'name_asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return list;
  }, [filtered, sortBy]);

  // Pagination parameters
  const itemsPerPage = viewMode === 'grid' ? 16 : 20;
  const totalPages = Math.max(1, Math.ceil(sorted.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, sorted.length);
  const currentItems = sorted.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    if (catalogTopRef.current) {
      catalogTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const resetAllFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedBrand('All Brands');
    setInStockOnly(false);
    setSortBy('relevance');
    setCurrentPage(1);
  };

  return (
    <div ref={catalogTopRef} className="space-y-6 max-w-7xl mx-auto animate-fadeIn font-jakarta">
      
      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-4 py-2 rounded-full text-xs font-mono font-bold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer shadow-xs ${
              selectedCategory === cat.id
                ? 'bg-forest-900 text-sage-300 border border-sage-500/30'
                : 'bg-white text-forest-900/80 hover:text-forest-950 hover:bg-porcelain-100 border border-[#e2dfd5]'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search and Filters Header */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-[#e8e5dc] shadow-xs flex flex-col lg:flex-row gap-4 justify-between items-center">
        
        {/* Search Input Box */}
        <div className="relative w-full lg:w-96">
          <Search className="w-4 h-4 text-forest-900/40 absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search electronics by name, chip, brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm rounded-2xl border border-[#e2dfd5] bg-[#fbfbf9] text-forest-950 placeholder:text-forest-900/40 outline-none focus:border-sage-500 focus:bg-white transition-all font-medium"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-forest-900/40 hover:text-forest-900 cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Controls: Brand, In-Stock, Sort, and View Mode */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full lg:w-auto justify-start lg:justify-end">
          
          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="text-xs sm:text-sm px-3 py-2.5 rounded-2xl border border-[#e2dfd5] bg-white text-forest-950 focus:border-sage-500 outline-none cursor-pointer font-medium"
          >
            {availableBrands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Sort By Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs sm:text-sm px-3 py-2.5 rounded-2xl border border-[#e2dfd5] bg-white text-forest-950 focus:border-sage-500 outline-none cursor-pointer font-medium"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.label}</option>
            ))}
          </select>

          {/* In Stock Only Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-forest-900/80 bg-[#fbfbf9] px-3.5 py-2.5 rounded-2xl border border-[#e2dfd5] hover:border-forest-900/30 transition-colors select-none">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="w-4 h-4 rounded text-forest-900 focus:ring-sage-500 accent-forest-900 border-[#e2dfd5]"
            />
            <span>In-Stock</span>
          </label>

          {/* View Mode Toggle: Grid vs Table */}
          <div className="flex items-center bg-[#f2efe6] p-1 rounded-2xl border border-[#e2dfd5]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-forest-900 text-white shadow-xs'
                  : 'text-forest-900/60 hover:text-forest-900'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-forest-900 text-white shadow-xs'
                  : 'text-forest-900/60 hover:text-forest-900'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* Catalog Results Header Bar */}
      <div className="bg-[#f7f5ef] rounded-2xl px-5 py-3 border border-[#e8e5dc] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-forest-900">
            Showing {sorted.length === 0 ? 0 : startIndex + 1}–{endIndex} of {sorted.length} Products
          </span>
          {products.length > 0 && sorted.length !== products.length && (
            <span className="text-[11px] font-mono text-forest-900/50">
              ({products.length} in database)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-forest-900/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          <span>Amazon.in • Flipkart • Croma • Apple India Verified</span>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-white p-5 rounded-3xl border border-[#e8e5dc] animate-pulse space-y-3">
              <div className="h-32 bg-porcelain-100 rounded-2xl" />
              <div className="h-5 bg-porcelain-200 rounded w-3/4" />
              <div className="h-4 bg-porcelain-100 rounded w-1/2" />
              <div className="h-8 bg-porcelain-100 rounded-full w-2/3" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#e8e5dc] shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-porcelain-100 text-forest-900 flex items-center justify-center text-2xl mx-auto">
            🔍
          </div>
          <h3 className="text-lg font-bold text-forest-950 font-jakarta">
            No products found matching your criteria
          </h3>
          <p className="text-xs text-forest-900/60 max-w-md mx-auto">
            Try adjusting your search query, selecting "All Brands", or clearing category filters.
          </p>
          <button
            type="button"
            onClick={resetAllFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-forest-900 text-white text-xs font-mono font-bold uppercase tracking-wider hover:bg-forest-800 transition-all cursor-pointer shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW: High-density, elegant cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {currentItems.map((p) => {
            const isChecked = selectedCompareIds.includes(p.id);
            const mrp = p.price ? Math.round(p.price * 1.14 / 100) * 100 - 10 : 0;
            const categoryEmoji = getCategoryEmoji(p.category);

            return (
              <div
                key={p.id}
                className="bg-white rounded-3xl p-5 border border-[#e8e5dc] shadow-xs hover:shadow-md transition-all flex flex-col justify-between group hover:border-[#dfdbd0]"
              >
                <div>
                  {/* Top Badges Row */}
                  <div className="flex items-center justify-between gap-1.5 mb-3">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className="text-base select-none shrink-0">{categoryEmoji}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#f4f2ec] text-forest-900 text-[10px] font-mono font-bold uppercase tracking-wider border border-forest-900/10 truncate">
                        {p.brand}
                      </span>
                    </div>

                    {p.in_stock ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> In Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 font-mono text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0">
                        <XCircle className="w-3 h-3 text-rose-600" /> Out of Stock
                      </span>
                    )}
                  </div>

                  {/* Product Title */}
                  <h4 
                    className="font-bold text-forest-950 text-sm leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-forest-700 transition-colors mb-1.5"
                    title={p.name}
                  >
                    {p.name}
                  </h4>

                  {/* Rating & Source */}
                  <div className="flex items-center gap-1.5 mb-3 text-xs">
                    <div className="flex items-center text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-current mr-0.5" />
                      <span>{p.rating || 4.5}</span>
                    </div>
                    <span className="text-forest-900/30">•</span>
                    <span className="font-mono text-[11px] text-forest-900/60 truncate">
                      {p.retail_source || 'Verified'}
                    </span>
                  </div>

                  {/* Key Hardware Specs */}
                  <div className="space-y-1.5 mb-4 text-[11px] font-mono">
                    {(p.ram_gb > 0 || p.storage_gb > 0) && (
                      <div className="flex items-center gap-1.5 text-forest-900/80">
                        <span className="font-semibold text-forest-950">
                          {p.ram_gb > 0 ? `${p.ram_gb}GB RAM` : ''} 
                          {p.ram_gb > 0 && p.storage_gb > 0 ? ' • ' : ''}
                          {p.storage_gb > 0 ? (p.storage_gb >= 1024 ? `${p.storage_gb / 1024}TB` : `${p.storage_gb}GB`) : ''}
                        </span>
                      </div>
                    )}

                    {p.processor && (
                      <div className="text-forest-900/60 truncate" title={p.processor}>
                        {p.processor}
                      </div>
                    )}

                    {(p.battery_hours > 0 || p.weight_kg > 0) && (
                      <div className="text-forest-900/50">
                        {p.battery_hours > 0 ? `${p.battery_hours}h battery` : ''}
                        {p.battery_hours > 0 && p.weight_kg > 0 ? ' • ' : ''}
                        {p.weight_kg > 0 ? `${p.weight_kg}kg` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Banner & Actions */}
                <div className="pt-3 border-t border-[#f0ede6] space-y-3">
                  
                  {/* Pricing row */}
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-xl font-black font-mono text-forest-950 tracking-tight">
                        {p.formatted_price}
                      </span>
                      {mrp > p.price && (
                        <span className="text-xs font-mono text-forest-900/40 line-through">
                          ₹{mrp.toLocaleString('en-IN')}
                        </span>
                      )}
                      <span className="text-[9px] font-mono font-bold text-sage-700 bg-sage-500/15 px-1.5 py-0.2 rounded-full">
                        SAVINGS
                      </span>
                    </div>

                    {p.price_signal?.signal && (
                      <div className="pt-0.5">
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          p.price_signal.signal === 'STRONG_BUY' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                          p.price_signal.signal === 'FAIR_VALUE' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                          'bg-rose-50 text-rose-800 border-rose-300'
                        }`}>
                          {p.price_signal.signal === 'STRONG_BUY' ? '🟢 STRONG BUY' :
                           p.price_signal.signal === 'FAIR_VALUE' ? '🟡 FAIR VALUE' :
                           '🔴 WAIT FOR SALE'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {onAddToCart && (
                      <button
                        type="button"
                        onClick={() => onAddToCart(p)}
                        className="flex-1 text-xs px-2.5 py-2 rounded-xl font-bold bg-sage-500 hover:bg-sage-600 text-forest-950 flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                        title="Add to Shopping Cart"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>+ Cart</span>
                      </button>
                    )}

                    <a
                      href={getOutboundDealUrl(p)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => openDealUrl(p, e)}
                      className="px-2.5 py-2 rounded-xl font-bold text-xs bg-forest-900 hover:bg-forest-850 text-sage-300 border border-sage-500/30 flex items-center justify-center gap-1 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                      title="View Deal on Retailer"
                    >
                      <span>Deal</span>
                      <ExternalLink className="w-3 h-3 text-sage-400" />
                    </a>

                    {onSelectForCompare && (
                      <button
                        type="button"
                        onClick={() => onSelectForCompare(p)}
                        className={`text-xs px-2.5 py-2 rounded-xl font-bold uppercase font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                          isChecked
                            ? 'bg-forest-900 text-white shadow-xs'
                            : 'bg-porcelain-100 text-forest-900 hover:bg-porcelain-200 border border-[#e0ddd4]'
                        }`}
                        title={isChecked ? 'Selected for comparison' : 'Add to compare tray'}
                      >
                        {isChecked ? '✓' : '+ Diff'}
                      </button>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW: Clean, modern, responsive table without overflowing */
        <div className="bg-white rounded-3xl border border-[#e8e5dc] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e8e5dc] bg-[#f7f5ef] text-[11px] uppercase font-mono font-bold text-forest-900/70">
                  <th className="py-4 px-4 min-w-[220px]">Product & Brand</th>
                  <th className="py-4 px-4 min-w-[120px]">Price (INR)</th>
                  <th className="py-4 px-4 min-w-[180px]">Hardware Specs</th>
                  <th className="py-4 px-4 min-w-[140px]">Upgradeability</th>
                  <th className="py-4 px-4 min-w-[120px]">Battery / Wt</th>
                  <th className="py-4 px-4 min-w-[110px]">Inventory</th>
                  <th className="py-4 px-4 min-w-[180px]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0ede6] text-xs font-sans">
                {currentItems.map((p) => {
                  const isChecked = selectedCompareIds.includes(p.id);
                  const categoryEmoji = getCategoryEmoji(p.category);

                  return (
                    <tr key={p.id} className="hover:bg-[#fbfbf9] transition-colors">
                      <td className="py-3.5 px-4 max-w-[260px]">
                        <div className="flex items-start gap-2">
                          <span className="text-base select-none mt-0.5">{categoryEmoji}</span>
                          <div className="overflow-hidden">
                            <div className="font-bold text-forest-950 leading-snug truncate" title={p.name}>
                              {p.name}
                            </div>
                            <div className="text-[11px] font-mono text-forest-900/50 mt-0.5">
                              {p.brand} &bull; {p.retail_source}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-forest-950 text-sm whitespace-nowrap">
                        {p.formatted_price}
                      </td>

                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="font-semibold text-forest-950 truncate">
                          {p.ram_gb > 0 ? `${p.ram_gb}GB RAM` : ''} 
                          {p.ram_gb > 0 && p.storage_gb > 0 ? ' | ' : ''}
                          {p.storage_gb > 0 ? (p.storage_gb >= 1024 ? `${p.storage_gb / 1024}TB` : `${p.storage_gb}GB`) : ''}
                        </div>
                        <div className="text-[11px] font-mono text-forest-900/60 truncate" title={p.processor}>
                          {p.processor || '—'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-semibold border ${
                          (p.ram_expandability || '').includes('Upgradable') || (p.ram_expandability || '').includes('Free')
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-porcelain-100 text-forest-900/60 border-[#e2dfd5]'
                        }`}>
                          {p.ram_expandability || 'Standard'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-forest-900/70 font-mono text-xs whitespace-nowrap">
                        {p.battery_hours > 0 ? `${p.battery_hours}h` : '—'} &bull; {p.weight_kg > 0 ? `${p.weight_kg}kg` : '—'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {p.in_stock ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-mono text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-mono text-[11px] font-bold">
                            <XCircle className="w-3.5 h-3.5 text-rose-500" /> Out of Stock
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {onAddToCart && (
                            <button
                              type="button"
                              onClick={() => onAddToCart(p)}
                              className="text-xs px-2.5 py-1.5 rounded-xl font-bold bg-sage-500 hover:bg-sage-600 text-forest-950 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                              title="Add to Cart"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              <span>+ Cart</span>
                            </button>
                          )}

                          <a
                            href={getOutboundDealUrl(p)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => openDealUrl(p, e)}
                            className="text-xs px-2.5 py-1.5 rounded-xl font-bold bg-forest-900 hover:bg-forest-850 text-sage-300 border border-sage-500/30 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                          >
                            <span>Deal</span>
                            <ExternalLink className="w-3 h-3 text-sage-400" />
                          </a>

                          {onSelectForCompare && (
                            <button
                              type="button"
                              onClick={() => onSelectForCompare(p)}
                              className={`text-xs px-2.5 py-1.5 rounded-full font-bold uppercase font-mono tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                                isChecked
                                  ? 'bg-forest-900 text-white shadow-xs'
                                  : 'bg-porcelain-100 text-forest-900 hover:bg-porcelain-200 border border-[#e0ddd4]'
                              }`}
                            >
                              {isChecked ? '✓' : '+ Diff'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="bg-white p-4 rounded-3xl border border-[#e8e5dc] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs font-mono text-forest-900/60">
            Page <span className="font-bold text-forest-950">{currentPage}</span> of <span className="font-bold text-forest-950">{totalPages}</span> ({sorted.length} total items)
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-xl border border-[#e2dfd5] text-forest-900 hover:bg-porcelain-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 7) return true;
                  if (p === 1 || p === totalPages) return true;
                  return Math.abs(p - currentPage) <= 1;
                })
                .map((pageNum, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && pageNum - prev > 1;

                  return (
                    <React.Fragment key={pageNum}>
                      {showEllipsis && (
                        <span className="px-1 text-forest-900/40 font-mono text-xs select-none">...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-forest-900 text-white shadow-xs'
                            : 'bg-porcelain-50 hover:bg-porcelain-100 text-forest-900 border border-[#e2dfd5]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 rounded-xl border border-[#e2dfd5] text-forest-900 hover:bg-porcelain-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
