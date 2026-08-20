import { Component } from 'react'

// Nur als Klasse möglich: getDerivedStateFromError/componentDidCatch haben keine Hook-Entsprechung.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary hat einen Renderfehler abgefangen:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100vh', padding: '24px', fontFamily: 'sans-serif', background: '#F7F6F2', textAlign: 'center',
        }}>
          <div style={{
            background: 'white', border: '1px solid #E8E6E0', borderRadius: '14px', padding: '32px',
            maxWidth: '520px', width: '100%',
          }}>
            <h1 style={{ fontSize: '18px', fontWeight: '600', color: '#2C2C2A', margin: '0 0 8px' }}>
              Etwas ist schiefgelaufen
            </h1>
            <p style={{ fontSize: '14px', color: '#6B6A64', margin: '0 0 16px', lineHeight: 1.5 }}>
              Beim Rendern ist ein Fehler aufgetreten. Ein Neuladen der Seite behebt das meist.
            </p>
            <pre style={{
              textAlign: 'left', background: '#F7F6F2', border: '1px solid #E8E6E0', borderRadius: '10px',
              padding: '12px', fontSize: '12px', color: '#B84A3E', overflow: 'auto', maxHeight: '160px',
              margin: '0 0 20px', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            }}>
              {this.state.error.message || String(this.state.error)}
            </pre>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '10px 20px', background: '#185FA5', color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '13px', fontWeight: '500', cursor: 'pointer',
              }}
            >
              Seite neu laden
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
