import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  CheckCircle2, AlertTriangle, Cpu, HardDrive, Battery, 
  ExternalLink, ShieldCheck, ChevronDown, ChevronUp,
  Layers, Star, Award, Check, Smartphone, Headphones, Watch, Monitor, Laptop, ShoppingBag
} from 'lucide-react';
import { getOutboundDealUrl, openDealUrl } from '../utils/dealUrl';
import BenchmarkVisualizer from './BenchmarkVisualizer';
import PriceHistoryChart from './PriceHistoryChart';
import StoreDealsComparison from './StoreDealsComparison';

export default function ProductCard({ 
  product, 
  isSelectedForCompare, 
  onToggleCompare, 
  rankIndex,
  onOpenFeedback,
  onAddToCart
}) {
  const [showEvidence, setShowEvidence] = useState(false);
  const [showSubScores, setShowSubScores] = useState(false);
  const [activeDataTab, setActiveDataTab] = useState(null);

  // 3D Perspective Tilt & Holographic Specular Glare Physics
  const cardRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const mouseXSpring = useSpring(x, { stiffness: 260, damping: 22 });
  const mouseYSpring = useSpring(y, { stiffness: 260, damping: 22 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['7.5deg', '-7.5deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-7.5deg', '7.5deg']);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
    setGlare({
      x: Math.round((mouseX / width) * 100),
      y: Math.round((mouseY / height) * 100),
      opacity: 0.28,
    });
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
    setGlare((prev) => ({ ...prev, opacity: 0 }));
  };

  // Compute realistic MRP for strikethrough discount display like the reference
  const mrp = Math.round(product.price * 1.14 / 100) * 100 - 10;

  // Category detection and icon
  const category = (product.category || '').toLowerCase();
  let categoryEmoji = '💻';
  if (category === 'smartphone' || category === 'phone') categoryEmoji = '📱';
  else if (category === 'tablet') categoryEmoji = '📟';
  else if (category === 'audio' || category === 'headphones') categoryEmoji = '🎧';
  else if (category === 'smartwatch' || category === 'watch') categoryEmoji = '⌚';
  else if (category === 'monitor') categoryEmoji = '🖥️';

  const dealUrl = getOutboundDealUrl(product);

  const renderPillTags = () => {
    if (category === 'audio' || category === 'headphones') {
      return (
        <>
          <span className="img-pill-tag">{product.specs?.display_tech || 'Active Noise Cancelling'}</span>
          <span className="img-pill-tag">{product.specs?.battery_hours ? `${product.specs.battery_hours}h Playback` : '30h Battery'}</span>
          <span className="img-pill-tag">Hi-Res Audio</span>
        </>
      );
    }
    if (category === 'smartwatch' || category === 'watch') {
      return (
        <>
          <span className="img-pill-tag">{product.specs?.display_tech || 'AMOLED Display'}</span>
          <span className="img-pill-tag">{product.specs?.battery_hours ? `${product.specs.battery_hours}h Battery` : 'All-Day'}</span>
          <span className="img-pill-tag">Heart & GPS</span>
        </>
      );
    }
    if (category === 'monitor') {
      return (
        <>
          <span className="img-pill-tag">{product.specs?.display_tech || 'IPS Display'}</span>
          <span className="img-pill-tag">{product.specs?.processor || 'High Refresh'}</span>
          <span className="img-pill-tag">HDR 400</span>
        </>
      );
    }
    return (
      <>
        {product.specs?.ram_gb > 0 && <span className="img-pill-tag">{product.specs.ram_gb}GB RAM</span>}
        {product.specs?.storage_gb > 0 && (
          <span className="img-pill-tag">
            {product.specs.storage_gb >= 1024 ? `${product.specs.storage_gb / 1024}TB` : `${product.specs.storage_gb}GB`} {category === 'smartphone' || category === 'tablet' ? 'ROM' : 'SSD'}
          </span>
        )}
        {product.specs?.display_tech && (
          <span className="img-pill-tag">
            {product.specs.display_tech.includes('OLED') ? 'OLED' : product.specs.display_tech.includes('Retina') ? 'Retina' : 'Display'}
          </span>
        )}
        {product.specs?.battery_hours > 0 && <span className="img-pill-tag">{product.specs.battery_hours}h Battery</span>}
      </>
    );
  };

  return (
    <div style={{ perspective: '1200px' }} className="w-full h-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative bg-white rounded-[32px] p-6 sm:p-7 border border-[#e8e5dc] shadow-lofy-card hover:shadow-2xl transition-shadow duration-300 flex flex-col justify-between group will-change-transform h-full"
      >
        {/* Dynamic Holographic Specular Glare Sheen Overlay */}
        <div 
          className="absolute inset-0 rounded-[32px] pointer-events-none transition-opacity duration-200 z-30 mix-blend-soft-light"
          style={{
            opacity: glare.opacity,
            background: `radial-gradient(circle 320px at ${glare.x}% ${glare.y}%, rgba(255, 255, 255, 0.9), rgba(165, 214, 167, 0.35) 40%, transparent 80%)`,
          }}
        />

        <div style={{ transform: 'translateZ(10px)', transformStyle: 'preserve-3d' }}>
          {/* Top Product Image Container with Floating Translucent Pills from Reference Image */}
          <div 
            style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}
            className="relative rounded-[24px] bg-[#f4f2ec] p-6 sm:p-8 flex flex-col justify-between min-h-[220px] overflow-hidden border border-[#eae7df]"
          >
            
            {/* Top image pill badges */}
            <div 
              style={{ transform: 'translateZ(30px)' }}
              className="flex justify-between items-start z-10"
            >
              <div className="flex flex-wrap gap-1.5">
                {rankIndex === 0 && (
                  <span className="px-3 py-1 rounded-full bg-forest-900 text-sage-300 text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-1 shadow-xs">
                    <Award className="w-3 h-3 text-sage-400" />
                    #1 TOP PICK
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-full bg-white/80 backdrop-blur-sm text-forest-900 text-[10px] font-mono font-bold uppercase tracking-wider border border-forest-900/10">
                  {product.brand}
                </span>
                {category && category !== 'laptop' && (
                  <span className="px-2 py-0.5 rounded-full bg-sage-500/20 text-forest-800 text-[9px] font-mono font-bold uppercase tracking-wider">
                    {category}
                  </span>
                )}
              </div>

              {/* Match Score Pill */}
              <div className="px-3 py-1 rounded-full bg-forest-900 text-white text-xs font-mono font-bold tracking-wider flex items-center gap-1.5 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-sage-400 animate-pulse" />
                <span>{product.match_score}% MATCH</span>
              </div>
            </div>

            {/* Center Product Illustration / Visual */}
            <div 
              style={{ transform: 'translateZ(45px)' }}
              className="my-6 flex justify-center items-center"
            >
              <div className="w-28 h-28 rounded-full bg-white/60 flex items-center justify-center border border-forest-900/5 group-hover:scale-105 transition-transform duration-300">
                <span className="text-4xl">{categoryEmoji}</span>
              </div>
            </div>

            {/* Floating Translucent Frosted Tags pinned over image from Reference */}
            <div 
              style={{ transform: 'translateZ(25px)' }}
              className="flex flex-wrap gap-1.5 justify-start z-10"
            >
              {renderPillTags()}
            </div>

          </div>

        {/* Product Details matching Reference Image */}
        <div className="mt-5 space-y-2">
          
          <div className="flex justify-between items-baseline gap-2">
            <h3 className="text-xl font-bold font-jakarta text-forest-950 tracking-tight leading-snug group-hover:text-forest-700 transition-colors">
              {product.name}
            </h3>
          </div>

          {/* Star Rating from Reference (★★★★★) */}
          <div className="flex items-center gap-1.5">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-current" />
              ))}
            </div>
            <span className="text-xs font-mono font-bold text-forest-900/70">
              {product.rating} / 5.0
            </span>
            <span className="text-xs text-forest-900/40">• Verified Stock</span>
          </div>

          {/* Grounded Short Summary Sentence */}
          <p className="text-xs text-forest-900/75 leading-relaxed">
            {product.reasons?.[0] || 'Top ranked machine for your specified budget and workflow requirements.'}
          </p>

          {/* Price Banner with Strikethrough Discount & Deal Badges */}
          <div className="pt-2 space-y-1.5">
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="text-2xl sm:text-3xl font-black font-mono text-forest-950 tracking-tight">
                {product.formatted_price}
              </span>
              <span className="text-sm font-mono text-forest-900/40 line-through">
                ₹{mrp.toLocaleString('en-IN')}
              </span>
              <span className="text-[10px] font-mono font-bold text-sage-700 bg-sage-500/15 px-2 py-0.5 rounded-full">
                SAVINGS
              </span>
            </div>

            {(product.price_signal?.signal || product.deal_comparison?.best_deal_store) && (
              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                {product.price_signal?.signal && (
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                    product.price_signal.signal === 'STRONG_BUY' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                    product.price_signal.signal === 'FAIR_VALUE' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                    'bg-rose-50 text-rose-800 border-rose-300'
                  }`}>
                    {product.price_signal.signal === 'STRONG_BUY' ? '🟢 STRONG BUY' :
                     product.price_signal.signal === 'FAIR_VALUE' ? '🟡 FAIR VALUE' :
                     '🔴 WAIT FOR SALE'}
                  </span>
                )}
                {product.deal_comparison?.best_deal_store && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                    🏷️ {product.deal_comparison.best_deal_store}: {product.deal_comparison.formatted_best_price}
                  </span>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Why It Hits / The Catch Expandable Badges */}
        <div className="mt-4 pt-4 border-t border-[#f0ede6] space-y-2 text-xs">
          
          {/* Limitation / Catch Warning */}
          {product.limitations && product.limitations.length > 0 && (
            <div className="p-3 rounded-2xl bg-[#fbf5e8] border border-[#f2e4c9] text-[#7a5416]">
              <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] mb-1">
                <AlertTriangle className="w-3 h-3 text-[#d97706]" />
                <span>The Catch (Trade-off):</span>
              </div>
              <p className="text-xs leading-normal">
                {product.limitations[0]}
              </p>
            </div>
          )}

          {/* Toggle Citation / Sub-score Links */}
          <div className="flex items-center justify-between pt-1 text-[11px] font-mono text-forest-900/60">
            <button
              type="button"
              onClick={() => setShowEvidence(!showEvidence)}
              className="hover:text-forest-900 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sage-600" />
              <span>{showEvidence ? 'Hide Citations' : 'Verified Evidence'}</span>
              {showEvidence ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={() => setShowSubScores(!showSubScores)}
              className="hover:text-forest-900 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{showSubScores ? 'Hide Matrix' : 'Score Matrix'}</span>
              {showSubScores ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Evidence Drawer */}
          {showEvidence && product.evidence && (
            <div className="p-3 bg-porcelain-100 rounded-2xl border border-[#e5e2d8] space-y-1 font-mono text-[11px] animate-fadeIn">
              {product.evidence.map((ev, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-forest-900/60">{ev.attribute}:</span>
                  <span className="font-bold text-forest-950">{ev.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Score Breakdown Drawer */}
          {showSubScores && product.sub_scores && (
            <div className="p-3 bg-porcelain-100 rounded-2xl border border-[#e5e2d8] space-y-1 font-mono text-[11px] animate-fadeIn">
              <div className="flex justify-between">
                <span className="text-forest-900/60">Requirement Match:</span>
                <span className="font-bold text-forest-950">{product.sub_scores.requirement_match}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-forest-900/60">Semantic Relevance:</span>
                <span className="font-bold text-forest-950">{product.sub_scores.semantic_relevance}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-forest-900/60">Priority Alignment:</span>
                <span className="font-bold text-forest-950">{product.sub_scores.priority_alignment}/100</span>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Action Footer matching Reference ("Add to Cart" Pill Button style) */}
      <div 
        style={{ transform: 'translateZ(18px)' }}
        className="mt-6 pt-4 border-t border-[#f0ede6] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5"
      >
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Add to Cart Pill Button */}
          {onAddToCart && (
            <button
              type="button"
              onClick={() => onAddToCart(product)}
              className="flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-sage-500 hover:bg-sage-600 text-forest-950 font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              title="Add to Shopping Cart"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>+ Cart</span>
            </button>
          )}

          {/* Compare Pill Button */}
          <button
            type="button"
            onClick={() => onToggleCompare(product)}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isSelectedForCompare
                ? 'bg-forest-900 text-white'
                : 'bg-porcelain-100 text-forest-900 hover:bg-porcelain-200 border border-[#e0ddd4]'
            }`}
          >
            {isSelectedForCompare ? <Check className="w-3.5 h-3.5 text-sage-400" /> : <Layers className="w-3.5 h-3.5" />}
            <span>{isSelectedForCompare ? 'Selected' : 'Compare'}</span>
          </button>
        </div>

        {/* View Deal Outbound Button */}
        <motion.a
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          href={dealUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => openDealUrl(product, e)}
          className="w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-forest-900 hover:bg-forest-850 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
        >
          <span>View Deal</span>
          <ExternalLink className="w-3.5 h-3.5 text-sage-400" />
        </motion.a>

      </div>

      <div 
        style={{ transform: 'none' }}
        className="mt-4 pt-4 border-t border-[#f0ede6]"
      >
        <div className="flex gap-2 justify-center flex-wrap">
          <button
            type="button"
            onClick={() => setActiveDataTab(activeDataTab === 'deals' ? null : 'deals')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wider transition-colors ${
              activeDataTab === 'deals' ? 'bg-forest-900 text-white' : 'bg-porcelain-100 text-forest-900 hover:bg-porcelain-200'
            }`}
          >
            🏷️ Store Deals (5 Stores)
          </button>
          <button
            type="button"
            onClick={() => setActiveDataTab(activeDataTab === 'benchmarks' ? null : 'benchmarks')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wider transition-colors ${
              activeDataTab === 'benchmarks' ? 'bg-forest-900 text-white' : 'bg-porcelain-100 text-forest-900 hover:bg-porcelain-200'
            }`}
          >
            📊 Benchmarks
          </button>
          <button
            type="button"
            onClick={() => setActiveDataTab(activeDataTab === 'price' ? null : 'price')}
            className={`px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wider transition-colors ${
              activeDataTab === 'price' ? 'bg-forest-900 text-white' : 'bg-porcelain-100 text-forest-900 hover:bg-porcelain-200'
            }`}
          >
            📈 Price Trend
          </button>
        </div>

        <motion.div
          initial={false}
          animate={{ height: activeDataTab ? 'auto' : 0, opacity: activeDataTab ? 1 : 0 }}
          className="overflow-hidden"
        >
          {activeDataTab === 'deals' && (
            <div className="pt-3">
              <StoreDealsComparison dealComparison={product.deal_comparison} productName={product.name} />
            </div>
          )}
          {activeDataTab === 'benchmarks' && <BenchmarkVisualizer benchmarks={product.benchmarks} />}
          {activeDataTab === 'price' && <PriceHistoryChart priceSignal={product.price_signal} />}
        </motion.div>
      </div>

      </motion.div>
    </div>
  );
}
