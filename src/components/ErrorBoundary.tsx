import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      'Digital Closet could not render.',
      error,
      info.componentStack,
    )
  }
  render() {
    if (this.state.failed)
      return (
        <main className="main-content">
          <div className="notice" role="alert">
            <h1>Let's reopen your closet</h1>
            <p>
              The app could not display this page. Reload to try again. Your
              saved browser data has not been cleared.
            </p>
            <button
              className="button-primary mt-6"
              onClick={() => window.location.reload()}
            >
              Reload app
            </button>
          </div>
        </main>
      )
    return this.props.children
  }
}
