-- Swipo — lot 3 : stockage privé des photos de chantier.
-- Chemin d'une photo : <entreprise>/<chantier>/<fichier>.jpg
-- On ne lit et n'ajoute une photo que pour un chantier que l'on a le droit de voir.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Le chantier désigné par le chemin, si le chemin est bien formé et cohérent.
create or replace function public.photo_job(p_name text)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_parts text[] := storage.foldername(p_name); v_job uuid;
begin
  if array_length(v_parts, 1) <> 2 then return null; end if;
  select j.id into v_job from public.jobs j
  where j.id::text = v_parts[2] and j.company_id::text = v_parts[1];
  return v_job;
end $$;
revoke execute on function public.photo_job(text) from public, anon;
grant execute on function public.photo_job(text) to authenticated;

create policy "photos de chantier visibles" on storage.objects
  for select to authenticated using (bucket_id = 'photos' and public.can_see_job(public.photo_job(name)));

create policy "équipe du chantier ajoute ses photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'photos' and public.can_see_job(public.photo_job(name)));
