'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

/**
 * Error Boundary Component
 * Interceptează erorile React și afișează UI de fallback
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    
    // Call optional error handler
    this.props.onError?.(error, errorInfo);
    
    // Store error info in state
    this.setState({ errorInfo });

    // Optional: Send to error tracking service (Sentry, etc.)
    if (typeof window !== 'undefined') {
      // Example: Track error
      console.log('Error details:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
          <Card className="max-w-2xl w-full bg-gray-800 border-red-500/50">
            <CardHeader>
              <CardTitle className="flex items-center text-red-400 text-2xl">
                <AlertTriangle className="h-8 w-8 mr-3" />
                Oops! Ceva nu a mers bine
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-gray-300">
                  Aplicația a întâmpinat o eroare neașteptată. Ne cerem scuze pentru inconvenient.
                </p>
                
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-lg">
                    <p className="text-sm font-mono text-red-400 mb-2">
                      Error: {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <pre className="text-xs text-gray-500 overflow-auto max-h-40">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={this.handleReload}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reîncarcă Pagina
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  variant="outline"
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Înapoi la Pagina Principală
                </Button>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-500">
                  Dacă problema persistă, te rugăm să ștergi cache-ul browserului și să încerci din nou.
                  Pentru asistență, contactează echipa de suport.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary pentru functional components
 * Folosește React 19+ error handling sau manual throw
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return setError;
}
