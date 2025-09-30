import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { setupAuthErrorInterceptor } from './utils/authErrorHandler'

// Configurar interceptor global de errores de autenticación
setupAuthErrorInterceptor();

createRoot(document.getElementById("root")!).render(<App />);
