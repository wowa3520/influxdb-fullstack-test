import React from 'react';

interface LoadingProps {
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Загрузка...' }) => (
  <div className="flex justify-center items-center p-5 flex-col">
    <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-2.5" />
    <span className="text-gray-600">{message}</span>
  </div>
);
