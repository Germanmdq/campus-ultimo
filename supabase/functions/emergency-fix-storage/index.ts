import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const ALLOWED_ORIGIN = "*"; 
// Si querés cerrarlo a tu dominio:
// const ALLOWED_ORIGIN = "https://campus.espaciodegeometriasagrada.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
};

serve(async (req: Request): Promise<Response> => {
  // 1) Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      headers: corsHeaders, 
      status: 405 
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    console.log('🔧 Starting emergency storage fix...');

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

    // 3. Drop ALL existing storage policies to start fresh
    console.log('🗑️ Dropping all existing storage policies...');
    
    const dropPoliciesSQL = `
      -- Drop all existing policies
      DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to upload their own avatars" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to update their own avatars" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to delete their own avatars" ON storage.objects;
      DROP POLICY IF EXISTS "Allow public read access to assets" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to upload assets" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to update their own assets" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to delete their own assets" ON storage.objects;
      DROP POLICY IF EXISTS "Allow public read access to public files" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to upload public files" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to update their own public files" ON storage.objects;
      DROP POLICY IF EXISTS "Allow authenticated users to delete their own public files" ON storage.objects;
      DROP POLICY IF EXISTS "Users can upload files to own posts" ON storage.objects;
      DROP POLICY IF EXISTS "Users can view post files" ON storage.objects;
      DROP POLICY IF EXISTS "Authenticated users can view materials" ON storage.objects;
      DROP POLICY IF EXISTS "Authenticated users can upload materials" ON storage.objects;
      DROP POLICY IF EXISTS "Users can update their own materials" ON storage.objects;
      DROP POLICY IF EXISTS "Admins can manage all materials" ON storage.objects;
    `;

    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropPoliciesSQL });
    if (dropError) {
      console.warn('⚠️ Warning: Could not drop all policies:', dropError);
    }

    // 4. Create simple, permissive policies
    console.log('🔐 Creating new storage policies...');
    
    const createPoliciesSQL = `
      -- Simple, permissive policies for avatars
      CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'avatars');
      CREATE POLICY "Authenticated upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');
      CREATE POLICY "Authenticated update avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars');
      CREATE POLICY "Authenticated delete avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars');
      
      -- Policies for assets bucket
      CREATE POLICY "Public read assets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'assets');
      CREATE POLICY "Authenticated upload assets" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assets');
      CREATE POLICY "Authenticated update assets" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'assets');
      CREATE POLICY "Authenticated delete assets" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'assets');
      
      -- Policies for public bucket
      CREATE POLICY "Public read public" ON storage.objects FOR SELECT TO public USING (bucket_id = 'public');
      CREATE POLICY "Authenticated upload public" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'public');
      CREATE POLICY "Authenticated update public" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'public');
      CREATE POLICY "Authenticated delete public" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'public');
    `;

    const { error: policiesError } = await supabase.rpc('exec_sql', { sql: createPoliciesSQL });
    if (policiesError) {
      console.error('❌ Error creating policies:', policiesError);
      throw policiesError;
    }

    console.log('✅ Storage policies created');

    // 5. Test upload to verify it works
    console.log('🧪 Testing upload...');
    const testContent = 'test file content';
    const testFile = new Blob([testContent], { type: 'text/plain' });
    
    const { data: testUpload, error: testError } = await supabase.storage
      .from('avatars')
      .upload('test/emergency-test.txt', testFile);

    if (testError) {
      console.error('❌ Test upload failed:', testError);
      throw testError;
    }

    console.log('✅ Test upload successful:', testUpload);

    // 6. Clean up test file
    await supabase.storage.from('avatars').remove(['test/emergency-test.txt']);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Emergency storage fix completed! Avatar uploads should now work.',
        data: {
          existingBuckets: existingBuckets?.map(b => b.id) || [],
          avatarsBucketCreated: !avatarsBucket,
          policiesCreated: true,
          testUploadSuccessful: true
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('💥 Emergency storage fix error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error during emergency storage fix',
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
