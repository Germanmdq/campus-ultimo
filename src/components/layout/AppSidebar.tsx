import { useState } from "react";
import { 
  Home, 
  Users, 
  BookOpen, 
  GraduationCap, 
  PlayCircle, 
  Calendar, 
  MessageSquare, 
  User, 
  LogOut,
  Settings,
  Moon,
  Sun,
  Upload,
  Activity,
  Bug
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// Unify logo usage with public asset
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const getNavigationItems = (role: string) => {
  const baseItems: { title: string, url: string, icon: any }[] = [];
  // Quitar Panel de todos los roles

  if (role === 'admin' || role === 'formador' || role === 'teacher' || role === 'profesor') {
    // Acceso directo a la actividad del admin
    baseItems.push({ title: "Actividad", url: "/admin", icon: Activity });
    baseItems.push({ title: "Usuarios", url: "/usuarios", icon: Users });
  }

  // Estudiante: solo 'Mi Formación'
  if (role === 'student') {
    baseItems.push({ title: "Mi Formación", url: "/mi-formacion", icon: GraduationCap });
  } else {
    // Otros roles: Programas y Cursos
    baseItems.push(
      { title: "Programas", url: "/programas", icon: BookOpen },
      { title: "Cursos", url: "/cursos", icon: GraduationCap }
    );
  }
  
  // Solo profesores y admins ven lecciones como gestión
  if (role === 'admin' || role === 'formador' || role === 'teacher' || role === 'profesor') {
    baseItems.push({ title: "Lecciones", url: "/lecciones", icon: PlayCircle });
    baseItems.push({ title: "Trabajos Prácticos", url: "/profesor", icon: Upload });
  }
  
  baseItems.push(
    { title: "Calendario", url: "/calendario", icon: Calendar },
    { title: "Comunidad", url: "/comunidad", icon: MessageSquare }
  );

  // Mostrar Slack solo para roles no-estudiante
  if (role !== 'student') {
    baseItems.push({ title: "Slack", url: "/slack", icon: MessageSquare });
  }

  return baseItems;
};

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const currentPath = location.pathname;

  const navigationItems = getNavigationItems(profile?.role || 'student');
  
  const isActive = (path: string) => currentPath === path;
  
  const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground";

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const collapsed = state === 'collapsed';

  const [supportOpen, setSupportOpen] = useState(false);
  const [supportEmail, setSupportEmail] = useState("");
  const [supportMessage, setSupportMessage] = useState("");

  const getRoleLabel = (role?: string) => {
    switch ((role || '').toLowerCase()) {
      case 'admin':
      case 'administrador':
        return 'Administrador';
      case 'teacher':
      case 'formador':
        return 'Formador';
      case 'voluntario':
        return 'Voluntario';
      case 'student':
      case 'estudiante':
      default:
        return 'Estudiante';
    }
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailto = `mailto:soporte@espaciodegemotriasagrada.com?subject=${encodeURIComponent('Consulta de soporte')}&body=${encodeURIComponent(`De: ${supportEmail}\n\n${supportMessage}`)}`;
    window.location.href = mailto;
    setSupportOpen(false);
  };

  return (
    <Sidebar
      className={collapsed ? "w-14 overflow-hidden" : "w-60 overflow-hidden"}
      collapsible="icon"
      style={{
        background: 'hsl(var(--surface) / 0.9)',
        backdropFilter: 'blur(12px)',
        boxShadow: 'var(--shadow-elev-1)'
      }}
    >
      <SidebarHeader className="border-b border-sidebar-border p-4">
        {!collapsed && (
          <div className="flex items-center justify-center">
            <img src="/Logo-email.png" alt="Logo" className="h-8 w-auto object-contain max-w-[160px]" />
          </div>
        )}
        {collapsed && (
          <img src="/Logo-email.png" alt="GS" className="h-8 w-auto object-contain mx-auto" />
        )}
      </SidebarHeader>

      <SidebarContent className="overflow-hidden scrollbar-hide">
        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && "Navegación"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      className={getNavClass}
                      onClick={() => {
                        // Close mobile sidebar when navigating
                        if (window.innerWidth < 768) {
                          setOpenMobile(false);
                        }
                      }}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="mx-4" />

        {/* Sección de administración removida por ahora */}

        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && "Configuración"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/cuenta" className={getNavClass}>
                    <User className="h-4 w-4" />
                    {!collapsed && <span>Mi Cuenta</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton onClick={toggleTheme}>
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                  {!collapsed && (
                    <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Soporte solo para estudiantes, debajo del toggle */}
              {profile?.role === 'student' && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setSupportOpen(true)}>
                    <MessageSquare className="h-4 w-4" />
                    {!collapsed && <span>Soporte</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && profile && (
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-accent text-accent-foreground text-xs">
                {getUserInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile.full_name}</p>
              <p className="text-xs text-muted-foreground">{getRoleLabel(profile.role)}</p>
            </div>
          </div>
        )}
        
        <Button
          onClick={signOut}
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Salir</span>}
        </Button>

        <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar consulta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSupportSubmit} className="space-y-3">
              <div>
                <Label>Tu email</Label>
                <Input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} required />
              </div>
              <div>
                <Label>Mensaje</Label>
                <Textarea value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} rows={4} required />
              </div>
              <div className="flex justify-end">
                <Button type="submit">Enviar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarFooter>
    </Sidebar>
  );
}