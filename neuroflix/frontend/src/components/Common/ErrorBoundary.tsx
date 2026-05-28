import { Component, ReactNode, ErrorInfo } from 'react'

/**
 * ErrorBoundary - A React error boundary component.
 *
 * Error boundaries are React components that catch JavaScript errors anywhere
 * in their child component tree, log those errors, and display a fallback UI
 * instead of the component tree that crashed.
 *
 * Error boundaries catch errors during:
 *  - Rendering
 *  - Lifecycle methods
 *  - Constructors of the whole tree below them
 *
 * Error boundaries do NOT catch errors for:
 *  - Event handlers (use regular try/catch)
 *  - Asynchronous code (setTimeout, requestAnimationFrame, promises)
 *  - Server-side rendering
 *  - Errors thrown in the error boundary itself
 *
 * Error boundaries must be class components because they rely on the lifecycle
 * methods `getDerivedStateFromError` and `componentDidCatch`, which currently
 * have no functional component equivalents.
 *
 * @example
 * // Wrap app or specific components:
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 *
 * @example
 * // With a custom fallback UI:
 * <ErrorBoundary fallback={<CustomErrorScreen />}>
 *   <RiskyComponent />
 * </ErrorBoundary>
 */
export interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

export interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
          <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-400 mb-6">
              We're sorry for the inconvenience. Please try refreshing the page.
            </p>
            <button
              onClick={this.resetError}
              className="
                px-6 py-3 rounded
                bg-red-600 hover:bg-red-700
                text-white font-medium
                transition-colors
              "
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
