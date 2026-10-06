import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import RecommendationForm from './components/RecommendationForm';
import ProductCard from './components/ProductCard';
import ComparisonModal from './components/ComparisonModal';
import DiagnosticBanner from './components/DiagnosticBanner';
import CatalogBrowser from './components/CatalogBrowser';
import AdminDashboard from './components/AdminDashboard';
import FeedbackModal from './components/FeedbackModal';
import AICopilotDrawer from './components/AICopilotDrawer';
import CommandPalette from './components/CommandPalette';
import DecisionDossierModal from './components/DecisionDossierModal';
import CompareDock from './components/CompareDock';
import ToastNotification from './components/ToastNotification';
import CartDrawer from './components/CartDrawer';
import SearchEngineModal from './components/SearchEngineModal';

import { getRecommendations, getComparison, checkHealth } from './services/api';
import { Layers, ArrowRight, X, AlertCircle, ArrowLeft, ChevronDown, Award, ShoppingBag } from 'lucide-react';

export default function App() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('recommend'); // 'recommend' | 'catalog' | 'admin'
  const [healthData, setHealthData] = useState(null);

  // Recommendation State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [noMatchData, setNoMatchData] = useState(null);
  const [currentPriority, setCurrentPriority] = useState('value');
  const [formInitialValues, setFormInitialValues] = useState(null);

  // Compare State & Toast System
  const [selectedCompareItems, setSelectedCompareItems] = useState([]);
  const [comparisonModalData, setComparisonModalData] = useState(null);
  const [comparingLoading, setComparingLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  const selectedCompareIds = selectedCompareItems.map(item => item.id);

  // Shopping Cart & Instant Search Modal State
  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem('specdiff_cart_v2');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('specdiff_cart_v2', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to persist cart items:', e);
    }
  }, [cartItems]);

  const handleAddToCart = (product) => {
    if (!product) return;
    const productId = product.product_id || product.id;
    const productName = product.name || 'Product';

    setCartItems(prev => {
      const index = prev.findIndex(item => (item.product?.product_id || item.product?.id) === productId);
      if (index > -1) {
        const next = [...prev];
        next[index] = { ...next[index], quantity: next[index].quantity + 1 };
        return next;
      } else {
        return [...prev, { product, quantity: 1 }];
      }
    });

    showToast(`Added "${productName}" to shopping cart.`, 'success');
  };

  const handleUpdateCartQty = (productId, newQty) => {
    if (newQty <= 0) {
      handleRemoveFromCart(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(item => {
        const id = item.product?.product_id || item.product?.id;
        return id === productId ? { ...item, quantity: newQty } : item;
      })
    );
  };

  const handleRemoveFromCart = (productId) => {
    setCartItems(prev => {
      const item = prev.find(i => (i.product?.product_id || i.product?.id) === productId);
      const filtered = prev.filter(i => (i.product?.product_id || i.product?.id) !== productId);
      if (item) {
        showToast(`Removed "${item.product?.name || 'Item'}" from cart.`, 'info');
      }
      return filtered;
    });
  };

  const handleClearCart = () => {
    setCartItems([]);
    showToast('Shopping cart cleared.', 'info');
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // Feedback State
  const [feedbackProduct, setFeedbackProduct] = useState(null);

  // Command Palette, Copilot, and Dossier State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [dossierData, setDossierData] = useState(null);

  const configSectionRef = useRef(null);

  // Parse URL search parameters for deep linking
  const parseUrlParams = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    if (!params.has('budget') && !params.has('priority') && !params.has('category') && !params.has('q')) {
      return null;
    }
    return {
      category: params.get('category') || 'laptop',
      max_budget: params.get('budget') ? Number(params.get('budget')) : 84999,
      min_ram_gb: params.get('ram') !== null ? Number(params.get('ram')) : 16,
      min_storage_gb: params.get('storage') !== null ? Number(params.get('storage')) : 512,
      use_case: params.get('q') || params.get('use_case') || 'B.Tech CS student coding in Python, running Docker containers, and casual gaming with good battery life.',
      brand: params.get('brand') && params.get('brand') !== 'Any' ? params.get('brand') : null,
      priority: params.get('priority') || 'value',
    };
  };

  // Sync active parameters to URL
  const syncToUrl = (formData) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    if (formData.category) params.set('category', formData.category);
    if (formData.max_budget) params.set('budget', formData.max_budget);
    if (formData.min_ram_gb !== undefined) params.set('ram', formData.min_ram_gb);
    if (formData.min_storage_gb !== undefined) params.set('storage', formData.min_storage_gb);
    if (formData.priority) params.set('priority', formData.priority);
    if (formData.brand && formData.brand !== 'Any') params.set('brand', formData.brand);
    if (formData.use_case) params.set('q', formData.use_case);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    fetchHealth();
    // Hydrate form from URL deep link or fall back to default
    const urlValues = parseUrlParams();
    const initial = urlValues || {
      category: 'laptop',
      max_budget: 84999,
      min_ram_gb: 16,
      min_storage_gb: 512,
      use_case: 'B.Tech CS student coding in Python, running Docker containers, and casual gaming with good battery life.',
      brand: null,
      priority: 'value'
    };
    setFormInitialValues(initial);
    handleGetRecommendations(initial);
  }, []);

  const fetchHealth = async () => {
    const data = await checkHealth();
    setHealthData(data);
  };

  const handleGetRecommendations = async (formData) => {
    setLoading(true);
    setError('');
    setResults(null);
    setNoMatchData(null);
    setCurrentPriority(formData.priority);

    // Deep link sync
    syncToUrl(formData);

    try {
      // Execute via TanStack Query for automatic retries, backoff, and SWR caching
      const res = await queryClient.fetchQuery({
        queryKey: ['recommendations', formData],
        queryFn: () => getRecommendations(formData),
        staleTime: 1000 * 60 * 5, // 5 min cache
      });

      if (res.status === 'no_match') {
        setNoMatchData(res);
      } else {
        setResults(res);
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching recommendations.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuickPrompt = (promptData) => {
    const nextValues = {
      category: promptData.category || 'all',
      max_budget: promptData.budget,
      min_ram_gb: promptData.ram,
      min_storage_gb: promptData.ssd,
      use_case: promptData.use_case,
      priority: promptData.priority,
      brand: null
    };
    setFormInitialValues(nextValues);
    handleGetRecommendations({
      ...nextValues
    });
    if (configSectionRef.current) {
      configSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const toggleCompare = (productOrId) => {
    const id = typeof productOrId === 'string' ? productOrId : (productOrId.product_id || productOrId.id);
    const exists = selectedCompareItems.some(item => item.id === id);

    if (exists) {
      const removed = selectedCompareItems.find(item => item.id === id);
      setSelectedCompareItems(prev => prev.filter(item => item.id !== id));
      showToast(`Removed "${removed?.name || id}" from comparison tray.`, 'info');
    } else {
      if (selectedCompareItems.length >= 3) {
        showToast('You can compare a maximum of 3 items simultaneously. Remove one to add another.', 'warning');
        return;
      }

      let itemObj = typeof productOrId === 'object' && productOrId !== null ? {
        id,
        name: productOrId.name,
        brand: productOrId.brand,
        formatted_price: productOrId.formatted_price || (productOrId.price ? `₹${Number(productOrId.price).toLocaleString()}` : ''),
        category: productOrId.category
      } : null;

      if (!itemObj) {
        const found = results?.recommendations?.find(r => r.product_id === id);
        if (found) {
          itemObj = {
            id,
            name: found.name,
            brand: found.brand,
            formatted_price: found.formatted_price,
            category: found.category
          };
        } else {
          itemObj = { id, name: id, formatted_price: '', category: 'laptop' };
        }
      }

      setSelectedCompareItems(prev => [...prev, itemObj]);
      showToast(`Added "${itemObj.name}" to comparison tray (${selectedCompareItems.length + 1} of 3).`, 'success');
    }
  };

  const handleOpenComparison = async () => {
    if (selectedCompareItems.length < 2) {
      showToast('Please select at least 2 items to run a side-by-side comparison.', 'warning');
      return;
    }

    setComparingLoading(true);
    try {
      const data = await getComparison(selectedCompareIds, currentPriority);
      setComparisonModalData(data);
    } catch (err) {
      showToast('Failed to load comparison: ' + err.message, 'error');
    } finally {
      setComparingLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-porcelain-50 text-porcelain-900 flex flex-col justify-between selection:bg-sage-500/25 selection:text-forest-900">
      
      {/* Top Navbar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        healthData={healthData}
        selectedCompareCount={selectedCompareIds.length}
        onOpenCompare={handleOpenComparison}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleCopilot={() => setIsCopilotOpen(prev => !prev)}
        onOpenSearch={() => setIsSearchOpen(true)}
        cartCount={totalCartCount}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {/* Main Viewport Container with safe bottom dock clearance */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-36 sm:pb-44 w-full flex-1">
        
        {/* TAB 1: RECOMMENDATIONS */}
        {activeTab === 'recommend' && (
          <div className="space-y-12">
            
            {/* HERO BANNER SECTION (Image 2: Forest Green Container) */}
            <HeroBanner
              onSelectQuickPrompt={handleSelectQuickPrompt}
              onScrollToConfig={() => {
                if (configSectionRef.current) {
                  configSectionRef.current.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            />

            {/* SECTION 02: "PIECES FOR EVERY KIND OF Spaces / Workflows" (Image 1 & 2) */}
            <div ref={configSectionRef} className="pt-4 space-y-6">
              
              {/* Section Header with Mixed Typography from Reference Image 1 */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-2">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 rounded-full bg-sage-500/15 text-forest-800 text-[10px] font-mono font-bold tracking-widest uppercase">
                      COLLECTION
                    </span>
                    <span className="text-[11px] font-mono text-forest-900/40">
                      / 02
                    </span>
                  </div>

                  {/* Headline: Heavy Sans + Sage Script */}
                  <div className="flex items-baseline flex-wrap gap-x-3">
                    <h2 className="font-spartan font-black text-3xl sm:text-5xl text-forest-950 uppercase tracking-tight">
                      MACHINES FOR EVERY
                    </h2>
                  </div>
                  <div className="flex items-center flex-wrap gap-3 mt-0.5">
                    <h2 className="font-spartan font-black text-3xl sm:text-5xl text-forest-950 uppercase tracking-tight">
                      KIND OF
                    </h2>
                    <span className="font-script text-sage-600 text-5xl sm:text-7xl font-normal leading-none select-none">
                      Workflows
                    </span>

                    {/* Capsule Louvers Graphic from Reference Image */}
                    <div className="hidden sm:flex items-center space-x-1 opacity-60 ml-2">
                      <span className="w-1.5 h-4 rounded-full bg-forest-900/30" />
                      <span className="w-1.5 h-6 rounded-full bg-forest-900/50" />
                      <span className="w-1.5 h-8 rounded-full bg-forest-900/70" />
                      <span className="w-1.5 h-6 rounded-full bg-forest-900/50" />
                      <span className="w-1.5 h-4 rounded-full bg-forest-900/30" />
                    </div>
                  </div>
                </div>

                {/* Subtitle on the right from Reference Image */}
                <p className="text-xs sm:text-sm text-forest-900/60 max-w-sm leading-relaxed">
                  Explore thoughtfully designed machines made to bring comfort, character, and timeless reliability into your everyday workflows.
                </p>
              </div>

              {/* ARCHITECTURAL FILTER BAR with Tick-Mark Ruler (Directly from Reference Image 1) */}
              <div className="pt-3 pb-2 flex items-center justify-between gap-3 border-y border-[#e8e5dc]">
                {/* SORT BY Pill */}
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-full bg-forest-900 text-white text-[11px] font-mono font-bold tracking-wider uppercase shadow-xs">
                    SORT BY: {currentPriority.toUpperCase()}
                  </span>
                </div>

                {/* Architectural Ruler Tick Pattern */}
                <div className="flex-1 tick-ruler mx-3 hidden sm:block opacity-60" />

                {/* Filter Dropdown Pills from Reference Image */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-3 py-1.5 rounded-full bg-white border border-[#e0ddd4] text-forest-900 text-xs font-mono font-medium flex items-center gap-1">
                    <span>BUDGET: {formInitialValues?.max_budget ? `₹${formInitialValues.max_budget / 1000}k` : '₹85k'}</span>
                    <ChevronDown className="w-3 h-3 text-forest-900/50" />
                  </span>

                  <span className="px-3 py-1.5 rounded-full bg-white border border-[#e0ddd4] text-forest-900 text-xs font-mono font-medium flex items-center gap-1">
                    <span>RAM: {formInitialValues?.min_ram_gb || 16}GB</span>
                    <ChevronDown className="w-3 h-3 text-forest-900/50" />
                  </span>

                  <span className="hidden md:flex px-3 py-1.5 rounded-full bg-white border border-[#e0ddd4] text-forest-900 text-xs font-mono font-medium items-center gap-1">
                    <span>BRAND: ALL</span>
                    <ChevronDown className="w-3 h-3 text-forest-900/50" />
                  </span>
                </div>
              </div>

              {/* DUAL COLUMN SHOWCASE (Parameters Configurator on Left, Results on Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pt-4">
                
                {/* Left: Input Form (Parameters) */}
                <div className="lg:col-span-5 lg:sticky lg:top-20">
                  <RecommendationForm
                    onSubmit={handleGetRecommendations}
                    loading={loading}
                    initialValues={formInitialValues}
                  />
                </div>

                {/* Right: Results Showcase */}
                <div className="lg:col-span-7 space-y-6">
                  
                  {/* Error Message */}
                  {error && (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-900 text-sm">
                      <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* No Match Diagnostic */}
                  {noMatchData && (
                    <DiagnosticBanner noMatchData={noMatchData} />
                  )}

                  {/* Results List */}
                  {results && results.recommendations && results.recommendations.length > 0 && (
                    <div className="space-y-6">
                      
                      {/* Top Bar with Carousel Buttons matching Reference Image 1 */}
                      <div className="flex items-center justify-between pb-2">
                        <div>
                          <p className="text-xs font-mono text-forest-900/60">
                            {results.recommendations.length} curated picks &bull; {results.total_eligible_count} verified Indian SKUs passed hard filters
                          </p>
                        </div>

                        {/* Circular Arrow Buttons from Reference Image (Dark Pill + Sage Pill) */}
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            className="w-8 h-8 rounded-full bg-forest-900 text-white flex items-center justify-center hover:bg-forest-800 transition-colors shadow-xs"
                            title="Previous pick"
                          >
                            <ArrowLeft className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="w-8 h-8 rounded-full bg-sage-500 text-forest-950 flex items-center justify-center hover:bg-sage-400 transition-colors shadow-xs"
                            title="Next pick"
                          >
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Product Cards */}
                      <div className="grid grid-cols-1 gap-6">
                        {results.recommendations.map((product, idx) => (
                          <ProductCard
                            key={product.product_id}
                            product={product}
                            rankIndex={idx}
                            isSelectedForCompare={selectedCompareIds.includes(product.product_id)}
                            onToggleCompare={toggleCompare}
                            onOpenFeedback={(p) => setFeedbackProduct(p)}
                            onAddToCart={handleAddToCart}
                          />
                        ))}
                      </div>

                    </div>
                  )}

                  {/* Loading Skeleton */}
                  {loading && (
                    <div className="space-y-6">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="bg-white p-7 rounded-[32px] border border-[#e8e5dc] animate-pulse space-y-4">
                          <div className="h-44 bg-porcelain-100 rounded-[24px]"></div>
                          <div className="h-6 bg-porcelain-200 rounded w-1/2"></div>
                          <div className="h-4 bg-porcelain-100 rounded w-1/4"></div>
                          <div className="h-10 bg-porcelain-100 rounded-full w-1/3"></div>
                        </div>
                      ))}
                    </div>
                  )}

                </div>

              </div>

            </div>

            {/* SECTION 03: "THOUGHTFUL DESIGN TIMELESS Appeal / Speed" (Image 2 Bottom Section) */}
            {results && results.recommendations && results.recommendations.length > 0 && (
              <div className="pt-8 space-y-6">
                
                <div className="flex items-center justify-between pb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-3 py-1 rounded-full bg-sage-500/15 text-forest-800 text-[10px] font-mono font-bold tracking-widest uppercase">
                        FEATURED MACHINE
                      </span>
                      <span className="text-[11px] font-mono text-forest-900/40">
                        / 03
                      </span>
                    </div>

                    <div className="flex items-baseline flex-wrap gap-x-3">
                      <h3 className="font-spartan font-black text-2xl sm:text-4xl text-forest-950 uppercase tracking-tight">
                        THOUGHTFUL HARDWARE TIMELESS
                      </h3>
                      <span className="font-script text-sage-600 text-4xl sm:text-6xl font-normal leading-none select-none">
                        Speed
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dark Forest Highlight Card matching Image 2 "Luno Lounge Chair" */}
                <div className="bg-forest-900 text-white rounded-[36px] p-8 sm:p-10 border border-forest-800 shadow-2xl relative overflow-hidden">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    <div className="md:col-span-8 space-y-3">
                      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/10 text-[10px] font-mono text-sage-300">
                        <Award className="w-3 h-3 text-sage-400" />
                        <span>HIGHEST SCORING BENCHMARK ({results.recommendations[0]?.match_score}% MATCH)</span>
                      </div>
                      <h4 className="text-2xl sm:text-3xl font-bold font-jakarta text-white">
                        {results.recommendations[0]?.name}
                      </h4>
                      <p className="text-xs sm:text-sm text-white/70 max-w-lg leading-relaxed">
                        {results.recommendations[0]?.reasons?.[0]}
                      </p>
                      <div className="flex items-baseline gap-3 pt-2">
                        <span className="text-2xl sm:text-3xl font-mono font-black text-white">
                          {results.recommendations[0]?.formatted_price}
                        </span>
                        <span className="text-xs font-mono text-white/50">
                          Verified at {results.recommendations[0]?.retail_source}
                        </span>
                      </div>
                    </div>

                    <div className="md:col-span-4 flex items-center justify-end gap-2.5 flex-wrap">
                      <button
                        onClick={() => handleAddToCart(results.recommendations[0])}
                        className="px-5 py-3 rounded-full bg-white hover:bg-porcelain-100 text-forest-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                        title="Add to Shopping Cart"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-sage-600" />
                        <span>Add to Cart</span>
                      </button>

                      <button
                        onClick={() => toggleCompare(results.recommendations[0])}
                        className="px-5 py-3 rounded-full bg-sage-500 hover:bg-sage-400 text-forest-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
                      >
                        {selectedCompareIds.includes(results.recommendations[0]?.product_id) ? 'Selected for Diff' : 'Add to Compare'}
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* TAB 2: BROWSE ALL PRODUCTS */}
        {activeTab === 'catalog' && (
          <CatalogBrowser
            selectedCompareIds={selectedCompareIds}
            onSelectForCompare={toggleCompare}
            onAddToCart={handleAddToCart}
          />
        )}

        {/* TAB 3: ADMIN DASHBOARD */}
        {activeTab === 'admin' && (
          <AdminDashboard />
        )}

      </main>

      {/* Interactive Floating Comparison Dock */}
      <CompareDock
        selectedItems={selectedCompareItems}
        onRemoveItem={(id) => {
          const removed = selectedCompareItems.find(item => item.id === id);
          setSelectedCompareItems(prev => prev.filter(item => item.id !== id));
          showToast(`Removed "${removed?.name || id}" from compare tray.`, 'info');
        }}
        onClearAll={() => {
          setSelectedCompareItems([]);
          showToast('Cleared comparison selection.', 'info');
        }}
        onCompare={handleOpenComparison}
        loading={comparingLoading}
      />

      {/* Non-blocking Global Toast System */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* Comparison Modal Dialog */}
      {comparisonModalData && (
        <ComparisonModal
          comparisonData={comparisonModalData}
          onClose={() => setComparisonModalData(null)}
          onExportDossier={() => setDossierData(comparisonModalData)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Persistent Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateCartQty}
        onRemoveFromCart={handleRemoveFromCart}
        onClearCart={handleClearCart}
      />

      {/* Instant Multi-Category Electronic Search Engine Modal */}
      <SearchEngineModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onAddToCart={handleAddToCart}
        onToggleCompare={toggleCompare}
        selectedCompareIds={selectedCompareIds}
      />

      {/* Decision Dossier Print/Export Modal */}
      {dossierData && (
        <DecisionDossierModal
          comparisonData={dossierData}
          onClose={() => setDossierData(null)}
        />
      )}

      {/* Feedback Modal Dialog */}
      {feedbackProduct && (
        <FeedbackModal
          product={feedbackProduct}
          recommendationId={results?.request_id}
          onClose={() => setFeedbackProduct(null)}
        />
      )}

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
      />

      {/* Persistent SpecPlug AI Floating Drawer */}
      <AICopilotDrawer
        activeProductIds={results?.recommendations?.map(r => r.product_id) || []}
        isOpen={isCopilotOpen}
        onToggle={(val) => setIsCopilotOpen(typeof val === 'boolean' ? val : !isCopilotOpen)}
        onAddToCart={handleAddToCart}
        hasBottomDock={selectedCompareItems.length > 0}
      />

      {/* Footer styled in Scandinavian Editorial Tone */}
      <footer className="bg-forest-950 text-white/60 border-t border-forest-900 mt-16 py-8 text-center text-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-mono">
            <strong className="text-white font-bold tracking-wider uppercase">SPECDIFF</strong> &bull; Indian Laptop Recommendation Engine
          </p>
          <p className="text-white/40 font-mono">
            Skill issue? Nah, spec diff. &bull; 100% Deterministic Constraint Invariants &bull; Zero Hallucination
          </p>
        </div>
      </footer>

    </div>
  );
}
