-- Swipo — lot 5 : logo de l'entreprise pour le compte rendu client.
-- Chemin d'un logo : <entreprise>/<fichier>. Stockage privé : l'équipe le voit, seul le gérant le change.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', false, 2097152, array['image/jpeg', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- L'entreprise désignée par le chemin, si le chemin est bien formé.
create or replace function public.logo_company(p_name text)
returns uuid language plpgsql stable security definer set search_path = '' as $$
declare v_parts text[] := storage.foldername(p_name); v_company uuid;
begin
  if array_length(v_parts, 1) <> 1 then return null; end if;
  select c.id into v_company from public.companies c where c.id::text = v_parts[1];
  return v_company;
end $$;
revoke execute on function public.logo_company(text) from public, anon;
grant execute on function public.logo_company(text) to authenticated;

create policy "logo visible par l'équipe" on storage.objects
  for select to authenticated using (bucket_id = 'logos' and public.logo_company(name) in (select public.my_company_ids()));
create policy "gérant dépose le logo" on storage.objects
  for insert to authenticated with check (bucket_id = 'logos' and public.has_role(public.logo_company(name), 'gerant'));
create policy "gérant remplace le logo" on storage.objects
  for update to authenticated using (bucket_id = 'logos' and public.has_role(public.logo_company(name), 'gerant'));
create policy "gérant supprime le logo" on storage.objects
  for delete to authenticated using (bucket_id = 'logos' and public.has_role(public.logo_company(name), 'gerant'));
