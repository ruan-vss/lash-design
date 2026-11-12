import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) console.error(error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div role="alert" className="min-h-screen flex flex-col items-center justify-center text-center px-4 bg-nude-50">
        <h1 className="font-serif text-h2 font-semibold text-espresso-900">Algo deu errado</h1>
        <p className="text-small text-nude-700 mt-2 mb-6">Ocorreu um erro inesperado. Recarregue a página para continuar.</p>
        <button type="button" className="btn-primary px-5 py-2.5 rounded-xl bg-nude-600 text-white font-semibold" onClick={() => window.location.reload()}>
          Recarregar
        </button>
      </div>
    );
  }
}
