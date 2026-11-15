-- Swipo — un agent peut créer son propre accès (e-mail + mot de passe) avec son lien d'invitation.
-- Le serveur crée le compte puis le rattache à la fiche de l'agent : cette fonction n'est appelable
-- qu'avec la clé secrète du serveur, jamais depuis un navigateur.

create or replace function public.claim_invite_for(p_token text, p_user uuid)
returns public.member_role language plpgsql security definer set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members
  where invite_hash = public._token_hash(p_token) and invite_expires_at > now() and active
  for update;
  if not found then raise exception 'Ce lien n''est plus valable. Demandez-en un nouveau à votre gérant.' using errcode = 'P0002'; end if;
  if m.role = 'gerant' then
    raise exception 'Un gérant se connecte avec son e-mail et son mot de passe.' using errcode = '42501';
  end if;
  update public.members set user_id = p_user, invite_hash = null, invite_expires_at = null,
    email = (select u.email from auth.users u where u.id = p_user)
  where id = m.id;
  -- L'ancienne session « appareil » de cette fiche, devenue inutile, est supprimée.
  delete from auth.users u where u.id = m.user_id and u.is_anonymous
    and not exists (select 1 from public.members x where x.user_id = u.id);
  return m.role;
end $$;

revoke execute on function public.claim_invite_for(text, uuid) from public, anon, authenticated;
grant execute on function public.claim_invite_for(text, uuid) to service_role;

-- Couper l'accès d'un agent : sa session « appareil » ou son compte e-mail d'agent est supprimé.
create or replace function public.disconnect_member(p_member uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where id = p_member for update;
  if not found or not public.has_role(m.company_id, 'gerant') then
    raise exception 'Membre introuvable' using errcode = 'P0002';
  end if;
  if m.role = 'gerant' then raise exception 'Un gérant ne se déconnecte pas à distance' using errcode = '22023'; end if;
  update public.members set user_id = null, invite_hash = null, invite_expires_at = null where id = p_member;
  delete from auth.users u where u.id = m.user_id
    and (u.is_anonymous or u.raw_app_meta_data ->> 'swipo_espace' = 'agent')
    and not exists (select 1 from public.members x where x.user_id = u.id);
end $$;
