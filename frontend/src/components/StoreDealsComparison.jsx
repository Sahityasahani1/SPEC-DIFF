import React from 'react';
import { ExternalLink, Tag, ShieldCheck, Truck, CreditCard, Sparkles, Award } from 'lucide-react';

export default function StoreDealsComparison({ dealComparison, productName }) {
  if (!dealComparison || !dealComparison.stores || dealComparison.stores.length === 0) {
    return (
      <div className="bg-porcelain-50 rounded-2xl p-4 border border-[#e8e5dc] text-center text-xs text-forest-900/60 font-mono">
        Multi-store live pricing data currently refreshing...
      </div>
    );
  }

  const {
    best_deal_store,
    formatted_best_price,
    highest_price,
    savings_vs_highest,
    savings_pct,
    stores
  } = dealComparison;

  return (
    <div className="bg-white rounded-2xl p-4 border border-[#e8e5dc] shadow-2xs space-y-3 font-jakarta">
      {/* Header Banner: Best Deal & Total Savings */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#f0ece2]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
            <Award className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] uppercase font-bold text-forest-900/60 tracking-wider">
                Lowest Street Price
              </span>
              <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full border border-emerald-300">
                {best_deal_store}
              </span>
            </div>
            <p className="text-sm font-black font-mono text-forest-950">
              {formatted_best_price}
            </p>
          </div>
        </div>

        {savings_vs_highest > 0 && (
          <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl px-3 py-1.5 text-right sm:text-right">
            <span className="text-[10px] font-mono uppercase text-emerald-800 font-bold block">
              Max Savings Found
            </span>
            <span className="text-xs font-bold text-emerald-700 font-mono">
              ₹{savings_vs_highest.toLocaleString('en-IN')} ({savings_pct}% off peak store)
            </span>
          </div>
        )}
      </div>

      {/* Stores Breakdown */}
      <div className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-wider text-forest-900/50 font-bold">
          ⚡ 5-STORE PRICE COMPARISON (INDIA):
        </p>

        {stores.map((store, idx) => {
          const isBest = store.is_best_deal;

          return (
            <div
              key={store.store_id || idx}
              className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                isBest
                  ? 'bg-[#f4f9f4] border-[#bfe2bf] shadow-2xs ring-1 ring-emerald-500/20'
                  : 'bg-[#faf9f5] border-[#eae6db] hover:border-[#ded9cb]'
              }`}
            >
              {/* Store Identity & Badges */}
              <div className="flex items-center gap-2.5 min-w-[130px]">
                <div 
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: store.color || '#4a7c59' }}
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-forest-950">
                      {store.store_name}
                    </span>
                    {isBest && (
                      <span className="bg-emerald-600 text-white text-[9px] font-bold font-mono px-1.5 py-0.2 rounded-full uppercase">
                        Best Deal
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-forest-900/50 font-mono">
                    {store.rating ? `★ ${store.rating}` : 'Verified Partner'} &bull; {store.domain}
                  </span>
                </div>
              </div>

              {/* Price & Bank Offer Details */}
              <div className="flex-1 min-w-0 sm:px-2">
                <div className="flex items-baseline gap-2">
                  <span className={`font-mono font-bold text-sm ${isBest ? 'text-emerald-900' : 'text-forest-950'}`}>
                    {store.formatted_price}
                  </span>
                  {store.formatted_effective_price && store.effective_price < store.price && (
                    <span className="text-[10px] font-mono text-emerald-700 font-semibold bg-emerald-100/70 px-1.5 py-0.2 rounded">
                      Effective: {store.formatted_effective_price}
                    </span>
                  )}
                </div>

                {store.bank_offer && (
                  <p className="text-[10px] text-forest-900/70 truncate flex items-center gap-1 mt-0.5">
                    <CreditCard className="w-2.5 h-2.5 text-sage-600 shrink-0" />
                    <span>{store.bank_offer}</span>
                  </p>
                )}

                {store.delivery && (
                  <p className="text-[10px] text-forest-900/60 truncate flex items-center gap-1">
                    <Truck className="w-2.5 h-2.5 text-forest-900/40 shrink-0" />
                    <span>{store.delivery}</span>
                  </p>
                )}
              </div>

              {/* Action Button: Direct Link to Store */}
              <div className="flex items-center justify-end shrink-0">
                <a
                  href={store.deal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-3 py-1.5 rounded-lg font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                    isBest
                      ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs'
                      : 'bg-forest-900 hover:bg-forest-800 text-white'
                  }`}
                  title={`View deal directly on ${store.store_name}`}
                >
                  <span>Buy on {store.logo_text || store.store_name}</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Safety & Authenticity Guarantee Note */}
      <div className="pt-2 border-t border-[#f0ece2] flex items-center justify-between text-[10px] font-mono text-forest-900/50">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-sage-600" />
          <span>Real-time price normalization & verified dealer listings</span>
        </span>
        <span>All prices in ₹ INR</span>
      </div>
    </div>
  );
}
