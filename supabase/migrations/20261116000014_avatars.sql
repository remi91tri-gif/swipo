-- Swipo — photos de profil.
-- Chemin : <entreprise>/<membre>/<fichier>.jpg, dans un espace « avatars » lisible par lien (noms imprévisibles),
-- pour s'afficher partout sans lien temporaire. Chacun ne dépose et ne supprime que sa propre photo.

alter table public.members add column avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Vrai si le chemin désigne le dossier du membre connecté.
create or replace function public.is_my_avatar_path(p_name text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_parts text[] := storage.foldername(p_name);
begin
  if array_length(v_parts, 1) <> 2 then return false; end if;
  return exists (
    select 1 from public.members m
    where m.user_id = auth.uid() and m.active and m.company_id::text = v_parts[1] and m.id::text = v_parts[2]
  );
end $$;
revoke execute on function public.is_my_avatar_path(text) from public, anon;
grant execute on function public.is_my_avatar_path(text) to authenticated;

create policy "chacun dépose sa photo de profil" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars' and public.is_my_avatar_path(name));
create policy "chacun supprime sa photo de profil" on storage.objects
  for delete to authenticated using (bucket_id = 'avatars' and public.is_my_avatar_path(name));

-- Enregistre (ou retire, avec null) la photo du membre connecté.
create or replace function public.set_my_avatar(p_company uuid, p_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.my_member_id(p_company);
begin
  if v_me is null then raise exception 'Membre introuvable' using errcode = 'P0002'; end if;
  if p_path is not null and p_path not like p_company::text || '/' || v_me::text || '/%' then
    raise exception 'Photo refusée' using errcode = '42501';
  end if;
  update public.members set avatar_path = p_path where id = v_me;
end $$;
revoke execute on function public.set_my_avatar(uuid, text) from public, anon;
grant execute on function public.set_my_avatar(uuid, text) to authenticated;
