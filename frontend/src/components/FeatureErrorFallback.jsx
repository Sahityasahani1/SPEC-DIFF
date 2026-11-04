import React, { useState } from 'react';
import { AlertCircle, RefreshCw, Activity, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { checkHealth } from '../services/api';

export default function FeatureErrorFallback({
  featureName = 'Feature',
  layerName = 'Processing Layer',
  errorMessage = 'The operation could not be completed.',
  onRetry = null,
  compact = false
}) {
  const [retrying, setRetrying] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    try {
      await onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const handleCheckHealth = async () => {
    setCheckingHealth(true);
    try {
      const data = await checkHealth();
      setHealthStatus(data ? { ok: true, data } : { ok: false, message: 'Backend unreachable' });
    } catch (err) {
      setHealthStatus({ ok: false, message: err.message });
    } finally {
      setCheckingHealth(false);
    }
  };

  if (compact) {
    return (
      <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="truncate">{errorMessage}</span>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="px-2.5 py-1 rounded-full bg-rose-900 text-white text-[11px] font-semibold shrink-0 flex items-center gap-1 hover:bg-rose-800 disabled:opacity-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${retrying ? 'animate-spin' : ''}`} />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full my-4 p-6 sm:p-7 rounded-3xl bg-rose-50/70 border border-rose-200 text-rose-950 font-sans shadow-xs">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/25 text-rose-700 flex items-center justify-center shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-200/80 text-rose-900 text-[10px] font-mono font-bold tracking-wider uppercase">
              {featureName} Failure
            </span>
            <span className="text-xs text-rose-900/60 font-mono">
              Layer: {layerName}
            </span>
          </div>

          <h4 className="text-base font-bold text-rose-950">
            Unable to complete {featureName.toLowerCase()} operation
          </h4>

          <p className="text-xs sm:text-sm text-rose-900/80 leading-relaxed font-mono bg-white/70 p-3 rounded-xl border border-rose-200/60">
            {errorMessage}
          </p>

          {/* Action Row */}
          <div className="pt-2 flex flex-wrap items-center gap-2.5">
            {onRetry && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={retrying}
                className="px-4 py-2 rounded-full bg-rose-900 text-white hover:bg-rose-800 disabled:opacity-50 text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${retrying ? 'animate-spin' : ''}`} />
                <span>{retrying ? 'Retrying Operation...' : 'Retry Operation'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCheckHealth}
              disabled={checkingHealth}
              className="px-3.5 py-2 rounded-full bg-white hover:bg-rose-100 text-rose-900 border border-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Activity className={`w-3.5 h-3.5 text-rose-700 ${checkingHealth ? 'animate-pulse' : ''}`} />
              <span>{checkingHealth ? 'Pinging API...' : 'Check Backend Health'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDetails(prev => !prev)}
              className="px-3 py-1.5 rounded-full text-xs font-mono text-rose-900/70 hover:text-rose-950 flex items-center gap-1 transition-colors cursor-pointer ml-auto"
            >
              <span>Suggested Fixes</span>
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Backend Health Diagnostic Banner */}
          {healthStatus && (
            <div className={`mt-3 p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
              healthStatus.ok ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              {healthStatus.ok ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Backend Online &bull; {healthStatus.data.products_count} SKUs indexed &bull; Semantic Engine: {healthStatus.data.semantic_engine_ready ? 'Ready' : 'Warming up'}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Backend Connecting / Idle &bull; Cloud service may be waking up (typically takes 30-50s on free tiers)
                  </span>
                </>
              )}
            </div>
          )}

          {/* Collapsible Guidance Details */}
          {showDetails && (
            <div className="mt-3 p-3.5 rounded-xl bg-white/90 border border-rose-200 text-xs text-rose-900/80 space-y-1.5">
              <p className="font-bold text-rose-950">Recommended troubleshooting steps:</p>
              <ul className="list-disc list-inside space-y-1 pl-1">
                <li>If deployed to cloud, free instances spin down on inactivity; wait ~30 seconds for the backend container to wake up.</li>
                <li>Verify your network connection or API service status (<code className="bg-rose-100 px-1 py-0.5 rounded">/api/health</code>).</li>
                <li>Check if query filters (budget, RAM) are too restrictive; try loosening constraints.</li>
                <li>Check browser developer console (F12) for network status codes or CORS issues.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
