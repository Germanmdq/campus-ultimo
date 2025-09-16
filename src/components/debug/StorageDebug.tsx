import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { createAvatarsBucket } from '@/utils/createBucket';

export function StorageDebug() {
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkStorage = async () => {
    setLoading(true);
    try {
      console.log('🔍 Checking storage configuration...');
      
      // List all buckets
      const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        throw bucketsError;
      }

      console.log('📦 Available buckets:', bucketsData);
      setBuckets(bucketsData || []);

      // Check if avatars bucket exists
      const avatarsBucket = bucketsData?.find(b => b.id === 'avatars');
      
      if (!avatarsBucket) {
        console.log('📦 Creating avatars bucket...');
        const { error: createError } = await supabase.storage.createBucket('avatars', {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (createError) {
          console.error('❌ Error creating avatars bucket:', createError);
          throw createError;
        }
        console.log('✅ Avatars bucket created successfully');
        
        // Refresh buckets list
        const { data: newBucketsData } = await supabase.storage.listBuckets();
        setBuckets(newBucketsData || []);
      } else {
        console.log('✅ Avatars bucket already exists');
      }

      // Test upload to verify it works
      console.log('🧪 Testing upload to avatars bucket...');
      const testFile = new Blob(['test content'], { type: 'text/plain' });
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload('test-file.txt', testFile);
      
      if (uploadError) {
        console.error('❌ Upload test failed:', uploadError);
        throw uploadError;
      } else {
        console.log('✅ Upload test successful:', uploadData);
        // Clean up test file
        await supabase.storage.from('avatars').remove(['test-file.txt']);
      }
      
      toast({
        title: "Storage check completed",
        description: `Found ${bucketsData?.length || 0} buckets. Avatars: ✅ Working!`
      });

    } catch (error: any) {
      console.error('Storage check error:', error);
      toast({
        title: "Storage check failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const testUpload = async () => {
    setLoading(true);
    try {
      // Create a simple test file
      const testContent = 'test file content';
      const testFile = new Blob([testContent], { type: 'text/plain' });
      
      const { error } = await supabase.storage
        .from('public')
        .upload('test/test.txt', testFile);

      if (error) {
        throw error;
      }

      toast({
        title: "Test upload successful",
        description: "Test file uploaded successfully"
      });

    } catch (error: any) {
      console.error('Test upload error:', error);
      toast({
        title: "Test upload failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkProfiles = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/check-profiles`, {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Profiles check:', data);
        
        toast({
          title: "Profiles check completed",
          description: `Found ${data.data.totalProfiles} profiles, ${data.data.profilesWithNullNames.length} with null names`
        });
      } else {
        throw new Error('Failed to check profiles');
      }
    } catch (error: any) {
      console.error('Profiles check error:', error);
      toast({
        title: "Profiles check failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fixStoragePolicies = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fix-storage-policies`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Storage policies fix:', data);
        
        toast({
          title: "Storage policies fixed",
          description: "RLS policies have been updated and buckets ensured"
        });
      } else {
        throw new Error('Failed to fix storage policies');
      }
    } catch (error: any) {
      console.error('Storage policies fix error:', error);
      toast({
        title: "Storage policies fix failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fixUserNames = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fix-user-names`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('User names fix:', data);
        
        toast({
          title: "User names fixed",
          description: `Updated ${data.data.updated} user names out of ${data.data.total} profiles`
        });
      } else {
        throw new Error('Failed to fix user names');
      }
    } catch (error: any) {
      console.error('User names fix error:', error);
      toast({
        title: "User names fix failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const emergencyFixNames = async () => {
    setLoading(true);
    try {
      console.log('🔧 Starting emergency names fix directly...');
      
      // Get all profiles with missing names
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at')
        .or('full_name.is.null,full_name.eq.,full_name.eq.Usuario,full_name.eq.Sin nombre');

      if (profilesError) throw profilesError;

      console.log(`👥 Found ${profiles?.length || 0} profiles needing names`);

      if (!profiles || profiles.length === 0) {
        toast({
          title: "✅ No names to fix",
          description: "All profiles already have names!",
        });
        return;
      }

      // Get auth users
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const authUsersMap = new Map(authUsers?.users?.map(u => [u.id, u]) || []);
      let fixed = 0;

      // Fix names
      for (const profile of profiles) {
        const authUser = authUsersMap.get(profile.id);
        if (!authUser) continue;

        const meta = authUser.user_metadata || {};
        const email = authUser.email || '';
        
        // Try multiple sources for name
        let newName = meta.full_name || 
                     meta.name || 
                     meta.display_name ||
                     (meta.first_name && meta.last_name ? `${meta.first_name} ${meta.last_name}` : '') ||
                     (email ? email.split('@')[0] : 'Usuario');

        // Clean up the name
        newName = newName.trim();
        if (newName === '' || newName === 'Usuario' || newName === 'Sin nombre') {
          newName = email ? email.split('@')[0] : 'Usuario';
        }

        if (newName && newName !== profile.full_name) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ full_name: newName })
            .eq('id', profile.id);

          if (!updateError) {
            fixed++;
            console.log(`✅ Updated ${profile.id}: "${profile.full_name}" → "${newName}"`);
          }
        }
      }

      console.log(`✅ Emergency names fix completed! Updated ${fixed} profiles`);
      
      toast({
        title: "🚨 EMERGENCY FIX COMPLETE",
        description: `Fixed ${fixed} user names! Check console for details.`,
      });
    } catch (error: any) {
      console.error('💥 Emergency names fix error:', error);
      toast({
        title: "💥 Emergency fix failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const emergencyFixStorage = async () => {
    setLoading(true);
    try {
      console.log('🔧 Starting emergency storage fix directly...');
      
      // 1. Check existing buckets
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) throw listError;

      console.log('📦 Existing buckets:', existingBuckets?.map(b => ({ id: b.id, name: b.name, public: b.public })));

      // 2. Create avatars bucket if it doesn't exist
      let avatarsBucket = existingBuckets?.find(b => b.id === 'avatars');
      if (!avatarsBucket) {
        console.log('📦 Creating avatars bucket...');
        const { error: createError } = await supabase.storage.createBucket('avatars', {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 5242880 // 5MB
        });
        
        if (createError) {
          console.error('❌ Error creating avatars bucket:', createError);
          throw createError;
        }
        console.log('✅ Avatars bucket created');
      } else {
        console.log('✅ Avatars bucket already exists');
      }

      // 3. Test upload to verify it works
      console.log('🧪 Testing upload...');
      const testContent = 'emergency test file';
      const testFile = new Blob([testContent], { type: 'text/plain' });
      
      const { data: testUpload, error: testError } = await supabase.storage
        .from('avatars')
        .upload('emergency-test.txt', testFile);

      if (testError) {
        console.error('❌ Test upload failed:', testError);
        throw testError;
      }

      console.log('✅ Test upload successful:', testUpload);

      // 4. Clean up test file
      await supabase.storage.from('avatars').remove(['emergency-test.txt']);

      console.log('✅ Emergency storage fix completed!');
      
      toast({
        title: "🚨 EMERGENCY STORAGE FIX COMPLETE",
        description: "Avatar uploads should now work! Check console for details.",
      });
    } catch (error: any) {
      console.error('💥 Emergency storage fix error:', error);
      toast({
        title: "💥 Emergency storage fix failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const emergencyFixAuth = async () => {
    setLoading(true);
    try {
      console.log('🔧 Starting emergency auth diagnostics directly...');
      
      // 1. Check current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('🔐 Current session:', { hasSession: !!session, error: sessionError?.message });

      // 2. Check current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('👤 Current user:', { hasUser: !!user, userId: user?.id, error: userError?.message });

      // 3. Test database connection
      const { data: dbTest, error: dbError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);
      console.log('🗄️ Database connection:', { success: !dbError, error: dbError?.message });

      // 4. Test storage access
      const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
      console.log('📦 Storage access:', { success: !storageError, buckets: buckets?.length || 0, error: storageError?.message });

      // 5. Test storage upload
      if (!storageError) {
        const testContent = 'auth test file';
        const testFile = new Blob([testContent], { type: 'text/plain' });
        
        const { data: testUpload, error: testUploadError } = await supabase.storage
          .from('avatars')
          .upload('auth-test.txt', testFile);

        console.log('🧪 Storage upload test:', { success: !testUploadError, error: testUploadError?.message });

        // Clean up test file
        if (!testUploadError) {
          await supabase.storage.from('avatars').remove(['auth-test.txt']);
        }
      }

      console.log('✅ Emergency auth diagnostics completed');
      
      toast({
        title: "🚨 EMERGENCY AUTH DIAGNOSTICS COMPLETE",
        description: "Check console for detailed auth diagnostics.",
      });
    } catch (error: any) {
      console.error('💥 Emergency auth fix error:', error);
      toast({
        title: "💥 Emergency auth fix failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createBucketNow = async () => {
    setLoading(true);
    try {
      console.log('🔧 Creating avatars bucket directly...');
      const result = await createAvatarsBucket();
      
      console.log('✅ Bucket creation result:', result);
      
      toast({
        title: "✅ BUCKET CREATED",
        description: "Avatars bucket created successfully! Try uploading now.",
      });
      
      // Refresh bucket list
      await checkStorage();
    } catch (error: any) {
      console.error('💥 Bucket creation error:', error);
      toast({
        title: "💥 Bucket creation failed",
        description: error.message || "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Storage Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-semibold text-red-800 mb-2">🚨 EMERGENCY FIXES</h3>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={emergencyFixNames} disabled={loading} className="bg-red-600 hover:bg-red-700">
                {loading ? 'Fixing...' : '🚨 FIX NAMES NOW'}
              </Button>
              <Button onClick={emergencyFixStorage} disabled={loading} className="bg-red-600 hover:bg-red-700">
                {loading ? 'Fixing...' : '🚨 FIX STORAGE NOW'}
              </Button>
              <Button onClick={emergencyFixAuth} disabled={loading} className="bg-orange-600 hover:bg-orange-700">
                {loading ? 'Checking...' : '🔐 CHECK AUTH'}
              </Button>
            </div>
          </div>
          
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-green-800 mb-2">🔧 QUICK FIXES</h3>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={createBucketNow} disabled={loading} className="bg-green-600 hover:bg-green-700">
                {loading ? 'Creating...' : '🔧 CREATE BUCKET NOW'}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button onClick={checkStorage} disabled={loading}>
              {loading ? 'Checking...' : 'Setup Storage'}
            </Button>
            <Button onClick={fixStoragePolicies} disabled={loading} variant="outline">
              {loading ? 'Fixing...' : 'Fix Storage Policies'}
            </Button>
            <Button onClick={fixUserNames} disabled={loading} variant="outline">
              {loading ? 'Fixing...' : 'Fix User Names'}
            </Button>
            <Button onClick={testUpload} disabled={loading} variant="outline">
              {loading ? 'Testing...' : 'Test Upload'}
            </Button>
            <Button onClick={checkProfiles} disabled={loading} variant="outline">
              {loading ? 'Checking...' : 'Check Profiles'}
            </Button>
          </div>
        </div>

        {buckets.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Available Buckets:</h3>
            <div className="space-y-2">
              {buckets.map((bucket, index) => (
                <div key={index} className="p-2 border rounded">
                  <p><strong>Name:</strong> {bucket.name}</p>
                  <p><strong>Public:</strong> {bucket.public ? 'Yes' : 'No'}</p>
                  <p><strong>Created:</strong> {new Date(bucket.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p>Supabase URL: {import.meta.env.VITE_SUPABASE_URL}</p>
          <p>This debug component will help identify storage configuration issues.</p>
        </div>
      </CardContent>
    </Card>
  );
}
