-- Create a public bucket for product images
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- Allow public access to read files
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'products' );

-- Allow authenticated/anon users to upload files
create policy "Allow Uploads"
on storage.objects for insert
with check ( bucket_id = 'products' );

-- Allow authenticated/anon users to update files
create policy "Allow Updates"
on storage.objects for update
using ( bucket_id = 'products' );

-- Allow authenticated/anon users to delete files
create policy "Allow Deletes"
on storage.objects for delete
using ( bucket_id = 'products' );
