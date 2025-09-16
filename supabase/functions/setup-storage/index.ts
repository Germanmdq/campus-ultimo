import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    // Check if buckets exist
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      throw bucketsError;
    }

    const existingBuckets = buckets?.map(b => b.name) || [];
    const bucketsToCreate = [
      {
        id: 'avatars',
        name: 'avatars',
        public: true,
        file_size_limit: 5242880, // 5MB
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      },
      {
        id: 'assets',
        name: 'assets',
        public: true,
        file_size_limit: 10485760, // 10MB
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
      },
      {
        id: 'public',
        name: 'public',
        public: true,
        file_size_limit: 5242880, // 5MB
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
      }
    ];

    const createdBuckets = [];
    const errors = [];

    for (const bucketConfig of bucketsToCreate) {
      if (!existingBuckets.includes(bucketConfig.name)) {
        try {
          const { data, error } = await supabase.storage.createBucket(bucketConfig.name, {
            public: bucketConfig.public,
            fileSizeLimit: bucketConfig.file_size_limit,
            allowedMimeTypes: bucketConfig.allowed_mime_types
          });

          if (error) {
            errors.push(`Error creating bucket ${bucketConfig.name}: ${error.message}`);
          } else {
            createdBuckets.push(bucketConfig.name);
          }
        } catch (err) {
          errors.push(`Exception creating bucket ${bucketConfig.name}: ${err.message}`);
        }
      }
    }

    // Test upload to verify permissions
    let testUploadSuccess = false;
    let testUploadError = null;

    try {
      const testContent = 'test file content';
      const testFile = new Blob([testContent], { type: 'text/plain' });
      
      const { error: uploadError } = await supabase.storage
        .from('public')
        .upload('test/setup-test.txt', testFile);

      if (uploadError) {
        testUploadError = uploadError.message;
      } else {
        testUploadSuccess = true;
        
        // Clean up test file
        await supabase.storage
          .from('public')
          .remove(['test/setup-test.txt']);
      }
    } catch (err) {
      testUploadError = err.message;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage setup completed',
        data: {
          existingBuckets: existingBuckets,
          createdBuckets: createdBuckets,
          errors: errors,
          testUpload: {
            success: testUploadSuccess,
            error: testUploadError
          }
        }
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred',
        data: null
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
