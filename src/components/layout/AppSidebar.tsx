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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

const getNavigationItems = (role: string) => {
  const baseItems: { title: string, url: string, icon: any, badge?: string }[] = [];

  if (role === 'admin' || role === 'formador' || role === 'teacher' || role === 'profesor') {
    baseItems.push({ title: "Actividad", url: "/admin", icon: Activity });
    baseItems.push({ title: "Usuarios", url: "/usuarios", icon: Users });
  }

  if (role === 'student') {
    baseItems.push({ title: "Mi Formación", url: "/mi-formacion", icon: GraduationCap });
  } else {
    baseItems.push(
      { title: "Programas", url: "/programas", icon: BookOpen },
      { title: "Cursos", url: "/cursos", icon: GraduationCap }
    );
  }

  if (role === 'admin' || role === 'formador' || role === 'teacher' || role === 'profesor') {
    baseItems.push({ title: "Lecciones", url: "/lecciones", icon: PlayCircle });
    baseItems.push({ title: "Trabajos Prácticos", url: "/profesor", icon: Upload });
  }

  baseItems.push(
    { title: "Calendario", url: "/calendario", icon: Calendar },
    { title: "Comunidad", url: "/comunidad", icon: MessageSquare }
  );

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
      ? "bg-muted text-foreground font-medium"
      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all";

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

  const getRoleBadgeVariant = (role?: string) => {
    switch ((role || '').toLowerCase()) {
      case 'admin':
      case 'administrador':
        return 'default';
      case 'teacher':
      case 'formador':
        return 'secondary';
      case 'voluntario':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailto = `mailto:soporte@espaciodegeometriasagrada.com?subject=${encodeURIComponent('Consulta de soporte')}&body=${encodeURIComponent(`De: ${supportEmail}\n\n${supportMessage}`)}`;
    window.location.href = mailto;
    setSupportOpen(false);
  };

  return (
    <Sidebar
      className={collapsed ? "w-16" : "w-64"}
      collapsible="icon"
    >
      <SidebarHeader className="border-b p-4">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <img
              src={theme === 'dark' ? '/Logo-email.png' : '/Logo-claro.png'}
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          </div>
        ) : (
          <img
            src={theme === 'dark' ? '/Logo-email.png' : '/Logo-claro.png'}
            alt="GS"
            className="h-10 w-auto object-contain mx-auto"
          />
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu className="space-y-1">
          {navigationItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild className="h-11">
                <NavLink
                  to={item.url}
                  className={getNavClass}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setOpenMobile(false);
                    }
                  }}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="ml-3">{item.title}</span>}
                  {!collapsed && item.badge && (
                    <Badge variant="secondary" className="ml-auto">{item.badge}</Badge>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <Separator className="my-4" />

        <SidebarMenu className="space-y-1">
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-11">
              <NavLink to="/cuenta" className={getNavClass}>
                <User className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="ml-3">Mi Cuenta</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton onClick={toggleTheme} className="h-11">
              {theme === 'dark' ? (
                <Sun className="h-5 w-5 flex-shrink-0" />
              ) : (
                <Moon className="h-5 w-5 flex-shrink-0" />
              )}
              {!collapsed && (
                <span className="ml-3">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>

          {profile?.role === 'student' && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setSupportOpen(true)} className="h-11">
                <MessageSquare className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="ml-3">Soporte</span>}
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        {!collapsed && profile && (
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors mb-2">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {getUserInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{profile.full_name}</p>
              <Badge variant={getRoleBadgeVariant(profile.role)} className="mt-1 text-xs">
                {getRoleLabel(profile.role)}
              </Badge>
            </div>
          </div>
        )}

        {collapsed && profile && (
          <div className="flex justify-center mb-2">
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {getUserInitials(profile.full_name)}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        <Button
          onClick={signOut}
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          className="w-full justify-start hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Cerrar Sesión</span>}
        </Button>

        <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
          <DialogContent className="max-w-[95vw] sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Enviar consulta</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <div>
                <Label htmlFor="support-email">Tu email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  required
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <Label htmlFor="support-message">Mensaje</Label>
                <Textarea
                  id="support-message"
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  rows={4}
                  required
                  placeholder="Describe tu consulta..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setSupportOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Enviar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarFooter>
    </Sidebar>
  );
}
