import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupAuthErrorInterceptor } from './utils/authErrorHandler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configurar interceptor global de errores de autenticación
setupAuthErrorInterceptor();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      retry: 1, // Solo 1 reintento
      refetchOnWindowFocus: false, // No refetch al cambiar ventana
      refetchOnReconnect: false, // No refetch al reconectar
    },
  },
});

const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
  const root = createRoot(rootElement);
  root.render(
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}
