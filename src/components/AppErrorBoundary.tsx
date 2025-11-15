import React from 'react';

type State = { hasError: boolean; message?: string };

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    let msg = 'Unexpected error';
    if (error instanceof Error) msg = error.message;
    return { hasError: true, message: msg };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    console.error('🧯 App crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ maxWidth: 640, width: '100%', textAlign: 'center' }}>
            <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
            <p style={{ color: '#666', marginBottom: 16 }}>An error occurred while rendering the app.</p>
            {this.state.message && (
              <pre style={{ textAlign: 'left', background: '#111', color: '#eee', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
                {this.state.message}
              </pre>
            )}
            <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', borderRadius: 6, background: '#2563eb', color: '#fff' }}>Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
