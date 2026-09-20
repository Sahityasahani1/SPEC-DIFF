import React, { useState } from 'react';
import { X, ThumbsUp, ThumbsDown, CheckCircle2, MessageSquare } from 'lucide-react';
import { submitFeedback } from '../services/api';

export default function FeedbackModal({ product, recommendationId, onClose }) {
  const [rating, setRating] = useState(1);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitFeedback({
        recommendation_id: recommendationId || 'rec_sample',
        rating: rating,
        comment: comment.trim() || null
      });
      setSubmitted(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      alert('Failed to submit feedback: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="glass-panel bg-[#0d1322]/95 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 border border-white/10 relative overflow-hidden">
        
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        <div className="flex justify-between items-center mb-5">
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Rate This Recommendation
          </h4>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
            <p className="font-extrabold text-white text-base">Thank You for Your Feedback!</p>
            <p className="text-xs text-slate-400">Your telemetry rating directly tunes SpecDiff ranking weights.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Was the recommendation for <strong className="text-cyan-300">{product?.name}</strong> accurate and grounded for your intended workflow?
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRating(1)}
                className={`py-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  rating === 1
                    ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-500/40'
                    : 'border-white/10 bg-dark-900/60 text-slate-400 hover:border-white/20'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Helpful (+1)</span>
              </button>

              <button
                type="button"
                onClick={() => setRating(-1)}
                className={`py-3 rounded-2xl border flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                  rating === -1
                    ? 'border-rose-500/50 bg-rose-500/20 text-rose-300 shadow-md shadow-rose-500/20 ring-1 ring-rose-500/40'
                    : 'border-white/10 bg-dark-900/60 text-slate-400 hover:border-white/20'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>Not Helpful (-1)</span>
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Optional comment or missing details:
              </label>
              <textarea
                rows="3"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="What could be improved? (e.g. Needs better display info, price mismatch...)"
                className="w-full text-xs p-3 rounded-xl border border-white/10 bg-dark-900 text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
