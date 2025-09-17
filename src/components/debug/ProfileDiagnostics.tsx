import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Upload, User, Database, Image, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ProfileDiagnostics = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [diagnostics, setDiagnostics] = useState({
    auth: { status: 'checking', message: 'Verificando autenticación...' },
    profile: { status: 'checking', message: 'Verificando perfil...' },
    storage: { status: 'checking', message: 'Verificando storage...' },
    permissions: { status: 'checking', message: 'Verificando permisos...' }
  });

  const [testResults, setTestResults] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  // Ejecutar diagnósticos reales
  useEffect(() => {
    if (user) {
      runRealDiagnostics();
    }
  }, [user, profile]);

  const runRealDiagnostics = async () => {
    setLoading(true);
    
    try {
      // 1. Verificar autenticación
      const authStatus = user ? 'success' : 'error';
      const authMessage = user ? `Usuario autenticado: ${user.email}` : 'No hay usuario autenticado';

      // 2. Verificar perfil
      let profileStatus = 'checking';
      let profileMessage = 'Verificando perfil...';
      
      if (profile) {
        if (profile.full_name && profile.full_name !== 'Usuario') {
          profileStatus = 'success';
          profileMessage = `Perfil correcto: ${profile.full_name}`;
        } else {
          profileStatus = 'warning';
          profileMessage = `Perfil con nombre por defecto: "${profile.full_name || 'Usuario'}"`;
        }
      } else {
        profileStatus = 'error';
        profileMessage = 'No se encontró perfil en la base de datos';
      }

      // 3. Verificar storage
      let storageStatus = 'checking';
      let storageMessage = 'Verificando bucket avatars...';
      
      try {
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
        if (bucketsError) throw bucketsError;
        
        const avatarsBucket = buckets?.find(b => b.id === 'avatars');
        if (avatarsBucket) {
          storageStatus = 'success';
          storageMessage = 'Bucket "avatars" configurado correctamente';
        } else {
          storageStatus = 'error';
          storageMessage = 'Bucket "avatars" no encontrado';
        }
      } catch (error) {
        storageStatus = 'error';
        storageMessage = `Error verificando storage: ${error.message}`;
      }

      // 4. Verificar permisos
      let permissionsStatus = 'checking';
      let permissionsMessage = 'Verificando políticas RLS...';
      
      try {
        // Intentar una operación simple para verificar permisos
        const { error: testError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user?.id)
          .single();
        
        if (testError) {
          permissionsStatus = 'error';
          permissionsMessage = `Error de permisos: ${testError.message}`;
        } else {
          permissionsStatus = 'success';
          permissionsMessage = 'Permisos RLS funcionando correctamente';
        }
      } catch (error) {
        permissionsStatus = 'warning';
        permissionsMessage = 'No se pudieron verificar permisos completamente';
      }

      setDiagnostics({
        auth: { status: authStatus, message: authMessage },
        profile: { status: profileStatus, message: profileMessage },
        storage: { status: storageStatus, message: storageMessage },
        permissions: { status: permissionsStatus, message: permissionsMessage }
      });

    } catch (error) {
      console.error('Error en diagnósticos:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatusIcon = ({ status }) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />;
    }
  };

  const checkSupabaseConnection = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      
      const result = {
        test: 'Conexión Supabase',
        status: error ? 'error' : 'success',
        details: error ? `Error: ${error.message}` : 'Conexión exitosa a la base de datos'
      };
      setTestResults(prev => [...prev, result]);
    } catch (error) {
      const result = {
        test: 'Conexión Supabase',
        status: 'error',
        details: `Error: ${error.message}`
      };
      setTestResults(prev => [...prev, result]);
    } finally {
      setLoading(false);
    }
  };

  const checkProfileData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, role')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      const result = {
        test: 'Datos de Perfil',
        status: data.full_name === 'Usuario' || !data.full_name ? 'warning' : 'success',
        details: `full_name: "${data.full_name || 'NULL'}", avatar_url: ${data.avatar_url ? 'Sí' : 'No'}, role: ${data.role}`
      };
      setTestResults(prev => [...prev, result]);
    } catch (error) {
      const result = {
        test: 'Datos de Perfil',
        status: 'error',
        details: `Error: ${error.message}`
      };
      setTestResults(prev => [...prev, result]);
    } finally {
      setLoading(false);
    }
  };

  const checkStoragePermissions = async () => {
    setLoading(true);
    try {
      // Verificar bucket
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      if (bucketsError) throw bucketsError;

      const avatarsBucket = buckets?.find(b => b.id === 'avatars');
      
      const result = {
        test: 'Permisos de Storage',
        status: avatarsBucket ? 'success' : 'error',
        details: avatarsBucket 
          ? `Bucket "avatars" encontrado (${avatarsBucket.public ? 'público' : 'privado'})`
          : 'Bucket "avatars" no encontrado'
      };
      setTestResults(prev => [...prev, result]);
    } catch (error) {
      const result = {
        test: 'Permisos de Storage',
        status: 'error',
        details: `Error: ${error.message}`
      };
      setTestResults(prev => [...prev, result]);
    } finally {
      setLoading(false);
    }
  };

  const testFileUpload = async () => {
    if (!selectedFile) {
      setUploadStatus({ type: 'error', message: 'Selecciona un archivo primero' });
      return;
    }

    setUploadStatus({ type: 'loading', message: 'Subiendo archivo...' });
    
    try {
      // Generar nombre único
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `test-avatar-${Date.now()}.${fileExt}`;

      // Intentar subir
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, selectedFile);

      if (error) {
        setUploadStatus({ 
          type: 'error', 
          message: `Error: ${error.message}` 
        });
      } else {
        // Eliminar archivo de prueba
        await supabase.storage.from('avatars').remove([fileName]);
        
        setUploadStatus({ 
          type: 'success', 
          message: 'Subida exitosa! (archivo de prueba eliminado)' 
        });
      }
    } catch (error) {
      setUploadStatus({ 
        type: 'error', 
        message: `Error: ${error.message}` 
      });
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadStatus({ type: 'error', message: 'Archivo demasiado grande (máximo 5MB)' });
        return;
      }
      if (!file.type.startsWith('image/')) {
        setUploadStatus({ type: 'error', message: 'Solo se permiten imágenes' });
        return;
      }
      setSelectedFile(file);
      setUploadStatus(null);
    }
  };

  const fixUserNames = async () => {
    setLoading(true);
    try {
      // Obtener usuarios sin nombres
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .or('full_name.is.null,full_name.eq.,full_name.eq.Usuario');

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        toast({
          title: "✅ Completado",
          description: "Todos los perfiles ya tienen nombres",
        });
        return;
      }

      // Obtener datos de auth
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      let updated = 0;

      for (const profile of profiles) {
        const authUser = users?.find(u => u.id === profile.id);
        if (!authUser) continue;

        // Extraer nombre del email si no hay metadata
        const newName = authUser.email?.split('@')[0] || 'Usuario';
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ full_name: newName })
          .eq('id', profile.id);

        if (!updateError) {
          updated++;
        }
      }

      toast({
        title: "🎉 ¡Completado!",
        description: `Se arreglaron ${updated} nombres de usuarios`,
      });

      // Refrescar diagnósticos
      runRealDiagnostics();

    } catch (error) {
      console.error('Error arreglando nombres:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Error al arreglar nombres",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Diagnóstico de Perfiles</h1>
        <p className="text-gray-600">Herramienta para detectar problemas con nombres de usuario y subida de avatares</p>
      </div>

      {/* Panel de Diagnósticos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Estado del Sistema
            <Button 
              onClick={runRealDiagnostics} 
              disabled={loading}
              size="sm" 
              variant="outline" 
              className="ml-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(diagnostics).map(([key, diagnostic]) => (
              <div key={key} className="flex items-center p-3 border rounded-lg">
                <StatusIcon status={diagnostic.status} />
                <div className="ml-3">
                  <div className="font-medium capitalize">{key}</div>
                  <div className="text-sm text-gray-600">{diagnostic.message}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tests Manuales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            Tests de Diagnóstico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <Button 
              onClick={checkSupabaseConnection}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600"
            >
              Verificar Conexión
            </Button>
            <Button 
              onClick={checkProfileData}
              disabled={loading}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              Verificar Perfil
            </Button>
            <Button 
              onClick={checkStoragePermissions}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600"
            >
              Verificar Storage
            </Button>
          </div>

          {/* Resultados de Tests */}
          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Resultados:</h3>
              {testResults.map((result, index) => (
                <div key={index} className="flex items-start p-3 bg-gray-50 rounded-lg">
                  <StatusIcon status={result.status} />
                  <div className="ml-3">
                    <div className="font-medium">{result.test}</div>
                    <div className="text-sm text-gray-600">{result.details}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test de Subida */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Test de Subida de Avatar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Seleccionar imagen
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {selectedFile && (
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <Image className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-sm text-green-700">
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>
            )}

            <Button
              onClick={testFileUpload}
              disabled={!selectedFile || loading}
              className="w-full bg-blue-500 hover:bg-blue-600"
            >
              Probar Subida
            </Button>

            {uploadStatus && (
              <div className={`p-3 rounded-lg ${
                uploadStatus.type === 'error' ? 'bg-red-50 text-red-700' :
                uploadStatus.type === 'success' ? 'bg-green-50 text-green-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                {uploadStatus.type === 'loading' && (
                  <div className="flex items-center">
                    <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mr-2"></div>
                    {uploadStatus.message}
                  </div>
                )}
                {uploadStatus.type !== 'loading' && uploadStatus.message}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Soluciones Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-yellow-800">🔧 Soluciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-yellow-800 mb-2">Arreglar Nombres de Usuario:</h3>
              <Button 
                onClick={fixUserNames}
                disabled={loading}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                🔧 Arreglar Nombres Automáticamente
              </Button>
            </div>
            
            <div>
              <h3 className="font-medium text-yellow-800 mb-2">Configurar Storage:</h3>
              <p className="text-sm text-gray-600 mb-2">
                Si el bucket "avatars" no existe, ejecuta el SQL en Supabase Dashboard:
              </p>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
{`-- Crear bucket avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, 
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[])
ON CONFLICT (id) DO NOTHING;`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileDiagnostics;
