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

      // Try to create a test bucket if none exist
      if (!bucketsData || bucketsData.length === 0) {
        const { error: createError } = await supabase.storage.createBucket('public', {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 5242880
        });

        if (createError) {
          console.error('Error creating bucket:', createError);
        } else {
          toast({
            title: "Bucket created",
            description: "Created 'public' bucket successfully"
          });
        }
      }

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

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Storage Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={checkStorage} disabled={loading}>
            {loading ? 'Checking...' : 'Check Storage'}
          </Button>
          <Button onClick={testUpload} disabled={loading} variant="outline">
            {loading ? 'Testing...' : 'Test Upload'}
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
