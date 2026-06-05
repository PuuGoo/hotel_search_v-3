"use client";

import React from "react";
import toast from "react-hot-toast";
import { trackError } from "../libs/errorTracker";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    trackError("critical", error.message, {
      componentStack: errorInfo.componentStack,
    }, undefined, error.stack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReport = () => {
    if (this.state.error) {
      trackError("error", `[UserReport] ${this.state.error.message}`, {
        stack: this.state.error.stack,
      });
    }
    toast.success("Đã báo lỗi thành công. Cảm ơn bạn đã phản hồi!");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-2xl dark:border-gray-700 dark:bg-gray-800">
            <div className="mb-4 text-5xl">⚠️</div>
            <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
              Đã xảy ra lỗi
            </h2>
            <p className="mb-1 text-sm text-gray-600 dark:text-gray-400">
              Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.
            </p>
            {process.env.NODE_ENV !== "production" && this.state.error && (
              <p className="mb-6 max-h-32 overflow-auto rounded-lg bg-gray-100 p-3 text-left font-mono text-xs text-red-600 dark:bg-gray-900 dark:text-red-400">
                {this.state.error.message}
              </p>
            )}
            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleRetry}
                className="rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-600"
              >
                Thử lại
              </button>
              <button
                onClick={this.handleReport}
                className="rounded-lg border border-gray-300 bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white"
              >
                Báo lỗi
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
