import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export default function ToastNotification({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3800);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  return (
    <div className="fixed top-5 right-5 z-[80] pointer-events-none flex flex-col items-end">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto max-w-sm w-full bg-forest-950 text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/15 flex items-start gap-3"
          >
            <div className="mt-0.5 shrink-0">
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {toast.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400" />}
              {(!toast.type || toast.type === 'info') && <Info className="w-4 h-4 text-sage-300" />}
            </div>

            <div className="flex-1 text-xs text-white/90 leading-relaxed font-jakarta">
              {toast.message}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 text-white/40 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
