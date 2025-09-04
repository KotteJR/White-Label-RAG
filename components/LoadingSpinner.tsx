"use client";

import classNames from "classnames";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <div className={classNames("animate-spin rounded-full border-2 border-gray-300 border-t-gray-900", sizeClasses[size], className)} />
  );
}

interface LoadingStateProps {
  message?: string;
  size?: "sm" | "md" | "lg";
  fullScreen?: boolean;
}

export function LoadingState({ message = "Loading...", size = "md", fullScreen = false }: LoadingStateProps) {
  const containerClasses = fullScreen 
    ? "flex items-center justify-center min-h-screen bg-white"
    : "flex items-center justify-center py-8";

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center gap-3">
        <LoadingSpinner size={size} />
        <div className="text-sm text-gray-600 font-medium">{message}</div>
      </div>
    </div>
  );
}

export function LoadingDots({ className }: { className?: string }) {
  return (
    <div className={classNames("flex items-center space-x-1", className)}>
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.2s]"></div>
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400 [animation-delay:-0.1s]"></div>
      <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400"></div>
    </div>
  );
}
