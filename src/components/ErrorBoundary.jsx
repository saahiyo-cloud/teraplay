import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

/**
 * Catches render errors and shows a recovery UI instead of a white screen.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#/';
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = '#/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 grid place-items-center text-rose-400">
              <AlertCircle size={28} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-fg mb-2">Something went wrong</h1>
              <p className="text-sm text-muted leading-relaxed">
                {this.state.error?.message || 'An unexpected error occurred.'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={this.handleGoHome}
                className="px-5 py-2.5 bg-surface-elevated border border-custom-border text-fg rounded-xl text-sm font-semibold hover:bg-surface transition-all cursor-pointer"
              >
                Go Home
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent text-bg rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                <RotateCcw size={14} />
                Reload App
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
