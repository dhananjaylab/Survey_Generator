import * as React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';

export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="max-w-4xl mx-auto py-12 text-center">
      <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl md:text-6xl mb-8">
        Welcome to Survey Generator
      </h1>
      <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl mb-10">
        Create, deploy, and analyze surveys in seconds using the power of AI.
      </p>
      
      <div className="flex justify-center space-x-4">
        {isAuthenticated ? (
          <Link to="/project-setup">
            <Button size="lg">Create New Survey</Button>
          </Link>
        ) : (
          <>
            <Link to="/login">
              <Button variant="outline" size="lg">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button size="lg">Get Started</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
