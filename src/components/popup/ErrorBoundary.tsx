import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="bg-[#F4F8FF] flex flex-col justify-center items-center py-6 px-8 min-h-screen">
          <div className="w-full">
            <img src="/popup/home.svg" alt="home" className="w-10 h-10" />
          </div>
          
          <div className="w-full">
            <div className="flex justify-between items-center mb-4">
              <div>{""}</div>
              <h1 className="text-xl font-semibold text-gray-800">Summary</h1>
              <div>{""}</div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <div className="text-red-600 text-lg font-semibold mb-2">
                Something went wrong
              </div>
              <div className="text-red-500 text-sm mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer"
                >
                  Reload Page
                </button>
              </div>
              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4 text-left">
                  <summary className="cursor-pointer text-sm text-gray-600">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 text-xs text-gray-500 overflow-auto max-h-32">
                    {this.state.error?.stack}
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 