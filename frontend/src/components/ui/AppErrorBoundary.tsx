import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: ""
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Arena Camp frontend error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-2xl rounded-arena border border-red-500/30 bg-red-500/10 p-6 text-red-100 shadow-panel">
            <div className="flex items-start gap-4">
              <AlertTriangle className="mt-1 h-6 w-6 shrink-0" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.18em] text-red-200">
                  Runtime Error
                </p>
                <h1 className="mt-2 font-display text-3xl font-bold">
                  O frontend encontrou um erro ao montar a tela
                </h1>
                <p className="mt-4 text-sm leading-6 text-red-100/85">
                  {this.state.errorMessage || "Erro nao identificado."}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
