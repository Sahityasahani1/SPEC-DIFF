import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { getProducts } from '../services/api';
import { formatINR } from '../utils/formatters';
import { getOutboundDealUrl, openDealUrl } from '../utils/dealUrl';

const CATEGORIES = [
  { id: 'all', label: 'All Items' },
  { id: 'laptop', label: 'Laptops 💻' },
  { id: 'smartphone', label: 'Phones 📱' },
  { id: 'audio', label: 'Audio 🎧' },
  { id: 'tablet', label: 'Tablets 📟' },
  { id: 'smartwatch', label: 'Watches ⌚' },
  { id: 'monitor', label: 'Monitors 🖥️' },
];

export default function CatalogBrowser({ onSelectForCompare, selectedCompareIds = [] }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedBrand, setSelectedBrand] = useState('All Brands');
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    loadProducts();
  }, [selectedBrand, inStockOnly, selectedCategory]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const params = { limit: 120, in_stock_only: inStockOnly };
      if (selectedBrand !== 'All Brands') {
        params.brand = selectedBrand;
      }
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      const data = await getProducts(params);
      setProducts(data.products || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Derive unique brands from loaded products
  const availableBrands = ['All Brands', ...Array.from(new Set(products.map(p => p.brand).filter(Boolean)))].sort();

  const filtered = products.filter((p) => {
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      
      {/* Category Pills Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-forest-900 text-sage-300 shadow-sm border border-sage-500/30'
                : 'bg-dark-900/80 text-slate-400 hover:text-white hover:bg-dark-850 border border-white/5'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search and Filters Header */}
      <div className="glass-panel p-5 rounded-3xl border border-white/10 shadow-xl flex flex-col sm:flex-row gap-4 justify-between items-center bg-dark-900/80">
        
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search electronics by name, chip, brand..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-2xl border border-white/10 bg-dark-950/80 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="text-xs sm:text-sm p-2.5 rounded-2xl border border-white/10 bg-dark-950 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            {availableBrands.map((b) => (
              <option key={b} value={b} className="bg-dark-900 text-slate-200">{b}</option>
            ))}
          </select>

          {/* In Stock Only Checkbox */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300 bg-dark-950/80 px-3.5 py-2.5 rounded-2xl border border-white/10 hover:border-white/20">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-dark-900 border-white/20"
            />
            <span>In-Stock Only</span>
          </label>
        </div>

      </div>

      {/* Catalog Table */}
      <div className="glass-panel rounded-3xl border border-white/10 shadow-xl overflow-hidden bg-dark-900/80">
        <div className="p-4 px-6 border-b border-white/5 flex justify-between items-center bg-dark-950/60">
          <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
            Showing {filtered.length} of {products.length} Verified Products
          </span>
          <span className="text-xs font-mono text-cyan-400">
            Amazon.in &bull; Flipkart &bull; Croma &bull; Apple India Verified
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-sm text-slate-400 font-mono">
            Loading verified Indian laptop dataset...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center text-sm text-slate-400">
            No laptops found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-dark-950/40 text-[10px] uppercase font-mono font-bold text-slate-400">
                  <th className="py-3.5 px-4">Laptop & Brand</th>
                  <th className="py-3.5 px-4">Price (INR)</th>
                  <th className="py-3.5 px-4">Core Hardware</th>
                  <th className="py-3.5 px-4">RAM Upgradeability</th>
                  <th className="py-3.5 px-4">Bundled License</th>
                  <th className="py-3.5 px-4">Battery / Wt</th>
                  <th className="py-3.5 px-4">Inventory</th>
                  <th className="py-3.5 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-sans">
                {filtered.map((p) => {
                  const isChecked = selectedCompareIds.includes(p.id);
                  return (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white leading-snug">{p.name}</div>
                        <div className="text-[11px] font-mono text-slate-400 mt-0.5">{p.brand} &bull; {p.retail_source}</div>
                      </td>

                      <td className="py-3.5 px-4 font-black font-mono text-cyan-400 text-sm">
                        {p.formatted_price}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{p.ram_gb}GB RAM | {p.storage_gb >= 1024 ? `${p.storage_gb / 1024}TB` : `${p.storage_gb}GB`} SSD</div>
                        <div className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]" title={p.processor}>{p.processor}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-semibold border ${
                          p.ram_expandability.includes('Upgradable') || p.ram_expandability.includes('Free')
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/30'
                            : 'bg-dark-900 text-slate-400 border-white/5'
                        }`}>
                          {p.ram_expandability}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="text-slate-300 text-xs">
                          {p.bundled_software}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                        {p.battery_hours}h &bull; {p.weight_kg}kg
                      </td>

                      <td className="py-3.5 px-4">
                        {p.in_stock ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> In Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-400 font-mono text-[11px]">
                            <XCircle className="w-3.5 h-3.5" /> Out of Stock
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={getOutboundDealUrl(p)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => openDealUrl(p, e)}
                            className="text-xs px-3 py-1.5 rounded-xl font-bold bg-forest-900 hover:bg-forest-850 text-sage-300 border border-sage-500/30 flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shadow-xs"
                          >
                            <span>View Deal</span>
                            <ExternalLink className="w-3 h-3 text-sage-400" />
                          </a>

                          {onSelectForCompare && (
                            <button
                              type="button"
                              onClick={() => onSelectForCompare(p.id)}
                              className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                                isChecked
                                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/40'
                                  : 'bg-dark-950 text-slate-300 hover:bg-white/10 border border-white/10'
                              }`}
                            >
                              {isChecked ? 'Selected' : '+ Compare'}
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
        )}

      </div>

    </div>
  );
}
