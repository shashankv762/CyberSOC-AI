import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let isFirestoreError = false;

      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error && parsedError.operationType) {
            isFirestoreError = true;
            if (parsedError.error.includes("Missing or insufficient permissions")) {
              errorMessage = "You do not have permission to access this data. Please ensure you are logged in with the correct account and have the necessary administrative privileges.";
            } else {
              errorMessage = `Database Error: ${parsedError.error}`;
            }
          }
        }
      } catch (e) {
        // Not a JSON error string, use default message or error.message
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-soc-bg rounded-xl border border-soc-red/20">
          <div className="w-16 h-16 bg-soc-red/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-soc-red" />
          </div>
          <h2 className="text-xl font-bold text-soc-text mb-2">Something went wrong</h2>
          <p className="text-soc-muted max-w-md mb-6">
            {errorMessage}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-soc-blue/10 text-soc-blue hover:bg-soc-blue/20 border border-soc-blue/30 rounded-lg font-bold flex items-center gap-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
