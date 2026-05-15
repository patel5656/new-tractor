import React from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from './Button';

/**
 * Global Error Boundary to catch rendering and chunk loading errors.
 * Provides a themed fallback UI to prevent "white screen" crashes.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here
    console.error('[ErrorBoundary] Caught runtime error:', error, errorInfo);
  }

  handleReset = () => {
    // Try to reload the page to clear the error
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isChunkError = this.state.error?.message?.includes('fetch') || 
                          this.state.error?.message?.includes('dynamically') ||
                          this.state.error?.name === 'TypeError';

      return (
        <div className="min-h-screen flex items-center justify-center bg-earth-main p-6">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-earth-dark/10 text-center space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="relative mx-auto w-24 h-24 bg-red-500/10 rounded-3xl flex items-center justify-center text-red-500">
              {isChunkError ? <WifiOff size={48} /> : <AlertTriangle size={48} />}
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl font-black text-earth-brown uppercase italic tracking-tight">
                {isChunkError ? "Connection Interrupted" : "System Glitch Detected"}
              </h1>
              <p className="text-[10px] font-bold text-earth-mut uppercase tracking-[0.2em] leading-relaxed">
                {isChunkError 
                  ? "We couldn't load the requested page data. This usually happens if your connection is lost."
                  : "An unexpected error occurred in the mission control interface."}
              </p>
            </div>

            <div className="pt-4">
              <Button 
                onClick={this.handleReset}
                className="w-full h-14 bg-earth-primary hover:bg-earth-primary-hover text-earth-brown rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-earth-primary/20"
              >
                <RefreshCw size={18} /> Reconnect & Retry
              </Button>
            </div>

            <p className="text-[8px] font-black text-earth-sub uppercase tracking-widest">
              Telemetry code: {isChunkError ? "ERR_CHUNK_LOAD_FAIL" : "ERR_RUNTIME_FAULT"}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
