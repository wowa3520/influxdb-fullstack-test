
import React from 'react';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded p-4 my-2.5 text-red-700">
    <div className={onRetry ? 'mb-2.5' : ''}>
      <strong>Ошибка:</strong> {message}
    </div>
    {onRetry && (
      <button 
        onClick={onRetry}
        className="bg-red-600 text-white border-none px-4 py-2 rounded cursor-pointer hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
      >
        Повторить
      </button>
    )}
  </div>
);
