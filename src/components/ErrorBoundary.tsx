import React from 'react';

interface State { error: Error | null }

export default class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ArchScape] Render error:', error, info);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          width: '100vw', height: '100vh',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#1e1e26', color: '#e0ddd8',
          fontFamily: 'Inter, sans-serif', gap: '16px', padding: '32px',
          textAlign: 'center',
        }}
      >
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <h2 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Something went wrong</h2>
        <p style={{ color: 'rgba(224,221,216,0.5)', fontSize: '13px', maxWidth: '480px', margin: 0 }}>
          {error.message}
        </p>
        <pre style={{
          background: '#13131a', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '10px', padding: '12px 16px',
          fontSize: '11px', color: '#e07b3f',
          maxWidth: '600px', overflow: 'auto', textAlign: 'left',
          maxHeight: '200px',
        }}>
          {error.stack}
        </pre>
        <button
          onClick={() => { this.setState({ error: null }); window.location.reload(); }}
          style={{
            background: '#e07b3f', color: 'white', border: 'none',
            padding: '10px 24px', borderRadius: '11px',
            fontSize: '13px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          Reload app
        </button>
      </div>
    );
  }
}
