import * as React from 'react';
import { useUIStore } from '@/stores/uiStore';
import { Spinner } from '../Spinner';

export const LoadingOverlay: React.FC = () => {
  const { isLoading } = useUIStore();

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black bg-opacity-25 flex items-center justify-center backdrop-blur-sm">
      <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
        <Spinner size="lg" className="mb-4" />
        <p className="text-gray-700 font-medium text-lg">Loading...</p>
      </div>
    </div>
  );
};
