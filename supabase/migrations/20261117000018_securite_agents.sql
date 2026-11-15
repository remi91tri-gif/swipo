-- Swipo — sécurité renforcée de l'espace agent.
-- 1. Un lien d'invitation ne sert qu'aux agents et chefs d'équipe, depuis une session « appareil »
--    (sans e-mail). Un gérant se connecte toujours avec son e-mail et son mot de passe :
--    il est invité par e-mail, jamais par lien.
-- 2. Le gérant peut déconnecter à distance le téléphone d'un membre (perdu, volé, départ).
-- 3. Les empreintes des liens d'invitation ne sont plus lisibles par l'équipe.
-- 4. Les fonctions qui n'ont rien à faire sans connexion ne sont plus appelables sans connexion.

create or replace function public.claim_invite(p_token text)
returns public.member_role language plpgsql security definer set search_path = '' as $$
declare m public.members;
begin
  if auth.uid() is null then raise exception 'Connexion requise' using errcode = '42501'; end if;
  -- Seule une session « appareil » (anonyme) peut utiliser un lien : un compte e-mail ne peut pas
  -- être détourné vers une fiche d'agent, et inversement.
  if not exists (select 1 from auth.users where id = auth.uid() and is_anonymous) then
    raise exception 'Ce lien s''ouvre sur le téléphone de l''agent, sans être connecté à un autre compte.' using errcode = '42501';
  end if;
  select * into m from public.members
  where invite_hash = public._token_hash(p_token) and invite_expires_at > now() and active
  for update;
  if not found then raise exception 'Ce lien n''est plus valable. Demandez-en un nouveau à votre gérant.' using errcode = 'P0002'; end if;
  if m.role = 'gerant' then
    raise exception 'Un gérant se connecte avec son e-mail et son mot de passe.' using errcode = '42501';
  end if;
  update public.members set user_id = null where user_id = auth.uid() and company_id = m.company_id and id <> m.id;
  update public.members set user_id = auth.uid(), invite_hash = null, invite_expires_at = null where id = m.id;
  return m.role;
end $$;

create or replace function public.create_invite_link(p_member uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare m public.members; v_token text;
begin
  select * into m from public.members where id = p_member;
  if not found or not public.has_role(m.company_id, 'gerant') then
    raise exception 'Membre introuvable' using errcode = 'P0002';
  end if;
  if not m.active then raise exception 'Ce membre est désactivé' using errcode = '22023'; end if;
  if m.role = 'gerant' then
    raise exception 'Un gérant est invité par e-mail, avec un mot de passe : pas de lien.' using errcode = '22023';
  end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  update public.members set invite_hash = public._token_hash(v_token), invite_expires_at = now() + interval '7 days'
  where id = p_member;
  return v_token;
end $$;

-- Déconnecter le téléphone d'un membre : il perd l'accès immédiatement (la base ne le reconnaît plus).
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
  -- La session « appareil » ne sert plus à rien : on la supprime.
  delete from auth.users u where u.id = m.user_id and u.is_anonymous
    and not exists (select 1 from public.members x where x.user_id = u.id);
end $$;

-- Un agent connecté par lien qui devient gérant perd cette session : un gérant doit avoir
-- un compte e-mail + mot de passe (il sera invité par e-mail).
create or replace function public._trg_manager_needs_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.role = 'gerant' and new.user_id is not null
     and exists (select 1 from auth.users u where u.id = new.user_id and u.is_anonymous) then
    new.user_id := null;
  end if;
  return new;
end $$;
drop trigger if exists manager_needs_email on public.members;
create trigger manager_needs_email before insert or update of role, user_id on public.members
  for each row execute function public._trg_manager_needs_email();
revoke execute on function public._trg_manager_needs_email() from public, anon, authenticated;

-- L'équipe ne lit plus les empreintes des liens.
revoke select on public.members from authenticated, anon;
grant select (id, company_id, user_id, first_name, last_name, phone, email, role, active, invited_at, created_at, invite_expires_at, avatar_path)
  on public.members to authenticated;

revoke execute on function public.claim_invite(text), public.create_invite_link(uuid), public.redeem_pilot_code(text),
  public.company_access(uuid), public.plan_limit(text), public.disconnect_member(uuid) from public, anon;
grant execute on function public.claim_invite(text), public.create_invite_link(uuid), public.redeem_pilot_code(text),
  public.company_access(uuid), public.plan_limit(text), public.disconnect_member(uuid) to authenticated;
