import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle2, TrendingDown, ShieldCheck, Mail, Sparkles } from 'lucide-react';
import { createPriceAlert } from '../services/api';
import { getProductImage } from '../utils/productImages';

export default function PriceAlertModal({ product, isOpen, onClose, onAlertCreated }) {
  if (!isOpen || !product) return null;

  const currentPrice = Number(product.price) || 0;
  const atlPrice = product.price_signal?.all_time_low || Math.round(currentPrice * 0.88);

  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('specdiff_user_email') || '';
    } catch {
      return '';
    }
  });

  const [targetPrice, setTargetPrice] = useState(() => Math.round(currentPrice * 0.95));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    setTargetPrice(Math.round(currentPrice * 0.95));
    setError('');
    setSuccess(null);
  }, [product, currentPrice]);

  const preset5 = Math.round(currentPrice * 0.95);
  const preset10 = Math.round(currentPrice * 0.90);
  const presetATL = Math.min(atlPrice, Math.round(currentPrice * 0.92));

  const handleApplyPreset = (val) => {
    setTargetPrice(val);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const targetNum = Number(targetPrice);
    if (!targetNum || targetNum <= 0) {
      setError('Please enter a valid target price.');
      return;
    }
    if (targetNum >= currentPrice) {
      setError(`Target price must be lower than the current price (₹${currentPrice.toLocaleString()}).`);
      return;
    }
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid email address.');
      return;
    }

    setLoading(true);
    try {
      localStorage.setItem('specdiff_user_email', email.trim());
      const res = await createPriceAlert({
        product_id: product.id || product.product_id,
        user_email: email.trim(),
        target_price: targetNum
      });
      setSuccess(res);
      if (onAlertCreated) {
        onAlertCreated(res.alert);
      }
    } catch (err) {
      setError(err.message || 'Failed to register price alert.');
    } finally {
      setLoading(false);
    }
  };

  const potentialSavings = Math.max(0, currentPrice - targetPrice);
  const savingsPct = currentPrice > 0 ? Math.round((potentialSavings / currentPrice) * 100) : 0;
  const imageSrc = getProductImage(product);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-forest-950/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-forest-900 to-forest-800 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                <Bell size={18} className="animate-pulse" />
              </div>
              <div>
                <h3 className="font-syne font-bold text-base leading-tight">Price Drop Watcher</h3>
                <p className="text-[11px] font-mono text-emerald-300/90 tracking-wide uppercase">
                  Daily Midnight Market Tracker
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6">
            {success ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
                  <CheckCircle2 size={36} />
                </div>
                <div>
                  <h4 className="font-syne font-bold text-xl text-forest-950">Price Alert Activated!</h4>
                  <p className="text-xs text-stone-600 mt-1 max-w-sm mx-auto">
                    We are tracking <span className="font-semibold text-forest-900">{product.name}</span>. The moment it drops to or below <span className="font-bold text-emerald-700">₹{Number(targetPrice).toLocaleString()}</span>, you will be notified!
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 font-medium">
                  🎉 Projected Savings: <span className="font-bold font-mono">₹{potentialSavings.toLocaleString()} ({savingsPct}%)</span>
                </div>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-forest-900 text-white font-medium text-xs rounded-xl hover:bg-forest-800 transition-colors shadow-md"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Product Preview Card */}
                <div className="flex items-center gap-3.5 p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                  <img
                    src={imageSrc}
                    alt={product.name}
                    className="w-14 h-14 object-contain rounded-xl bg-white p-1 border border-stone-200"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&q=80';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-forest-700 font-bold">
                      {product.brand || 'Hardware'}
                    </span>
                    <h4 className="font-medium text-xs text-forest-950 truncate">{product.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono font-bold text-sm text-forest-950">
                        ₹{currentPrice.toLocaleString()}
                      </span>
                      {product.price_signal?.all_time_low && (
                        <span className="text-[10px] font-mono text-stone-500">
                          (ATL: ₹{product.price_signal.all_time_low.toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Target Price Configuration */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-forest-900">
                      Target Alert Price (₹)
                    </label>
                    {potentialSavings > 0 && (
                      <span className="text-[11px] font-mono text-emerald-700 font-medium flex items-center gap-1">
                        <TrendingDown size={12} /> Save ₹{potentialSavings.toLocaleString()} ({savingsPct}%)
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min="1000"
                    max={currentPrice - 1}
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full px-4 py-2.5 font-mono text-sm bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                    placeholder="Enter target price"
                    required
                  />

                  {/* Preset Badges */}
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-[10px] font-mono text-stone-500 uppercase">Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset5)}
                      className={`px-2 py-1 text-[10px] font-mono rounded-lg border transition-all ${
                        Number(targetPrice) === preset5
                          ? 'bg-forest-900 text-white border-forest-900'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      -5% (₹{preset5.toLocaleString()})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(preset10)}
                      className={`px-2 py-1 text-[10px] font-mono rounded-lg border transition-all ${
                        Number(targetPrice) === preset10
                          ? 'bg-forest-900 text-white border-forest-900'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      -10% (₹{preset10.toLocaleString()})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset(presetATL)}
                      className={`px-2 py-1 text-[10px] font-mono rounded-lg border transition-all ${
                        Number(targetPrice) === presetATL
                          ? 'bg-emerald-800 text-white border-emerald-800'
                          : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      ATL (₹{presetATL.toLocaleString()})
                    </button>
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-forest-900 mb-1.5">
                    Your Notification Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3 text-stone-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none transition-all"
                      placeholder="e.g. dev@example.com"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-forest-900 text-white font-syne font-semibold text-xs tracking-wider uppercase rounded-xl hover:opacity-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    'Registering Alert...'
                  ) : (
                    <>
                      <Bell size={15} />
                      Set Price Drop Alert
                    </>
                  )}
                </button>

                {/* Automation note */}
                <div className="flex items-center gap-2 pt-1 text-[10px] text-stone-500">
                  <ShieldCheck size={13} className="text-emerald-700 flex-shrink-0" />
                  <span>
                    Checked daily at Midnight 12:00 AM IST against live Indian e-commerce prices.
                  </span>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
