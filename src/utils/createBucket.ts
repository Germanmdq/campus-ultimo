import { supabase } from '@/integrations/supabase/client';

export async function createAvatarsBucket() {
  try {
    console.log('🔧 Creating avatars bucket...');
    
    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }

    const avatarsBucket = buckets?.find(b => b.id === 'avatars');
    if (avatarsBucket) {
      console.log('✅ Avatars bucket already exists');
      return { success: true, message: 'Bucket already exists' };
    }

    // Create the bucket
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
    return { success: true, message: 'Bucket created successfully' };

  } catch (error: any) {
    console.error('💥 Error in createAvatarsBucket:', error);
    throw error;
  }
}

export async function ensureAvatarsBucket() {
  try {
    await createAvatarsBucket();
    return true;
  } catch (error) {
    console.error('Failed to ensure avatars bucket:', error);
    return false;
  }
}
