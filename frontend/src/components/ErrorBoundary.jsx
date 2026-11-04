import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SpecDiff ErrorBoundary Caught Crash]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { fallbackTitle, fallbackDescription } = this.props;

      return (
        <div className="w-full my-6 p-6 sm:p-8 rounded-3xl bg-porcelain-100 border border-forest-900/15 shadow-sm text-forest-950 font-sans">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-mono font-bold tracking-wider uppercase">
                  Feature Interruption
                </span>
                <span className="text-xs text-forest-900/50 font-mono">
                  Layer: Presentation / Render Boundary
                </span>
              </div>

              <h3 className="text-lg font-bold text-forest-950">
                {fallbackTitle || 'Something went wrong in this section'}
              </h3>

              <p className="text-xs sm:text-sm text-forest-900/70 leading-relaxed">
                {fallbackDescription ||
                  'The application encountered an unexpected render state. Your hardware preferences, comparison tray, and cart are safely preserved.'}
              </p>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-4 py-2 rounded-full bg-forest-900 text-white hover:bg-forest-800 text-xs font-semibold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try Again</span>
                </button>

                <button
                  type="button"
                  onClick={this.handleReload}
                  className="px-4 py-2 rounded-full bg-white hover:bg-forest-900/5 text-forest-900 border border-forest-900/15 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Reload Application</span>
                </button>

                <button
                  type="button"
                  onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                  className="px-3 py-1.5 rounded-full text-[11px] font-mono text-forest-900/60 hover:text-forest-900 flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                >
                  <Terminal className="w-3 h-3" />
                  <span>{this.state.showDetails ? 'Hide Diagnostics' : 'View Diagnostics'}</span>
                  {this.state.showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Collapsible Diagnostics Accordion */}
              {this.state.showDetails && (
                <div className="mt-4 p-4 rounded-2xl bg-forest-950 text-sage-200 font-mono text-xs overflow-x-auto space-y-2 border border-forest-900">
                  <div className="text-rose-400 font-bold">
                    {this.state.error?.toString()}
                  </div>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-[11px] text-white/60 whitespace-pre-wrap leading-tight">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
