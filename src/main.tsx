import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupAuthErrorInterceptor } from './utils/authErrorHandler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Configurar interceptor global de errores de autenticación
setupAuthErrorInterceptor();

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
	<QueryClientProvider client={queryClient}>
		<App />
	</QueryClientProvider>
);
