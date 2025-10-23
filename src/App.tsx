import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { AppLayout } from "@/components/layout/AppLayout";

// Lazy load de páginas para mejor performance
const MisProgramas = lazy(() => import("./pages/MisProgramas"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Profesor = lazy(() => import("./pages/Profesor"));
const Admin = lazy(() => import("./pages/Admin"));
const Programas = lazy(() => import("./pages/Programas"));
const ProgramDetail = lazy(() => import("./pages/ProgramDetail"));
const Cursos = lazy(() => import("./pages/Cursos"));
const CourseDetail = lazy(() => import("./pages/CourseDetail"));
const CourseViewer = lazy(() => import("./pages/CourseViewer"));
const LessonDetail = lazy(() => import("./pages/LessonDetail"));
const ForumPost = lazy(() => import("./pages/ForumPost"));
const Lecciones = lazy(() => import("./pages/Lecciones"));
const Usuarios = lazy(() => import("./pages/Usuarios"));
const MiFormacion = lazy(() => import("./pages/MiFormacion"));
const Calendario = lazy(() => import("./pages/Calendario"));
const Comunidad = lazy(() => import("./pages/Comunidad"));
const Slack = lazy(() => import("./pages/Slack"));
const Cuenta = lazy(() => import("./pages/Cuenta"));
const InscribirUsuario = lazy(() => import("./pages/InscribirUsuario"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const EmailTest = lazy(() => import("./pages/EmailTest"));

// Loading component optimizado
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <>
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
              <Suspense fallback={<PageLoader />}>
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
                  <Route path="/programa/:slug" element={<AppLayout><ProgramDetail /></AppLayout>} />
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
                  <Route path="/slack" element={<AppLayout><Slack /></AppLayout>} />
                  <Route path="/cuenta" element={<AppLayout><Cuenta /></AppLayout>} />
                  <Route path="/test-email" element={<AppLayout><EmailTest /></AppLayout>} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </>
);

export default App;
