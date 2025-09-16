import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
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
    // Use service_role key to create bucket
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    console.log('🔧 Creating avatars bucket with service_role...');

    // Check if bucket already exists
    const { data: existingBuckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    if (listError) throw listError;

    const avatarsBucket = existingBuckets?.find(b => b.id === 'avatars');
    
    if (avatarsBucket) {
      console.log('✅ Avatars bucket already exists');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Avatars bucket already exists',
          data: { bucket: avatarsBucket }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create the bucket
    const { error: createError } = await supabaseAdmin.storage.createBucket('avatars', {
      public: true,
      allowedMimeTypes: ['image/*'],
      fileSizeLimit: 5242880 // 5MB
    });

    if (createError) {
      console.error('❌ Error creating avatars bucket:', createError);
      throw createError;
    }

    console.log('✅ Avatars bucket created successfully');

    // Test upload to verify it works
    const testFile = new Blob(['test content'], { type: 'text/plain' });
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload('test-bucket-creation.txt', testFile);

    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
      throw uploadError;
    }

    console.log('✅ Test upload successful:', uploadData);

    // Clean up test file
    await supabaseAdmin.storage.from('avatars').remove(['test-bucket-creation.txt']);

    // Get updated bucket info
    const { data: updatedBuckets } = await supabaseAdmin.storage.listBuckets();
    const newAvatarsBucket = updatedBuckets?.find(b => b.id === 'avatars');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Avatars bucket created successfully',
        data: { 
          bucket: newAvatarsBucket,
          testUploadSuccessful: true
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('💥 Create bucket error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error during bucket creation',
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
