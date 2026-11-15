-- Swipo — adresse d'intervention : rue, code postal et ville séparés.
-- La colonne « address » reste l'adresse complète affichée partout (« 27 rue Barla, 06300 Nice ») ;
-- elle est recomposée automatiquement à partir des trois champs, et inversement.

alter table public.sites
  add column if not exists street text,
  add column if not exists postal_code text check (postal_code is null or postal_code ~ '^\d{5}$'),
  add column if not exists city text;

create or replace function public._trg_site_address() returns trigger
language plpgsql set search_path = '' as $$
declare m text[];
begin
  if nullif(trim(new.street), '') is not null and nullif(trim(new.postal_code), '') is not null and nullif(trim(new.city), '') is not null then
    new.street := trim(new.street);
    new.postal_code := trim(new.postal_code);
    new.city := trim(new.city);
    new.address := new.street || ', ' || new.postal_code || ' ' || new.city;
  elsif tg_op = 'INSERT' or new.address is distinct from old.address then
    -- Adresse saisie d'un bloc (« rue, 06000 Ville ») : on en tire les trois champs si possible.
    m := regexp_match(coalesce(new.address, ''), '^\s*(.+?),\s*(\d{5})\s+(.+?)\s*$');
    if m is not null then
      new.street := m[1]; new.postal_code := m[2]; new.city := m[3];
    else
      new.street := null; new.postal_code := null; new.city := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists site_address on public.sites;
create trigger site_address before insert or update on public.sites
  for each row execute function public._trg_site_address();
revoke execute on function public._trg_site_address() from public, anon, authenticated;

-- Adresses déjà enregistrées : découpage quand elles suivent la forme « rue, 06000 Ville ».
update public.sites s set street = x.m[1], postal_code = x.m[2], city = x.m[3]
from (select id, regexp_match(address, '^\s*(.+?),\s*(\d{5})\s+(.+?)\s*$') as m from public.sites) x
where x.id = s.id and x.m is not null and s.postal_code is null;
