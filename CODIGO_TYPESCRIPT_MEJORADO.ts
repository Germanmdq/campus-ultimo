// CÓDIGO TYPESCRIPT MEJORADO - LISTO PARA COPIAR Y PEGAR

// 1. TIPOS PARA MEJOR TYPE SAFETY
interface DeleteUserResponse {
  success: boolean;
  message?: string;
  error?: string;
  email?: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'student' | 'formador' | 'voluntario';
  created_at: string;
}

// 2. FUNCIÓN PARA ELIMINAR USUARIO CON MEJOR MANEJO
const deleteUser = async (userId: string): Promise<DeleteUserResponse> => {
  try {
    const { data, error } = await supabase.rpc('delete_user_simple', {
      user_id: userId
    });

    if (error) {
      console.error('Error eliminando usuario:', error);
      return { 
        success: false, 
        error: error.message || 'Error desconocido al eliminar usuario' 
      };
    }

    // La función ahora retorna JSON
    return data as DeleteUserResponse;
    
  } catch (error: any) {
    console.error('Error eliminando usuario:', error);
    return { 
      success: false, 
      error: error?.message || 'Error de conexión' 
    };
  }
};

// 3. FUNCIÓN PARA OBTENER USUARIOS MEJORADA
const fetchUsers = async (): Promise<User[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
    
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    return [];
  }
};

// 4. HANDLER MEJORADO CON CONFIRMACIÓN
const handleDeleteUser = async (
  userId: string, 
  userName: string
): Promise<void> => {
  // Confirmación antes de eliminar
  const confirmed = window.confirm(
    `¿Está seguro de eliminar al usuario "${userName}"?\n\nEsta acción no se puede deshacer.`
  );
  
  if (!confirmed) return;

  // Mostrar loading state
  setIsDeleting(true);

  try {
    const result = await deleteUser(userId);
    
    if (result.success) {
      // Mostrar mensaje de éxito
      console.log(`✅ ${result.message} - ${result.email}`);
      
      // Opcional: mostrar toast/notificación
      // toast.success(`Usuario ${result.email} eliminado correctamente`);
      
      // Recargar lista de usuarios
      await fetchUsers();
    } else {
      // Mostrar error
      console.error(`❌ Error: ${result.error}`);
      
      // Opcional: mostrar toast/notificación de error
      // toast.error(result.error);
      
      alert(`No se pudo eliminar el usuario: ${result.error}`);
    }
  } catch (error) {
    console.error('Error inesperado:', error);
    alert('Error inesperado al eliminar el usuario');
  } finally {
    setIsDeleting(false);
  }
};

// 5. COMPONENTE COMPLETO DE EJEMPLO
import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersData = await fetchUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    await handleDeleteUser(userId, userName);
    // Recargar lista después de eliminar
    await loadUsers();
  };

  if (loading) {
    return <div>Cargando usuarios...</div>;
  }

  return (
    <div className="user-management">
      <h2>Gestión de Usuarios</h2>
      
      <div className="users-list">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <div className="user-info">
              <h3>{user.full_name}</h3>
              <p>{user.email}</p>
              <span className={`role role-${user.role}`}>
                {user.role}
              </span>
            </div>
            
            <div className="user-actions">
              <button 
                onClick={() => handleDelete(user.id, user.full_name)}
                disabled={isDeleting}
                className="delete-btn"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 6. ESTILOS CSS (OPCIONAL)
const styles = `
.user-management {
  padding: 20px;
}

.users-list {
  display: grid;
  gap: 16px;
  margin-top: 20px;
}

.user-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
}

.user-info h3 {
  margin: 0 0 8px 0;
  color: #333;
}

.user-info p {
  margin: 0 0 8px 0;
  color: #666;
}

.role {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
}

.role-admin { background: #ff6b6b; color: white; }
.role-student { background: #4ecdc4; color: white; }
.role-formador { background: #45b7d1; color: white; }
.role-voluntario { background: #96ceb4; color: white; }

.delete-btn {
  background: #ff4757;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.delete-btn:hover:not(:disabled) {
  background: #ff3742;
}

.delete-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
`;

export default UserManagement;
