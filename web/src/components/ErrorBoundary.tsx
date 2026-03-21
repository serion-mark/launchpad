'use client';

import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{ padding: 40, textAlign: 'center', color: '#8b95a1' }}>
          <h2 style={{ marginBottom: 8, color: '#f45452' }}>문제가 발생했습니다</h2>
          <p>{this.state.error?.message || '알 수 없는 오류'}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            style={{ marginTop: 16, padding: '8px 24px', borderRadius: 8, background: '#3182f6', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            다시 시도
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
