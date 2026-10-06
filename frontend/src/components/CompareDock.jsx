import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, ArrowRight, X, Plus } from 'lucide-react';

export default function CompareDock({
  selectedItems = [],
  onRemoveItem,
  onClearAll,
  onCompare,
  loading = false
}) {
  if (!selectedItems || selectedItems.length === 0) return null;

  const count = selectedItems.length;
  const canCompare = count >= 2;

  const getEmoji = (category) => {
    const c = (category || '').toLowerCase();
    if (c === 'smartphone' || c === 'phone') return '📱';
    if (c === 'tablet') return '📟';
    if (c === 'audio' || c === 'headphones') return '🎧';
    if (c === 'smartwatch' || c === 'watch') return '⌚';
    if (c === 'monitor') return '🖥️';
    return '💻';
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-3xl w-[96%] sm:w-auto pointer-events-auto"
      >
        <div className="bg-forest-950/95 backdrop-blur-xl border border-forest-800 text-white rounded-[24px] sm:rounded-[26px] p-2.5 sm:px-4 sm:py-3 shadow-2xl flex flex-col sm:flex-row items-center gap-2 sm:gap-4 max-h-[85vh] overflow-y-auto sm:overflow-visible">
          
          {/* Header indicator */}
          <div className="flex items-center gap-2 pl-1 sm:pl-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-sage-400 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono tracking-widest text-sage-300 font-bold uppercase">
                COMPARE TRAY
              </span>
              <span className="text-[10px] sm:text-[11px] font-mono text-white/50">
                {count} of 3 selected
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden sm:block h-8 w-px bg-white/10 shrink-0" />

          {/* Selected Item Pills */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-center max-w-full">
            {selectedItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-2.5 pr-1 sm:pr-1.5 py-1 rounded-full bg-forest-900/90 border border-white/10 text-xs shadow-xs"
              >
                <span className="text-sm select-none shrink-0">{getEmoji(item.category)}</span>
                <span className="font-bold text-white max-w-[100px] sm:max-w-[140px] truncate" title={item.name}>
                  {item.name}
                </span>
                {item.formatted_price && (
                  <span className="font-mono text-[10px] text-sage-300 bg-white/5 px-1.5 py-0.5 rounded-full hidden md:inline">
                    {item.formatted_price}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  className="p-1 hover:bg-white/15 text-white/50 hover:text-white rounded-full transition-colors cursor-pointer"
                  title={`Remove ${item.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}

            {/* Empty Slot Placeholder if < 3 */}
            {count < 3 && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full border border-dashed border-white/20 text-white/40 text-[11px] font-mono select-none">
                <Plus className="w-3 h-3" />
                <span>{count === 1 ? 'Add 1 or 2 more' : 'Add 1 more'}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-white/10">
            <button
              type="button"
              onClick={onClearAll}
              className="px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              Clear
            </button>

            <motion.button
              whileHover={canCompare && !loading ? { scale: 1.03 } : {}}
              whileTap={canCompare && !loading ? { scale: 0.97 } : {}}
              type="button"
              onClick={onCompare}
              disabled={!canCompare || loading}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                canCompare && !loading
                  ? 'bg-sage-400 hover:bg-sage-300 text-forest-950 font-black shadow-sage-400/20'
                  : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/5'
              }`}
            >
              <span>{loading ? 'Crunching...' : canCompare ? `Compare (${count})` : 'Select 2 to Compare'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
