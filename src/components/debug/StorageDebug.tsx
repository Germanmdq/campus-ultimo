import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function StorageDebug() {
  const [buckets, setBuckets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkStorage = async () => {
    setLoading(true);
    try {
      // First try the setup function
      const setupResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/setup-storage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (setupResponse.ok) {
        const setupData = await setupResponse.json();
        console.log('Setup response:', setupData);
        
        if (setupData.success) {
          toast({
            title: "Storage setup completed",
            description: `Created ${setupData.data.createdBuckets.length} buckets, found ${setupData.data.existingBuckets.length} existing`
          });
        }
      }

      // List all buckets
      const { data: bucketsData, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        throw bucketsError;
      }

      setBuckets(bucketsData || []);
      
      toast({
        title: "Storage check completed",
        description: `Found ${bucketsData?.length || 0} buckets`
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

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Storage Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
