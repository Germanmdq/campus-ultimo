-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for assets if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets', 
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for public files if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public',
  'public', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Policy for authenticated users to upload avatars
CREATE POLICY "Users can upload their own avatars" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
);

-- Policy for authenticated users to update their own avatars
CREATE POLICY "Users can update their own avatars" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
);

-- Policy for authenticated users to delete their own avatars
CREATE POLICY "Users can delete their own avatars" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
);

-- Policy for anyone to view avatars (public read)
CREATE POLICY "Anyone can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Policy for authenticated users to upload to assets bucket
CREATE POLICY "Authenticated users can upload to assets" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'assets' 
  AND auth.role() = 'authenticated'
);

-- Policy for anyone to view assets (public read)
CREATE POLICY "Anyone can view assets" ON storage.objects
FOR SELECT USING (bucket_id = 'assets');

-- Policy for authenticated users to upload to public bucket
CREATE POLICY "Authenticated users can upload to public" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'public' 
  AND auth.role() = 'authenticated'
);

-- Policy for anyone to view public files (public read)
CREATE POLICY "Anyone can view public files" ON storage.objects
FOR SELECT USING (bucket_id = 'public');

-- Policy for authenticated users to update public files
CREATE POLICY "Authenticated users can update public files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'public' 
  AND auth.role() = 'authenticated'
);

-- Policy for authenticated users to delete public files
CREATE POLICY "Authenticated users can delete public files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'public' 
  AND auth.role() = 'authenticated'
);

-- Grant necessary permissions to authenticated users
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Grant select permissions to anon users for public buckets
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon;
