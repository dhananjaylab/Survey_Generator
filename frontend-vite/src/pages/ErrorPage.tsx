import * as React from 'react';
import { Link, useRouteError, isRouteErrorResponse } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

export const ErrorPage: React.FC = () => {
  const error = useRouteError();
  
  let errorMessage = 'An unexpected error occurred.';
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      errorMessage = "Sorry, we couldn't find the page you're looking for.";
    } else {
      errorMessage = error.statusText || errorMessage;
    }
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 text-center">
      <h1 className="text-9xl font-bold text-gray-200">!</h1>
      <h2 className="mt-4 text-3xl font-extrabold text-gray-900 tracking-tight sm:text-4xl">
        Oops! Something went wrong.
      </h2>
      <p className="mt-4 text-base text-gray-500 max-w-lg mb-8">
        {errorMessage}
      </p>
      <div className="flex gap-4">
        <Link to="/">
          <Button variant="primary">Go back home</Button>
        </Link>
      </div>
    </div>
  );
};
