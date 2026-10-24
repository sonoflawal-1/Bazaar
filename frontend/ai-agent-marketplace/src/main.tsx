import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import App from './App';
import { StellarProvider } from './contexts/StellarContext';
import { WalletProvider } from './contexts/WalletContext';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <StellarProvider>
          <WalletProvider>
            <App />
            <Toaster position="top-right" />
          </WalletProvider>
        </StellarProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);