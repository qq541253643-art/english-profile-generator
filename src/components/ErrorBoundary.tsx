import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <main className="error-page">
        <div className="error-panel" role="alert">
          <AlertTriangle aria-hidden="true" />
          <h1>页面遇到了问题</h1>
          <p>{this.state.message || '发生未知错误，请刷新后重试。'}</p>
          <button type="button" className="button primary" onClick={() => window.location.reload()}>
            <RotateCcw aria-hidden="true" />重新加载
          </button>
        </div>
      </main>
    )
  }
}
