// Force rebuild: 20260715165500
import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import * as Sentry from '@sentry/react';
import router from './App';
import './index.css';
import './i18n/config';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 0.0,
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: 1,
      staleTime: 0,
    },
  },
});

if (import.meta.env.PROD) {
  console.log('[WellZo] Frontend build deployed successfully');
}

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
  if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.captureException(event.reason);
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        {import.meta.env.DEV && (
          <div className="print:hidden">
            <ReactQueryDevtools initialIsOpen={false} />
          </div>
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
