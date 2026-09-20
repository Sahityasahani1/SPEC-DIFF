import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import HeroBanner from './components/HeroBanner';
import RecommendationForm from './components/RecommendationForm';
import ProductCard from './components/ProductCard';
import ComparisonModal from './components/ComparisonModal';
import DiagnosticBanner from './components/DiagnosticBanner';
import CatalogBrowser from './components/CatalogBrowser';
import AdminDashboard from './components/AdminDashboard';
import FeedbackModal from './components/FeedbackModal';

import { getRecommendations, getComparison, checkHealth } from './services/api';
import { Layers, ArrowRight, X, AlertCircle, ArrowLeft, ChevronDown, Award } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('recommend'); // 'recommend' | 'catalog' | 'admin'
  const [healthData, setHealthData] = useState(null);

  // Recommendation State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [noMatchData, setNoMatchData] = useState(null);
  const [currentPriority, setCurrentPriority] = useState('value');
  const [formInitialValues, setFormInitialValues] = useState(null);

  // Compare State
  const [selectedCompareIds, setSelectedCompareIds] = useState([]);
  const [comparisonModalData, setComparisonModalData] = useState(null);
  const [comparingLoading, setComparingLoading] = useState(false);

  // Feedback State
  const [feedbackProduct, setFeedbackProduct] = useState(null);

  const configSectionRef = useRef(null);

  useEffect(() => {
    fetchHealth();
    // Run initial demo recommendation on startup
    handleGetRecommendations({
      category: 'laptop',
      max_budget: 84999,
      min_ram_gb: 16,
      min_storage_gb: 512,
      use_case: 'B.Tech CS student coding in Python, running Docker containers, and casual gaming with good battery life.',
      brand: null,
      priority: 'value'
    });
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

    try {
      const res = await getRecommendations(formData);
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

  const toggleCompare = (productId) => {
    if (selectedCompareIds.includes(productId)) {
      setSelectedCompareIds(selectedCompareIds.filter(id => id !== productId));
    } else {
      if (selectedCompareIds.length >= 3) {
        alert('You can compare a maximum of 3 items simultaneously.');
        return;
      }
      setSelectedCompareIds([...selectedCompareIds, productId]);
    }
  };

  const handleOpenComparison = async () => {
    if (selectedCompareIds.length < 2) {
      alert('Please select at least 2 items to compare.');
      return;
    }

    setComparingLoading(true);
    try {
      const data = await getComparison(selectedCompareIds, currentPriority);
      setComparisonModalData(data);
    } catch (err) {
      alert('Failed to load comparison: ' + err.message);
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
      />

      {/* Main Viewport Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">
        
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

                    <div className="md:col-span-4 flex justify-end">
                      <button
                        onClick={() => toggleCompare(results.recommendations[0]?.product_id)}
                        className="px-6 py-3 rounded-full bg-sage-500 hover:bg-sage-400 text-forest-950 font-bold text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
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
          />
        )}

        {/* TAB 3: ADMIN DASHBOARD */}
        {activeTab === 'admin' && (
          <AdminDashboard />
        )}

      </main>

      {/* Floating Comparison Drawer Bar styled in deep forest green */}
      {selectedCompareIds.length > 0 && (
        <div className="fixed bottom-6 right-6 z-40 animate-slideUp">
          <div className="bg-forest-900 text-white px-5 py-3.5 rounded-full shadow-2xl flex items-center gap-4 border border-forest-700">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-sage-300">
              <Layers className="w-4 h-4 text-sage-400" />
              <span>{selectedCompareIds.length} OF 3 LAPTOPS SELECTED</span>
            </div>

            <button
              type="button"
              onClick={handleOpenComparison}
              disabled={selectedCompareIds.length < 2 || comparingLoading}
              className="px-4 py-2 bg-sage-500 hover:bg-sage-400 disabled:opacity-50 text-forest-950 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <span>{comparingLoading ? 'Crunching...' : 'Compare Side-by-Side'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setSelectedCompareIds([])}
              className="p-1 text-white/50 hover:text-white rounded-full transition-colors cursor-pointer"
              title="Clear comparison selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Comparison Modal Dialog */}
      {comparisonModalData && (
        <ComparisonModal
          comparisonData={comparisonModalData}
          onClose={() => setComparisonModalData(null)}
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
