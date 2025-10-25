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
      staleTime: 1000 * 60 * 2, // 2 minutos (más corto)
      retry: 1,
      refetchOnWindowFocus: false, // No refetch al cambiar ventana
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
