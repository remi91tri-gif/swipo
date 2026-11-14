-- Swipo — suppression de compte (droit à l'effacement), même sans aucun paiement.
-- Le gérant supprime son entreprise : toutes ses données partent (cascade) ainsi que les comptes de
-- connexion de son équipe. Un agent ou un chef d'équipe supprime son seul compte de connexion.
-- Les fichiers (photos, logo, photos de profil) sont supprimés avant, par le serveur, via le stockage.

-- Le gérant peut supprimer les photos de profil de son équipe (nécessaire à l'effacement complet).
create policy "gérant supprime les photos de profil de son équipe" on storage.objects
  for delete to authenticated using (
    bucket_id = 'avatars' and public.has_role(nullif((storage.foldername(name))[1], '')::uuid, 'gerant')
  );

create or replace function public.delete_my_company(p_confirm text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_company uuid; v_name text; v_users uuid[];
begin
  select m.company_id into v_company from public.members m
  where m.user_id = auth.uid() and m.active and m.role = 'gerant' limit 1;
  if v_company is null then raise exception 'Réservé au gérant' using errcode = '42501'; end if;
  select name into v_name from public.companies where id = v_company;
  if p_confirm is null or lower(trim(p_confirm)) <> lower(trim(v_name)) then
    raise exception 'Le nom saisi ne correspond pas à celui de l''entreprise' using errcode = '22023';
  end if;
  select coalesce(array_agg(user_id), '{}') into v_users from public.members where company_id = v_company and user_id is not null;
  delete from public.companies where id = v_company;
  -- Comptes de connexion qui ne servent plus à aucune autre entreprise.
  delete from auth.users u where u.id = any (v_users) and not exists (select 1 from public.members m where m.user_id = u.id);
end $$;

create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  if exists (select 1 from public.members where user_id = v_uid and role = 'gerant' and active) then
    raise exception 'Un gérant supprime son compte en supprimant son entreprise' using errcode = '22023';
  end if;
  update public.members set user_id = null, active = false where user_id = v_uid;
  delete from auth.users where id = v_uid;
end $$;

revoke execute on function public.delete_my_company(text), public.delete_my_account() from public, anon;
grant execute on function public.delete_my_company(text), public.delete_my_account() to authenticated;
