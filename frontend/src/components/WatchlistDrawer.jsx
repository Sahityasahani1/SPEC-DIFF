import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bookmark,
  Bell,
  Trash2,
  TrendingDown,
  ExternalLink,
  ShoppingBag,
  Scale,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getProductImage } from '../utils/productImages';

export default function WatchlistDrawer({
  isOpen,
  onClose,
  watchlistItems = [],
  onRemoveWatchlistItem,
  onAddToCart,
  onCompareItem,
  alerts = [],
  onDeleteAlert,
  onSimulateAlert
}) {
  const [activeTab, setActiveTab] = useState('stash'); // 'stash' | 'alerts' | 'drops'

  if (!isOpen) return null;

  const triggeredAlerts = alerts.filter(a => a.is_triggered);
  const activeAlerts = alerts.filter(a => !a.is_triggered);

  // Valuation summary
  const totalValuation = watchlistItems.reduce((acc, item) => {
    const price = Number(item.product?.price || item.price || 0);
    return acc + price;
  }, 0);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[90] overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-forest-950/40 backdrop-blur-sm"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-stone-200"
          >
            {/* Header */}
            <div className="p-5 border-b border-stone-200 bg-forest-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <Bookmark size={16} />
                </div>
                <div>
                  <h3 className="font-syne font-bold text-sm tracking-wide">Hardware Stash & Alerts</h3>
                  <p className="text-[10px] font-mono text-emerald-300/80">Real-Time Market Tracking</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-stone-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav Tabs */}
            <div className="flex items-center border-b border-stone-200 bg-stone-50 p-1.5 text-xs font-mono font-medium">
              <button
                onClick={() => setActiveTab('stash')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'stash'
                    ? 'bg-white text-forest-950 shadow-sm font-bold border border-stone-200'
                    : 'text-stone-600 hover:text-forest-950'
                }`}
              >
                <Bookmark size={13} />
                <span>Stash ({watchlistItems.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('alerts')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'alerts'
                    ? 'bg-white text-forest-950 shadow-sm font-bold border border-stone-200'
                    : 'text-stone-600 hover:text-forest-950'
                }`}
              >
                <Bell size={13} />
                <span>Alerts ({activeAlerts.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('drops')}
                className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'drops'
                    ? 'bg-rose-50 text-rose-800 shadow-sm font-bold border border-rose-200'
                    : 'text-stone-600 hover:text-rose-700'
                }`}
              >
                <Zap size={13} className={triggeredAlerts.length > 0 ? 'text-rose-600 animate-bounce' : ''} />
                <span>Drops ({triggeredAlerts.length})</span>
              </button>
            </div>

            {/* Content List Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* TAB 1: HARDWARE STASH */}
              {activeTab === 'stash' && (
                <>
                  {watchlistItems.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center">
                        <Bookmark size={24} />
                      </div>
                      <h4 className="font-syne font-bold text-sm text-stone-700">Your stash is empty</h4>
                      <p className="text-xs text-stone-500 max-w-xs mx-auto">
                        Click the bookmark icon on any product to save it here for comparison and portfolio tracking.
                      </p>
                    </div>
                  ) : (
                    watchlistItems.map((item) => {
                      const prod = item.product || item;
                      const imageSrc = getProductImage(prod);
                      const price = Number(prod.price || 0);

                      return (
                        <div
                          key={item.id || prod.id}
                          className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-2xl hover:border-emerald-300 transition-all shadow-sm"
                        >
                          <img
                            src={imageSrc}
                            alt={prod.name}
                            className="w-14 h-14 object-contain rounded-xl bg-stone-50 p-1 border border-stone-200"
                            onError={(e) => {
                              e.target.src = 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=300&q=80';
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-mono text-forest-700 uppercase font-bold">
                              {prod.brand}
                            </span>
                            <h5 className="font-medium text-xs text-forest-950 truncate leading-snug">
                              {prod.name}
                            </h5>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-mono font-bold text-xs text-forest-950">
                                ₹{price.toLocaleString()}
                              </span>
                              {prod.price_signal?.signal && (
                                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                                  prod.price_signal.signal === 'STRONG_BUY'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-stone-50 text-stone-700 border-stone-200'
                                }`}>
                                  {prod.price_signal.signal}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            {onCompareItem && (
                              <button
                                onClick={() => onCompareItem(prod)}
                                title="Compare this device"
                                className="p-1.5 rounded-lg text-stone-600 hover:text-forest-950 hover:bg-stone-100 transition-colors"
                              >
                                <Scale size={14} />
                              </button>
                            )}
                            {onAddToCart && (
                              <button
                                onClick={() => onAddToCart(prod)}
                                title="Add to Cart"
                                className="p-1.5 rounded-lg text-stone-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              >
                                <ShoppingBag size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => onRemoveWatchlistItem(prod.id || item.id)}
                              title="Remove from stash"
                              className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* TAB 2: ACTIVE PRICE ALERTS */}
              {activeTab === 'alerts' && (
                <>
                  {activeAlerts.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center">
                        <Bell size={24} />
                      </div>
                      <h4 className="font-syne font-bold text-sm text-stone-700">No active price alerts</h4>
                      <p className="text-xs text-stone-500 max-w-xs mx-auto">
                        Click the bell icon on any product card to set your target threshold.
                      </p>
                    </div>
                  ) : (
                    activeAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3.5 bg-white border border-stone-200 rounded-2xl shadow-sm space-y-2 hover:border-emerald-300 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-mono text-emerald-700 uppercase font-bold">
                              Tracking Threshold
                            </span>
                            <h5 className="font-medium text-xs text-forest-950 truncate">
                              {alert.product_name}
                            </h5>
                          </div>
                          <button
                            onClick={() => onDeleteAlert(alert.id)}
                            title="Cancel alert"
                            className="p-1 text-stone-400 hover:text-rose-600 rounded transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-2 bg-stone-50 rounded-xl font-mono text-xs">
                          <div>
                            <span className="text-[10px] text-stone-500 block">Current Price</span>
                            <span className="font-bold text-forest-950">₹{Number(alert.current_price).toLocaleString()}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-stone-500 block">Target Alert</span>
                            <span className="font-bold text-emerald-700">₹{Number(alert.target_price).toLocaleString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[10px] text-stone-500 font-mono">
                            Potential Savings: ₹{Number(alert.potential_savings).toLocaleString()}
                          </span>
                          {onSimulateAlert && (
                            <button
                              onClick={() => onSimulateAlert(alert.id)}
                              className="text-[10px] font-mono font-medium text-emerald-800 hover:text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hover:bg-emerald-100 transition-all"
                            >
                              Simulate Drop ⚡
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* TAB 3: TRIGGERED PRICE DROPS */}
              {activeTab === 'drops' && (
                <>
                  {triggeredAlerts.length === 0 ? (
                    <div className="text-center py-16 space-y-3">
                      <div className="w-12 h-12 mx-auto rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center">
                        <CheckCircle2 size={24} />
                      </div>
                      <h4 className="font-syne font-bold text-sm text-stone-700">No triggered drops yet</h4>
                      <p className="text-xs text-stone-500 max-w-xs mx-auto">
                        When Indian retail prices dip to your target in our daily sync, notifications appear here!
                      </p>
                    </div>
                  ) : (
                    triggeredAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3.5 bg-gradient-to-r from-emerald-50 to-white border border-emerald-300 rounded-2xl shadow-sm space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 bg-emerald-600 text-white font-mono text-[9px] uppercase font-bold rounded-full flex items-center gap-1">
                            <Zap size={10} /> Target Reached
                          </span>
                          <span className="text-[10px] font-mono text-stone-500">
                            {alert.triggered_at ? new Date(alert.triggered_at).toLocaleDateString() : 'Today'}
                          </span>
                        </div>

                        <h5 className="font-semibold text-xs text-forest-950 truncate">
                          {alert.product_name}
                        </h5>

                        <div className="flex items-center justify-between p-2 bg-white/80 border border-emerald-200 rounded-xl font-mono text-xs">
                          <div>
                            <span className="text-[10px] text-stone-500 block">Triggered Price</span>
                            <span className="font-bold text-emerald-700">
                              ₹{Number(alert.triggered_price || alert.target_price).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-stone-500 block">Your Savings</span>
                            <span className="font-bold text-forest-950">
                              ₹{Number(alert.potential_savings).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => onDeleteAlert(alert.id)}
                            className="text-[10px] font-mono text-stone-500 hover:text-stone-800"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>

            {/* Footer Summary Bar */}
            {activeTab === 'stash' && watchlistItems.length > 0 && (
              <div className="p-4 border-t border-stone-200 bg-stone-50 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-stone-600">Total Portfolio Valuation</span>
                  <span className="font-mono font-bold text-forest-950 text-sm">
                    ₹{totalValuation.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
