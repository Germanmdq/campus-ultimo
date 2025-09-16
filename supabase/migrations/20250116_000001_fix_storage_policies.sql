-- Fix storage policies for avatar uploads
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

-- Ensure buckets exist and are properly configured
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES 
  ('avatars', 'avatars', TRUE, ARRAY['image/*'], 5242880),
  ('assets', 'assets', TRUE, ARRAY['image/*', 'application/pdf', 'text/plain'], 10485760),
  ('public', 'public', TRUE, ARRAY['image/*', 'application/pdf', 'text/plain'], 5242880)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  allowed_mime_types = EXCLUDED.allowed_mime_types,
  file_size_limit = EXCLUDED.file_size_limit;
