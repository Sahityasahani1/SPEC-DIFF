import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sliders, Cpu, HardDrive, BatteryCharging, Zap, Feather, Tag, 
  Sparkles, RefreshCw, ChevronRight, CheckCircle2 
} from 'lucide-react';
import { formatINR } from '../utils/formatters';

const CATEGORY_OPTIONS = [
  { id: 'all', label: 'All Items', icon: '⚡' },
  { id: 'laptop', label: 'Laptops', icon: '💻' },
  { id: 'smartphone', label: 'Phones', icon: '📱' },
  { id: 'audio', label: 'Audio & ANC', icon: '🎧' },
  { id: 'tablet', label: 'Tablets', icon: '📟' },
  { id: 'smartwatch', label: 'Watches', icon: '⌚' },
  { id: 'monitor', label: 'Monitors', icon: '🖥️' },
];

const PRICE_CHIPS = [
  { label: '< ₹30k', budget: 30000, priority: 'price' },
  { label: '₹30k–₹50k', budget: 50000, priority: 'value' },
  { label: '₹50k–₹85k', budget: 85000, priority: 'performance' },
  { label: '₹85k–₹1.25L', budget: 125000, priority: 'battery' },
  { label: '₹1.25L+', budget: 180000, priority: 'performance' },
];

const PRIORITIES = [
  { id: 'value', label: 'BEST VALUE', desc: 'Spec per ₹', icon: Zap },
  { id: 'performance', label: 'PERFORMANCE', desc: 'Speed & chip', icon: Cpu },
  { id: 'battery', label: 'BATTERY', desc: 'Max endurance', icon: BatteryCharging },
  { id: 'portability', label: 'PORTABILITY', desc: 'Lightweight', icon: Feather },
  { id: 'price', label: 'LOWEST PRICE', desc: 'Max savings', icon: Tag },
];

const BRANDS = ['Any', 'Apple', 'Samsung', 'Sony', 'OnePlus', 'Dell', 'ASUS', 'HP', 'Lenovo', 'Xiaomi', 'Bose', 'LG'];

export default function RecommendationForm({ onSubmit, loading, initialValues }) {
  const [category, setCategory] = useState(initialValues?.category || 'all');
  const [maxBudget, setMaxBudget] = useState(initialValues?.max_budget || 84999);
  const [minRam, setMinRam] = useState(initialValues?.min_ram_gb || 0);
  const [minStorage, setMinStorage] = useState(initialValues?.min_storage_gb || 0);
  const [useCase, setUseCase] = useState(
    initialValues?.use_case || 'Fast performance, all-day battery life, and crisp display for productive workflows.'
  );
  const [brand, setBrand] = useState(initialValues?.brand || 'Any');
  const [priority, setPriority] = useState(initialValues?.priority || 'value');

  useEffect(() => {
    if (initialValues) {
      if (initialValues.category) setCategory(initialValues.category);
      if (initialValues.max_budget) setMaxBudget(initialValues.max_budget);
      if (initialValues.min_ram_gb !== undefined) setMinRam(initialValues.min_ram_gb);
      if (initialValues.min_storage_gb !== undefined) setMinStorage(initialValues.min_storage_gb);
      if (initialValues.use_case) setUseCase(initialValues.use_case);
      if (initialValues.priority) setPriority(initialValues.priority);
    }
  }, [initialValues]);

  const isZeroRamCategory = ['audio', 'smartwatch', 'monitor'].includes(category);
  const isMobileCategory = ['smartphone', 'tablet'].includes(category);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      category: category,
      max_budget: Number(maxBudget),
      min_ram_gb: isZeroRamCategory ? 0 : Number(minRam),
      min_storage_gb: isZeroRamCategory ? 0 : Number(minStorage),
      use_case: useCase.trim(),
      brand: brand === 'Any' ? null : brand,
      priority: priority
    });
  };

  const applyChip = (chip) => {
    setMaxBudget(chip.budget);
    setPriority(chip.priority);
  };

  return (
    <div className="bg-white rounded-[32px] p-7 sm:p-8 border border-[#e8e5dc] shadow-lofy-card relative">
      
      {/* Header matching LOFY Reference */}
      <div className="pb-5 border-b border-[#f0ede6] mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="px-3 py-1 rounded-full bg-sage-500/15 text-forest-800 text-[10px] font-mono font-bold tracking-widest uppercase">
            CONFIGURATOR
          </span>
          <span className="text-[11px] font-mono text-forest-900/50">
            01 / PARAMETERS
          </span>
        </div>
        
        <h2 className="text-xl sm:text-2xl font-spartan font-black text-forest-950 uppercase tracking-tight">
          Build Your Hard Limits
        </h2>
        <p className="text-xs text-forest-900/60 mt-1">
          Guaranteed zero out-of-budget or under-spec items across all electronic categories.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Category Selector Pills */}
        <div>
          <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-forest-900/70 mb-2">
            ELECTRONICS CATEGORY
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                type="button"
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  category === cat.id
                    ? 'bg-forest-900 text-sage-300 font-bold shadow-xs'
                    : 'bg-porcelain-100 text-forest-900/70 hover:bg-porcelain-200'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 1. Budget Slider with Minimalist Display */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-forest-900/70">
              TARGET BUDGET
            </label>
            <div className="text-right">
              <span className="text-3xl font-black font-mono text-forest-950 tracking-tight">
                {formatINR(maxBudget)}
              </span>
            </div>
          </div>

          {/* Slider input */}
          <input
            type="range"
            min="10000"
            max="200000"
            step="2000"
            value={maxBudget}
            onChange={(e) => setMaxBudget(Number(e.target.value))}
            className="w-full my-2 cursor-pointer"
          />

          {/* Quick Price Tiers as refined pill buttons */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PRICE_CHIPS.map((chip, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => applyChip(chip)}
                className={`text-xs px-3 py-1.5 rounded-full font-mono transition-all cursor-pointer ${
                  maxBudget === chip.budget
                    ? 'bg-forest-900 text-white font-bold shadow-xs'
                    : 'bg-porcelain-100 text-forest-900/70 border border-transparent hover:border-forest-900/20'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Hardware Floors: RAM & Storage */}
        <div>
          {isZeroRamCategory ? (
            <div className="p-3.5 rounded-2xl bg-[#f7f6f2] border border-[#e8e5dc] text-xs text-forest-900/80 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sage-600 shrink-0" />
              <span>
                Zero RAM requirement. Evaluated directly on acoustic drivers, ANC, display fidelity, and battery stamina.
              </span>
            </div>
          ) : isMobileCategory ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-forest-900/70 mb-2">
                  RAM FLOOR (PHONE / TAB)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 6, 8, 12].map((gb) => (
                    <button
                      type="button"
                      key={gb}
                      onClick={() => setMinRam(gb)}
                      className={`py-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer ${
                        minRam === gb
                          ? 'bg-forest-900 text-white shadow-xs'
                          : 'bg-porcelain-100 text-forest-900/60 hover:bg-porcelain-200'
                      }`}
                    >
                      {gb === 0 ? 'Any' : `${gb}GB`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-forest-900/70 mb-2">
                  STORAGE CAPACITY
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[0, 128, 256].map((gb) => (
                    <button
                      type="button"
                      key={gb}
                      onClick={() => setMinStorage(gb)}
                      className={`py-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer ${
                        minStorage === gb
                          ? 'bg-forest-900 text-white shadow-xs'
                          : 'bg-porcelain-100 text-forest-900/60 hover:bg-porcelain-200'
                      }`}
                    >
                      {gb === 0 ? 'Any' : `${gb}GB`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-forest-900/70 mb-2">
                  RAM FLOOR
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 8, 16, 32].map((gb) => (
                    <button
                      type="button"
                      key={gb}
                      onClick={() => setMinRam(gb)}
                      className={`py-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer ${
                        minRam === gb
                          ? 'bg-forest-900 text-white shadow-xs'
                          : 'bg-porcelain-100 text-forest-900/60 hover:bg-porcelain-200'
                      }`}
                    >
                      {gb === 0 ? 'Any' : `${gb}GB`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-forest-900/70 mb-2">
                  SSD / STORAGE
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[0, 512, 1024].map((gb) => (
                    <button
                      type="button"
                      key={gb}
                      onClick={() => setMinStorage(gb)}
                      className={`py-2 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer ${
                        minStorage === gb
                          ? 'bg-forest-900 text-white shadow-xs'
                          : 'bg-porcelain-100 text-forest-900/60 hover:bg-porcelain-200'
                      }`}
                    >
                      {gb === 0 ? 'Any' : gb >= 1024 ? '1TB' : `${gb}GB`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Intended Workflow (RAG Query Console) */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-forest-900/70">
              INTENDED USAGE & PRIORITIES
            </label>
            <span className="text-[10px] font-mono text-sage-600 font-bold">
              • DENSE VECTOR RAG
            </span>
          </div>

          <textarea
            rows="3"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            placeholder="Describe your workflows (e.g. photography, coding in Python, active noise cancelling for flights, gaming...)"
            className="w-full text-xs sm:text-sm p-3.5 rounded-2xl border border-[#e8e5dc] bg-porcelain-50 text-forest-950 focus:ring-2 focus:ring-sage-500 focus:border-transparent outline-none transition-all placeholder:text-forest-900/40"
            required
            minLength={3}
          />
        </div>

        {/* 4. OPTIMIZE FOR */}
        <div>
          <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-forest-900/70 mb-2">
            OPTIMIZE FOR
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRIORITIES.map((p) => {
              const Icon = p.icon;
              const isActive = priority === p.id;
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setPriority(p.id)}
                  className={`p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    isActive
                      ? 'bg-forest-900 text-white shadow-sm'
                      : 'bg-porcelain-100 text-forest-900/70 hover:bg-porcelain-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sage-400' : 'text-forest-900/60'}`} />
                    <span className="text-[11px] font-mono font-bold leading-tight">{p.label}</span>
                  </div>
                  <div className={`text-[10px] ${isActive ? 'text-white/70' : 'text-forest-900/50'}`}>
                    {p.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Brand Preference */}
        <div>
          <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-forest-900/70 mb-1.5">
            PREFERRED BRAND (OPTIONAL)
          </label>
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="w-full text-xs sm:text-sm p-2.5 rounded-xl border border-[#e8e5dc] bg-porcelain-50 text-forest-950 focus:ring-2 focus:ring-sage-500 outline-none cursor-pointer"
          >
            {BRANDS.map((b) => (
              <option key={b} value={b}>
                {b === 'Any' ? 'Any Brand (Recommended)' : b}
              </option>
            ))}
          </select>
        </div>

        {/* Primary Action Button: Solid Forest Green Pill Button */}
        <motion.button
          type="submit"
          disabled={loading}
          whileHover={{ scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="w-full py-4 px-6 rounded-full bg-forest-900 hover:bg-forest-850 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-forest-950/15"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-sage-400" />
              <span>Finding Evidence-Grounded Recommendations...</span>
            </>
          ) : (
            <>
              <span>Get Grounded Recommendations</span>
              <ChevronRight className="w-4 h-4 text-sage-400" />
            </>
          )}
        </motion.button>

      </form>
    </div>
  );
}
