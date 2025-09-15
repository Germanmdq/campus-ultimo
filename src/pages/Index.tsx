// Update this page (the content is just a fallback if you fail to update the page)

import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Redirect authenticated users based on their role
  if (user && profile) {
    switch (profile.role) {
      case 'admin':
        return <Navigate to="/admin" replace />;
      case 'formador':
        return <Navigate to="/profesor" replace />;
      case 'student':
        return <Navigate to="/mi-formacion" replace />;
      default:
        return <Navigate to="/mi-formacion" replace />;
    }
  }

  // Redirect to auth page for non-authenticated users
  return <Navigate to="/auth" replace />;
};

export default Index;
