-- Swipo — contenu des offres (novembre 2026) :
--   Starter  : 1 gérant,           3 salariés (agents et chefs d'équipe), sans compte rendu client PDF
--   Pro      : 2 gérants,          10 salariés
--   Business : gérants illimités,  30 salariés
-- Pendant l'essai et le pilote, tout est ouvert (comme Business).

create or replace function public.plan_limit(p_plan text)
returns int language sql immutable set search_path = '' as $$
  select case p_plan when 'business' then 30 when 'pro' then 10 else 3 end
$$;

-- Nombre de gérants permis (null = illimité).
create or replace function public.manager_limit(p_plan text)
returns int language sql immutable set search_path = '' as $$
  select case p_plan when 'business' then null when 'pro' then 2 else 1 end
$$;
revoke execute on function public.manager_limit(text) from public, anon;
grant execute on function public.manager_limit(text) to authenticated;

create or replace function public._trg_member_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_access text; v_plan text; v_open boolean; v_limit int; v_count int;
begin
  if not new.active then return new; end if;
  -- Rien ne change pour ce membre (déjà actif, même catégorie gérant / salarié) : pas de contrôle.
  if tg_op = 'UPDATE' and old.active and (old.role = 'gerant') = (new.role = 'gerant') then return new; end if;

  select plan into v_plan from public.companies where id = new.company_id;
  v_access := public.company_access(new.company_id);
  v_open := v_access is null or v_access in ('pilote', 'essai');

  if new.role = 'gerant' then
    v_limit := case when v_open then null else public.manager_limit(v_plan) end;
    if v_limit is not null then
      select count(*) into v_count from public.members
      where company_id = new.company_id and active and role = 'gerant' and id <> new.id;
      if v_count >= v_limit then
        raise exception 'Votre offre comprend % gérant%. Passez à l''offre supérieure pour en ajouter.', v_limit, case when v_limit > 1 then 's' else '' end
          using errcode = '22023';
      end if;
    end if;
  else
    v_limit := case when v_open then 30 else public.plan_limit(v_plan) end;
    select count(*) into v_count from public.members
    where company_id = new.company_id and active and role <> 'gerant' and id <> new.id;
    if v_count >= v_limit then
      raise exception 'Votre offre comprend % salariés. Passez à l''offre supérieure pour en ajouter.', v_limit using errcode = '22023';
    end if;
  end if;
  return new;
end $$;

-- Un gérant peut inviter un autre gérant (lien de connexion), mais jamais créer un lien pour lui-même.
create or replace function public.create_invite_link(p_member uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare m public.members; v_token text;
begin
  select * into m from public.members where id = p_member;
  if not found or not public.has_role(m.company_id, 'gerant') then
    raise exception 'Membre introuvable' using errcode = 'P0002';
  end if;
  if not m.active then raise exception 'Ce membre est désactivé' using errcode = '22023'; end if;
  if m.id = public.my_member_id(m.company_id) then
    raise exception 'Vous êtes déjà connecté' using errcode = '22023';
  end if;
  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  update public.members set invite_hash = public._token_hash(v_token), invite_expires_at = now() + interval '7 days'
  where id = p_member;
  return v_token;
end $$;
