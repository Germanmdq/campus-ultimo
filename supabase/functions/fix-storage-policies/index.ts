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

    // SQL to fix storage policies
    const fixStoragePoliciesSQL = `
      -- Drop existing policies that might be conflicting
      DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to upload their own avatars" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to update their own avatars" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to delete their own avatars" ON storage.objects;

      -- Drop policies for other buckets too
      DROP POLICY IF EXISTS "Allow public read access to assets" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to upload assets" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to update their own assets" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to delete their own assets" ON storage.objects;

      DROP POLICY IF EXISTS "Allow public read access to public files" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to upload public files" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to update their own public files" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to delete their own public files" ON storage.objects;

      -- Create more permissive policies for avatars bucket
      CREATE POLICY "Allow public read access to avatars"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'avatars');

      -- Allow any authenticated user to upload to avatars bucket
      CREATE POLICY "Allow authenticated users to upload avatars"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'avatars');

      -- Allow users to update their own avatars (by filename pattern)
      CREATE POLICY "Allow users to update own avatars"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

      -- Allow users to delete their own avatars
      CREATE POLICY "Allow users to delete own avatars"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

      -- Create policies for assets bucket
      CREATE POLICY "Allow public read access to assets"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'assets');

      CREATE POLICY "Allow authenticated users to upload assets"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'assets');

      CREATE POLICY "Allow users to update own assets"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

      CREATE POLICY "Allow users to delete own assets"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

      -- Create policies for public bucket
      CREATE POLICY "Allow public read access to public files"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'public');

      CREATE POLICY "Allow authenticated users to upload public files"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'public');

      CREATE POLICY "Allow users to update own public files"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'public' AND auth.uid()::text = (storage.foldername(name))[1]);

      CREATE POLICY "Allow users to delete own public files"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (bucket_id = 'public' AND auth.uid()::text = (storage.foldername(name))[1]);
    `;

    // Execute the SQL
    const { error: sqlError } = await supabase.rpc('exec_sql', { 
      sql: fixStoragePoliciesSQL 
    });

    if (sqlError) {
      console.error('SQL execution error:', sqlError);
      throw sqlError;
    }

    // Ensure buckets exist
    const bucketDefinitions = [
      { id: 'avatars', name: 'avatars', public: true, allowedMimeTypes: ['image/*'], fileSizeLimit: 5242880 },
      { id: 'assets', name: 'assets', public: true, allowedMimeTypes: ['image/*', 'application/pdf', 'text/plain'], fileSizeLimit: 10485760 },
      { id: 'public', name: 'public', public: true, allowedMimeTypes: ['image/*', 'application/pdf', 'text/plain'], fileSizeLimit: 5242880 },
    ];

    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) throw listError;

    const results = [];
    for (const def of bucketDefinitions) {
      const bucketExists = existingBuckets?.some(b => b.id === def.id);
      
      if (!bucketExists) {
        console.log(`Creating bucket: ${def.id}`);
        const { error: createError } = await supabase.storage.createBucket(def.id, {
          public: def.public,
          allowedMimeTypes: def.allowedMimeTypes,
          fileSizeLimit: def.fileSizeLimit,
        });
        
        if (createError) {
          console.error(`Error creating bucket ${def.id}:`, createError);
          results.push({ bucket: def.id, status: 'error', error: createError.message });
        } else {
          results.push({ bucket: def.id, status: 'created' });
        }
      } else {
        results.push({ bucket: def.id, status: 'exists' });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Storage policies fixed and buckets ensured',
        data: {
          policiesFixed: true,
          buckets: results,
          availableBuckets: existingBuckets?.map(b => b.id) || []
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in fix-storage-policies function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error during storage policy fix' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
