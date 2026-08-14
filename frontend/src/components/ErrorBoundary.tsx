import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[APS Uncaught Error Caught by Boundary]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-[#090d16] text-white flex flex-col items-center justify-center p-6 select-none">
          <div className="max-w-2xl w-full bg-slate-900 border border-rose-600/60 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-600/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-xl">
                ⚠️
              </div>
              <div>
                <h1 className="text-base font-bold text-rose-300">
                  Bir Arayüz Hatası Yakalandı (UI Error Caught)
                </h1>
                <p className="text-xs text-slate-400 font-mono">
                  {this.state.error?.message || 'Bilinmeyen bir hata oluştu'}
                </p>
              </div>
            </div>

            {this.state.errorInfo && (
              <pre className="bg-slate-950 p-4 rounded-lg text-[11px] font-mono text-rose-200/90 overflow-x-auto max-h-60 border border-slate-800">
                {this.state.error?.stack}
                {'\n\nComponent Stack:'}
                {this.state.errorInfo.componentStack}
              </pre>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-xs font-semibold"
              >
                Önbelleği Temizle & Yenile
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-lg shadow-cyan-950"
              >
                Sayfayı Yeniden Yükle
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
