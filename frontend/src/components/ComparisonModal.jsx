import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Trophy, ExternalLink, Check, Minus, Printer, 
  SlidersHorizontal, Cpu, TrendingDown, Battery, HardDrive, 
  Sparkles, Layers, ShieldCheck, ShoppingBag
} from 'lucide-react';
import { getOutboundDealUrl, openDealUrl } from '../utils/dealUrl';
import BenchmarkVisualizer from './BenchmarkVisualizer';
import PriceHistoryChart from './PriceHistoryChart';
import StoreDealsComparison from './StoreDealsComparison';

export default function ComparisonModal({ comparisonData, onClose, onExportDossier, onAddToCart }) {
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'benchmarks' | 'pricing'
  const [showDiffsOnly, setShowDiffsOnly] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!comparisonData || !comparisonData.products || comparisonData.products.length === 0) return null;

  const { products, priority = 'value', winner_reason, priority_winner_id } = comparisonData;

  const getEmoji = (category) => {
    const c = (category || '').toLowerCase();
    if (c === 'smartphone' || c === 'phone') return '📱';
    if (c === 'tablet') return '📟';
    if (c === 'audio' || c === 'headphones') return '🎧';
    if (c === 'smartwatch' || c === 'watch') return '⌚';
    if (c === 'monitor') return '🖥️';
    return '💻';
  };

  // Find best-in-class values for automated metric highlights
  const minPrice = Math.min(...products.map(p => p.price || Infinity));
  const maxRam = Math.max(...products.map(p => p.ram_gb || 0));
  const maxStorage = Math.max(...products.map(p => p.storage_gb || 0));
  const maxBattery = Math.max(...products.map(p => p.battery_hours || 0));
  const minWeight = Math.min(...products.map(p => p.weight_kg || Infinity));

  // Base Spec Definitions
  const specRows = [
    {
      id: 'price',
      label: 'Verified Street Price',
      getValue: (p) => p.price,
      render: (p) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-black text-forest-950 text-base">
            {p.formatted_price}
          </span>
          {p.price === minPrice && products.length > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-[9px] font-bold uppercase tracking-wider">
              Best Price
            </span>
          )}
        </div>
      )
    },
    {
      id: 'status',
      label: 'Decision Match',
      getValue: (p) => p.is_winner,
      render: (p) => p.is_winner ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-900 bg-sage-500/20 px-3 py-1 rounded-full border border-sage-500/30">
          <Trophy className="w-3.5 h-3.5 text-amber-500" />
          <span>Top Match for {priority.toUpperCase()}</span>
        </span>
      ) : (
        <span className="text-forest-900/40 font-mono text-xs">— Alternative</span>
      )
    },
    {
      id: 'rating',
      label: 'Rating & Quality',
      getValue: (p) => p.rating,
      render: (p) => (
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-amber-500 font-bold">★ {p.rating}</span>
          <span className="text-forest-900/40">/ 5.0</span>
        </div>
      )
    },
    {
      id: 'cpu',
      label: 'Processor (CPU)',
      getValue: (p) => p.processor,
      render: (p) => <span className="font-bold text-forest-950 text-xs">{p.processor || '—'}</span>
    },
    {
      id: 'gpu',
      label: 'Graphics (GPU)',
      getValue: (p) => p.gpu,
      render: (p) => <span className="text-forest-900/90 text-xs">{p.gpu || '—'}</span>
    },
    {
      id: 'ram',
      label: 'RAM Capacity',
      getValue: (p) => p.ram_gb,
      render: (p) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-forest-950 text-xs">
            {p.ram_gb > 0 ? `${p.ram_gb} GB RAM` : 'N/A'}
          </span>
          {p.ram_gb > 0 && p.ram_gb === maxRam && products.length > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-sage-500/20 text-forest-800 font-mono text-[9px] font-bold uppercase">
              Max RAM
            </span>
          )}
        </div>
      )
    },
    {
      id: 'ram_exp',
      label: 'RAM Upgradability',
      getValue: (p) => p.ram_expandability,
      render: (p) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
          p.ram_expandability?.toLowerCase().includes('expandable') || p.ram_expandability?.toLowerCase().includes('upgradable')
            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
            : 'bg-porcelain-100 text-forest-900/70'
        }`}>
          {p.ram_expandability || 'Soldered'}
        </span>
      )
    },
    {
      id: 'storage',
      label: 'Storage Capacity',
      getValue: (p) => p.storage_gb,
      render: (p) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-forest-950 text-xs">
            {p.storage_gb >= 1024 ? `${p.storage_gb / 1024} TB SSD` : p.storage_gb > 0 ? `${p.storage_gb} GB SSD` : 'N/A'}
          </span>
          {p.storage_gb > 0 && p.storage_gb === maxStorage && products.length > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-sage-500/20 text-forest-800 font-mono text-[9px] font-bold uppercase">
              Max SSD
            </span>
          )}
        </div>
      )
    },
    {
      id: 'battery',
      label: 'Battery Endurance',
      getValue: (p) => p.battery_hours,
      render: (p) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-forest-950 text-xs">
            {p.battery_hours ? `${p.battery_hours} Hours` : 'N/A'}
          </span>
          {p.battery_hours > 0 && p.battery_hours === maxBattery && products.length > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono text-[9px] font-bold uppercase">
              Longest
            </span>
          )}
        </div>
      )
    },
    {
      id: 'weight',
      label: 'Portability / Weight',
      getValue: (p) => p.weight_kg,
      render: (p) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-forest-900/80">
            {p.weight_kg ? `${p.weight_kg} kg` : 'N/A'}
          </span>
          {p.weight_kg > 0 && p.weight_kg === minWeight && products.length > 1 && (
            <span className="px-2 py-0.5 rounded-full bg-sage-500/20 text-forest-800 font-mono text-[9px] font-bold uppercase">
              Lightest
            </span>
          )}
        </div>
      )
    },
    {
      id: 'display',
      label: 'Display Technology',
      getValue: (p) => p.display_tech,
      render: (p) => <span className="text-xs text-forest-900/90">{p.display_tech || 'Standard Display'}</span>
    },
    {
      id: 'bundled',
      label: 'Software / OS',
      getValue: (p) => p.bundled_software,
      render: (p) => <span className="text-xs text-forest-900/80">{p.bundled_software || 'Windows 11 Home'}</span>
    },
    {
      id: 'retailer',
      label: 'Verified Retail Channel',
      getValue: (p) => p.retail_source,
      render: (p) => (
        <span className="px-2 py-0.5 rounded-md bg-white border border-[#e8e5dc] text-[10px] font-mono text-forest-900/70 font-semibold uppercase">
          {p.retail_source || 'Verified Partner'}
        </span>
      )
    },
    {
      id: 'pros',
      label: 'Key Strengths',
      getValue: (p) => (p.pros || []).join(';'),
      render: (p) => (
        <ul className="text-xs space-y-1.5 text-forest-900/85">
          {p.pros?.map((pro, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{pro}</span>
            </li>
          ))}
        </ul>
      )
    },
    {
      id: 'cons',
      label: 'Trade-offs / Watchouts',
      getValue: (p) => (p.cons || []).join(';'),
      render: (p) => (
        <ul className="text-xs space-y-1.5 text-forest-900/70">
          {p.cons?.map((con, i) => (
            <li key={i} className="flex items-start gap-1.5 text-amber-800/90">
              <Minus className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span className="leading-snug">{con}</span>
            </li>
          ))}
        </ul>
      )
    }
  ];

  // Filter differences if enabled
  const displayedRows = showDiffsOnly
    ? specRows.filter((row) => {
        if (!row.getValue) return true;
        const vals = products.map((p) => String(row.getValue(p) ?? ''));
        return new Set(vals).size > 1; // has differences
      })
    : specRows;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-forest-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-[#fcfbf9] rounded-[36px] border border-[#e8e5dc] shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden text-forest-950">
        
        {/* Top Forest Green Header matching Scandinavian Editorial Tone */}
        <div className="bg-forest-900 text-white p-6 sm:p-8 border-b border-forest-800 relative overflow-hidden shrink-0">
          
          {/* Subtle architectural background grid */}
          <div className="absolute top-6 right-8 flex items-center space-x-1 opacity-20 pointer-events-none">
            <span className="w-2 h-6 rounded-full bg-white" />
            <span className="w-2 h-10 rounded-full bg-white" />
            <span className="w-2 h-8 rounded-full bg-white" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-white/10 text-sage-300 font-mono text-[10px] font-bold uppercase tracking-widest">
                  HARDWARE DIFF ENGINE
                </span>
                <span className="px-3 py-1 rounded-full bg-sage-500/20 text-white font-mono text-[10px] font-bold uppercase tracking-widest border border-sage-500/30">
                  PRIORITY: {priority.toUpperCase()}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-spartan tracking-tight mt-2 uppercase text-white">
                SPEC-DIFF MATRIX
              </h2>
            </div>

            {/* Header Action Controls */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              {onExportDossier && (
                <button
                  type="button"
                  onClick={onExportDossier}
                  className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-mono text-xs tracking-wider uppercase flex items-center gap-2 transition-all border border-white/15 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-sage-300" />
                  <span className="hidden sm:inline">Export Dossier</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Priority Winner Highlight Banner */}
          {winner_reason && (
            <div className="mt-4 p-3.5 rounded-2xl bg-forest-950/70 border border-white/15 flex items-start gap-3 relative z-10">
              <Trophy className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-white/90 leading-relaxed font-jakarta">
                <strong className="text-sage-300 font-bold uppercase tracking-wider block font-mono text-[11px] mb-0.5">
                  DECISION ENGINE RECOMMENDATION
                </strong>
                {winner_reason}
              </div>
            </div>
          )}

        </div>

        {/* View Mode Navigation Tabs */}
        <div className="px-6 sm:px-8 pt-4 pb-3 border-b border-[#e8e5dc] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          
          {/* Sub-tabs with smooth horizontal scroll on mobile */}
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'matrix'
                  ? 'bg-forest-900 text-white shadow-xs'
                  : 'bg-porcelain-100 text-forest-900 hover:bg-porcelain-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Spec Matrix</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('benchmarks')}
              className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'benchmarks'
                  ? 'bg-forest-900 text-white shadow-xs'
                  : 'bg-porcelain-100 text-forest-900 hover:bg-porcelain-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>⚡ 3D & Benchmarks</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'pricing'
                  ? 'bg-forest-900 text-white shadow-xs'
                  : 'bg-porcelain-100 text-forest-900 hover:bg-porcelain-200'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              <span>📈 Price Intelligence</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('deals')}
              className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'deals'
                  ? 'bg-forest-900 text-white shadow-xs'
                  : 'bg-porcelain-100 text-forest-900 hover:bg-porcelain-200'
              }`}
            >
              <span>🏷️ Store Deals</span>
            </button>
          </div>

          {/* Differences Only Filter (in Matrix view) */}
          {activeTab === 'matrix' && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-forest-900/80 select-none">
                <input
                  type="checkbox"
                  checked={showDiffsOnly}
                  onChange={(e) => setShowDiffsOnly(e.target.checked)}
                  className="rounded border-[#c8c5bc] text-forest-900 focus:ring-forest-700 w-4 h-4 cursor-pointer"
                />
                <span>Highlight Differences Only</span>
              </label>
              {showDiffsOnly && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sage-500/20 text-forest-800 font-bold">
                  {displayedRows.length} diffs
                </span>
              )}
            </div>
          )}

        </div>

        {/* Scrollable View Area */}
        <div className="overflow-y-auto flex-1 p-6 sm:p-8 bg-[#fcfbf9]">
          
          {/* VIEW 1: SPEC MATRIX */}
          {activeTab === 'matrix' && (
            <div className="bg-white rounded-3xl border border-[#e8e5dc] shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  
                  {/* Table Column Headers with Product Cards */}
                  <thead>
                    <tr className="border-b border-[#e8e5dc] bg-[#f7f5ef]">
                      <th className="py-5 px-5 text-xs font-mono font-bold uppercase tracking-wider text-forest-900/60 w-1/4 align-top">
                        Specification
                      </th>

                      {products.map((p) => {
                        const dealUrl = getOutboundDealUrl(p);
                        return (
                          <th
                            key={p.id}
                            className={`py-5 px-5 align-top min-w-[240px] ${
                              p.is_winner ? 'bg-sage-500/10' : ''
                            }`}
                          >
                            <div className="space-y-2">
                              {p.is_winner && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase tracking-wider text-forest-900 bg-sage-400 px-2.5 py-0.5 rounded-full shadow-xs">
                                  <Trophy className="w-3 h-3" />
                                  Top Match
                                </span>
                              )}

                              <div className="flex items-center gap-2">
                                <span className="text-xl select-none">{getEmoji(p.category)}</span>
                                <span className="text-xs font-mono uppercase tracking-wider text-forest-900/60 font-semibold">
                                  {p.brand}
                                </span>
                              </div>

                              <div className="font-bold text-forest-950 font-jakarta text-sm leading-snug">
                                {p.name}
                              </div>

                              <div className="font-mono font-black text-forest-950 text-xl tracking-tight">
                                {p.formatted_price}
                              </div>

                              <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                                {onAddToCart && (
                                  <button
                                    type="button"
                                    onClick={() => onAddToCart(p)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-sage-500 hover:bg-sage-600 text-forest-950 text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer"
                                    title="Add to Cart"
                                  >
                                    <ShoppingBag className="w-3 h-3" />
                                    <span>+ Cart</span>
                                  </button>
                                )}
                                <motion.a
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                  href={dealUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => openDealUrl(p, e)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-forest-900 hover:bg-forest-850 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                                >
                                  <span>Deal</span>
                                  <ExternalLink className="w-3 h-3 text-sage-400" />
                                </motion.a>
                              </div>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  {/* Spec Rows */}
                  <tbody className="divide-y divide-[#eceae2] text-sm">
                    {displayedRows.map((row) => (
                      <tr key={row.id} className="hover:bg-[#fbf9f4] transition-colors">
                        <td className="py-3.5 px-5 font-bold text-forest-900/70 text-xs font-jakarta">
                          {row.label}
                        </td>
                        {products.map((p) => (
                          <td
                            key={p.id}
                            className={`py-3.5 px-5 ${p.is_winner ? 'bg-sage-500/5' : ''}`}
                          >
                            {row.render ? row.render(p) : p[row.id]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            </div>
          )}

          {/* VIEW 2: HARDWARE BENCHMARKS & 3D DIE */}
          {activeTab === 'benchmarks' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-[#e8e5dc]">
                <h3 className="font-mono text-xs uppercase tracking-widest text-forest-900/60 font-bold mb-4">
                  COMPUTATIONAL & THERMAL BENCHMARK SHOWDOWN
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((p) => (
                    <div key={p.id} className="bg-[#f7f5ef] rounded-2xl p-5 border border-[#eae7de] flex flex-col justify-between">
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono uppercase text-forest-900/60 font-bold">{p.brand}</span>
                          {p.is_winner && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-forest-900 text-sage-300 font-bold">
                              WINNER
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-forest-950 font-jakarta text-sm leading-snug">{p.name}</h4>
                        <p className="text-xs font-mono text-forest-900/80 font-bold mt-1">{p.formatted_price}</p>
                      </div>

                      <BenchmarkVisualizer benchmarks={p.benchmarks} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: PRICE INTELLIGENCE */}
          {activeTab === 'pricing' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-[#e8e5dc]">
                <h3 className="font-mono text-xs uppercase tracking-widest text-forest-900/60 font-bold mb-4">
                  30-DAY STREET PRICE FLUCTUATION & DEAL SIGNALS
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((p) => (
                    <div key={p.id} className="bg-[#f7f5ef] rounded-2xl p-5 border border-[#eae7de] flex flex-col justify-between">
                      <div className="mb-3 flex justify-between items-start">
                        <div>
                          <span className="text-xs font-mono uppercase text-forest-900/60 font-bold">{p.brand}</span>
                          <h4 className="font-bold text-forest-950 font-jakarta text-sm leading-snug">{p.name}</h4>
                          <p className="text-xs font-mono text-forest-950 font-bold mt-1">{p.formatted_price}</p>
                        </div>
                        {p.is_winner && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-forest-900 text-sage-300 font-bold">
                            TOP VALUE
                          </span>
                        )}
                      </div>

                      <PriceHistoryChart priceSignal={p.price_signal} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW 4: MULTI-STORE PRICE INTELLIGENCE */}
          {activeTab === 'deals' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-[#e8e5dc]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-mono text-xs uppercase tracking-widest text-forest-900/60 font-bold">
                      LIVE MULTI-STORE PRICE COMPARISON (5 RETAILERS)
                    </h3>
                    <p className="text-xs text-forest-900/70 mt-0.5">
                      Real-time cross-store arbitrage across Amazon, Flipkart, Croma, Reliance Digital, and Brand Official Stores.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((p) => (
                    <div key={p.id} className="bg-[#f7f5ef] rounded-2xl p-5 border border-[#eae7de] flex flex-col justify-between">
                      <div className="mb-3 flex justify-between items-start">
                        <div>
                          <span className="text-xs font-mono uppercase text-forest-900/60 font-bold">{p.brand}</span>
                          <h4 className="font-bold text-forest-950 font-jakarta text-sm leading-snug">{p.name}</h4>
                          <p className="text-xs font-mono text-forest-950 font-bold mt-1">Catalog Base: {p.formatted_price}</p>
                        </div>
                        {p.deal_comparison?.best_deal_store && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                            {p.deal_comparison.best_deal_store}
                          </span>
                        )}
                      </div>

                      <StoreDealsComparison dealComparison={p.deal_comparison} productName={p.name} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Bar */}
        <div className="p-4 sm:px-8 sm:py-5 border-t border-[#e8e5dc] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs font-mono text-forest-900/60">
            Comparing {products.length} of 3 items &bull; 100% Deterministic Constraint Engine
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-full bg-forest-900 hover:bg-forest-850 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-sm cursor-pointer"
            >
              Close Matrix
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
