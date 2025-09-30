import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppLayout } from "@/components/layout/AppLayout";
import MisProgramas from "./pages/MisProgramas";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profesor from "./pages/Profesor";
import Admin from "./pages/Admin";
import Programas from "./pages/Programas";
import ProgramDetail from "./pages/ProgramDetail";
import Cursos from "./pages/Cursos";
import CourseDetail from "./pages/CourseDetail";
import CourseViewer from "./pages/CourseViewer";
import LessonDetail from "./pages/LessonDetail";
import ForumPost from "./pages/ForumPost";
import Lecciones from "./pages/Lecciones";
import Usuarios from "./pages/Usuarios";
import MiFormacion from "./pages/MiFormacion";

import Calendario from "./pages/Calendario";
import Comunidad from "./pages/Comunidad";
// import Mensajes from "./pages/Mensajes";
import Slack from "./pages/Slack";
import Cuenta from "./pages/Cuenta";
import InscribirUsuario from "./pages/InscribirUsuario";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import EmailTest from "./pages/EmailTest";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
              <Route path="/mi-formacion" element={<AppLayout><MiFormacion /></AppLayout>} />
              <Route path="/profesor" element={<AppLayout><Profesor /></AppLayout>} />
              <Route path="/admin" element={<AppLayout><Admin /></AppLayout>} />
              <Route path="/programas" element={<AppLayout><Programas /></AppLayout>} />
              <Route path="/programas/:slug" element={<AppLayout><ProgramDetail /></AppLayout>} />
              <Route path="/cursos" element={<AppLayout><Cursos /></AppLayout>} />
              <Route path="/ver-curso/:courseId" element={<AppLayout><CourseViewer /></AppLayout>} />
              <Route path="/curso/:courseId" element={<AppLayout><CourseViewer /></AppLayout>} />
              <Route path="/mis-programas" element={<AppLayout><MisProgramas /></AppLayout>} />
              <Route path="/leccion/:slug/detalle" element={<AppLayout><LessonDetail /></AppLayout>} />
              <Route path="/curso/:courseId/edit" element={<AppLayout><CourseDetail /></AppLayout>} />
              <Route path="/foro/:id" element={<AppLayout><ForumPost /></AppLayout>} />
              <Route path="/lecciones" element={<AppLayout><Lecciones /></AppLayout>} />
              <Route path="/usuarios" element={<AppLayout><Usuarios /></AppLayout>} />
              <Route path="/inscribir-usuario" element={<AppLayout><InscribirUsuario /></AppLayout>} />
              <Route path="/calendario" element={<AppLayout><Calendario /></AppLayout>} />
              <Route path="/comunidad" element={<AppLayout><Comunidad /></AppLayout>} />
              {/* <Route path="/mensajes" element={<AppLayout><Mensajes /></AppLayout>} /> */}
              <Route path="/slack" element={<AppLayout><Slack /></AppLayout>} />
              <Route path="/cuenta" element={<AppLayout><Cuenta /></AppLayout>} />
              <Route path="/test-email" element={<AppLayout><EmailTest /></AppLayout>} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
