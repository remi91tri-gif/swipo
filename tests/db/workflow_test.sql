-- Tests du schéma Swipo : sécurité entre entreprises, droits des rôles, cycle d'un chantier.
-- Chaque vérification lève une erreur si le comportement n'est pas celui attendu.

\set ON_ERROR_STOP 1
set client_min_messages = warning;

-- Assertions
create or replace function pg_temp.check(ok boolean, what text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'ÉCHEC : %', what; end if;
  raise notice 'ok  %', what;
end $$;
-- Vérifie qu'une instruction échoue (droits ou règle métier).
create or replace function pg_temp.fails(sql text, what text) returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    raise notice 'ok  % (refusé : %)', what, sqlerrm;
    return;
  end;
  raise exception 'ÉCHEC : % aurait dû être refusé', what;
end $$;
set client_min_messages = notice;

-- Comptes : Marc (gérant entreprise A), Karim (agent A), Paul (gérant entreprise B)
insert into auth.users (id, email, phone) values
  ('00000000-0000-0000-0000-0000000000a1', 'marc@eclat-riviera.test', null),
  ('00000000-0000-0000-0000-0000000000a2', null, '+33600000001'),
  ('00000000-0000-0000-0000-0000000000b1', 'paul@concurrent.test', null);

-- ===== Marc crée son entreprise =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select public.create_company('Éclat Riviera', 'Marc', 'Bernard', '0600000000', array['vitrerie']) as company_a \gset
select pg_temp.check(public.has_role(:'company_a', 'gerant'), 'Marc est gérant de son entreprise');
select pg_temp.fails($$select public.create_company('Deuxième', 'Marc')$$, 'Marc ne peut pas créer une 2e entreprise');

insert into public.members (company_id, first_name, last_name, phone, role)
values (:'company_a', 'Karim', 'B.', '06 00 00 00 01', 'agent') returning id as karim \gset
insert into public.clients (company_id, type, name, phone) values (:'company_a', 'professionnel', 'Boulangerie du Port', '0493000000') returning id as client \gset
insert into public.sites (company_id, client_id, address, access_info) values (:'company_a', :'client', '4 quai Lunel, Nice', 'Clé sous le comptoir') returning id as site \gset
select id as marc from public.members where user_id = auth.uid() \gset

insert into public.jobs (company_id, client_id, site_id, title, scheduled_date, start_time, duration_min,
  photos_before_required, photos_after_required, checklist_required, created_by)
values (:'company_a', :'client', :'site', 'Vitrerie commerce', current_date, '07:00', 60, true, true, true, :'marc')
returning id as job \gset
select pg_temp.check((select status from public.jobs where id = :'job') = 'a_planifier', 'Sans agent, le chantier est À planifier');
insert into public.checklist_items (company_id, job_id, label, position) values
  (:'company_a', :'job', 'Vitrine extérieure', 1), (:'company_a', :'job', 'Vitrine intérieure', 2);
insert into public.job_assignments (company_id, job_id, member_id, is_lead) values (:'company_a', :'job', :'karim', true);
select pg_temp.check((select status from public.jobs where id = :'job') = 'planifie', 'Avec un agent et un horaire, il passe Planifié');
select pg_temp.check((select count(*) from public.job_events where job_id = :'job' and type = 'cree') = 1, 'La création est inscrite dans l''historique');
reset role;

-- ===== Paul (autre entreprise) ne voit rien de l'entreprise A =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
set role authenticated;
select public.create_company('Concurrent Propreté', 'Paul') as company_b \gset
select pg_temp.check((select count(*) from public.jobs) = 0, 'Paul ne voit aucun chantier de A');
select pg_temp.check((select count(*) from public.clients) = 0, 'Paul ne voit aucun client de A');
select pg_temp.check((select count(*) from public.members) = 1, 'Paul ne voit que lui-même dans les équipes');
select pg_temp.check((select count(*) from public.companies) = 1, 'Paul ne voit que son entreprise');
update public.jobs set title = 'piraté' where id = :'job';
select pg_temp.check((select count(*) from public.jobs where title = 'piraté') = 0, 'Paul ne peut pas modifier un chantier de A');
select pg_temp.check(public.validate_jobs(array[:'job'::uuid]) = 0, 'Paul ne peut pas valider un chantier de A');
select pg_temp.fails(format($$select public.start_job(%L)$$, :'job'), 'Paul ne peut pas démarrer un chantier de A');
select pg_temp.fails(format($$insert into public.clients (company_id, name) values (%L, 'Faux')$$, :'company_a'), 'Paul ne peut pas créer un client chez A');
reset role;

-- ===== Karim (agent) se connecte par SMS =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
set role authenticated;
select pg_temp.check(public.claim_invitation() = 1, 'La connexion par SMS relie Karim à sa fiche (numéro reconnu malgré les espaces)');
select pg_temp.check((select count(*) from public.jobs) = 1, 'Karim voit le chantier auquel il est affecté');
select pg_temp.check((select count(*) from public.clients) = 0, 'Karim ne voit pas la fiche client (coordonnées)');
select pg_temp.check((select count(*) from public.sites) = 1, 'Karim voit l''adresse et l''accès du chantier');
update public.jobs set status = 'valide' where id = :'job';
select pg_temp.check((select status from public.jobs where id = :'job') = 'planifie', 'Karim ne peut pas changer le statut directement');
select pg_temp.fails(format($$insert into public.job_assignments (company_id, job_id, member_id) values (%L, %L, %L)$$, :'company_a', :'job', :'karim'), 'Karim ne peut pas s''affecter lui-même');
select pg_temp.fails(format($$select public.finish_job(%L)$$, :'job'), 'Impossible de terminer un chantier non démarré');

select pg_temp.check(public.start_job(:'job') = 'en_cours', 'Karim démarre le chantier');
select pg_temp.fails(format($$select public.finish_job(%L)$$, :'job'), 'Terminer sans photos ni checklist est refusé');
insert into public.photos (company_id, job_id, kind, storage_path, taken_by) values (:'company_a', :'job', 'avant', 'a/1.jpg', :'karim');
select pg_temp.fails(format($$insert into public.photos (company_id, job_id, kind, storage_path, taken_by) values (%L, %L, 'apres', 'x.jpg', %L)$$, :'company_a', :'job', :'marc'), 'Karim ne peut pas ajouter une photo au nom de Marc');
insert into public.photos (company_id, job_id, kind, storage_path, taken_by) values (:'company_a', :'job', 'apres', 'a/2.jpg', :'karim');
select public.set_checklist_item(id, true) from public.checklist_items where job_id = :'job';
select pg_temp.check(public.finish_job(:'job', 'Calcaire tenace côté quai') = 'termine', 'Avec photos et checklist, Karim termine');
reset role;

-- ===== Marc valide, puis cycle imprévu et reprise =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select pg_temp.check((select count(*) from public.notifications where type = 'chantier_termine') = 1, 'Marc est notifié de la fin du chantier');
select pg_temp.check((select count(*) from public.notifications) = 1, 'Marc ne voit que ses propres notifications');
select pg_temp.check(public.validate_jobs(array[:'job'::uuid]) = 1, 'Marc valide le chantier');
select pg_temp.check((select status from public.jobs where id = :'job') = 'valide', 'Le chantier est Validé');

insert into public.jobs (company_id, client_id, site_id, title, scheduled_date, start_time, created_by)
values (:'company_a', :'client', :'site', 'Vitres villa', current_date, '09:00', :'marc') returning id as job2 \gset
insert into public.job_assignments (company_id, job_id, member_id) values (:'company_a', :'job2', :'karim');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
set role authenticated;
select public.start_job(:'job2');
select public.report_incident(:'job2', 'acces_impossible', 'bloquant', 'Portail fermé') as incident \gset
select pg_temp.check((select status from public.jobs where id = :'job2') = 'a_traiter', 'Un imprévu bloquant passe le chantier À traiter');
select pg_temp.fails(format($$select public.decide_incident(%L, 'continuer')$$, :'incident'), 'Karim ne peut pas décider à la place du gérant');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select pg_temp.check(public.decide_incident(:'incident', 'continuer', 'J''ai appelé le client') = 'en_cours', 'Marc répond Continuer : le chantier repasse En cours');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
set role authenticated;
select pg_temp.check((select count(*) from public.notifications where type = 'decision_gerant') = 1, 'Karim reçoit la décision de Marc');
select pg_temp.check(public.finish_job(:'job2') = 'termine', 'Sans exigence de preuves, Karim termine directement');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select pg_temp.fails(format($$select public.request_rework(%L, '  ')$$, :'job2'), 'Une reprise sans motif est refusée');
select public.request_rework(:'job2', 'Traces sur la baie vitrée', current_date + 3, '07:00');
select pg_temp.check((select status from public.jobs where id = :'job2') = 'a_reprendre', 'La reprise passe le chantier À reprendre');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
set role authenticated;
select pg_temp.check(public.start_job(:'job2') = 'en_cours', 'Karim redémarre le chantier pour la reprise');
select pg_temp.check((select count(*) from public.job_events where job_id = :'job2' and type = 'reprise_demarree') = 1, 'La reprise apparaît dans l''historique');
reset role;

-- ===== Lot 2 : création d'un chantier en une opération =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select public.create_job(
  p_title => 'Nettoyage après déménagement', p_trade => 'Après déménagement',
  p_new_client => '{"name": "Mme Rossi", "phone": "0611111111"}'::jsonb,
  p_new_site => '{"address": "18 bd de Cimiez, 06000 Nice", "access_info": "Clés chez la gardienne"}'::jsonb,
  p_date => current_date, p_time => '14:00', p_duration => 120,
  p_photos_required => true, p_checklist => array['Cuisine', 'Salle de bain', '  '],
  p_members => array[:'karim'::uuid], p_lead => :'karim'::uuid
) as job3 \gset
select pg_temp.check((select status from public.jobs where id = :'job3') = 'planifie', 'Le nouveau chantier avec agent et horaire est Planifié');
select pg_temp.check((select count(*) from public.checklist_items where job_id = :'job3') = 2, 'La checklist ignore les lignes vides (2 points)');
select pg_temp.check((select checklist_required and photos_before_required and photos_after_required from public.jobs where id = :'job3'), 'Photos et checklist sont exigées');
select pg_temp.check((select count(*) from public.clients where name = 'Mme Rossi') = 1, 'Le nouveau client est créé');
select pg_temp.check((select count(*) from public.job_services where job_id = :'job3') = 1, 'La prestation est enregistrée');
select pg_temp.check((select is_lead from public.job_assignments where job_id = :'job3') , 'Karim est responsable du chantier');
select pg_temp.fails($$select public.create_job(p_title => 'Sans adresse', p_trade => '', p_new_client => '{"name": "X"}'::jsonb)$$, 'Un chantier sans adresse est refusé');
select pg_temp.check((select count(*) from public.clients where name = 'X') = 0, 'Un échec ne laisse pas de client créé à moitié');
select public.create_job(p_title => 'Sans agent', p_trade => '', p_client => :'client', p_site => :'site') as job4 \gset
select pg_temp.check((select status from public.jobs where id = :'job4') = 'a_planifier', 'Sans agent ni date, le chantier est À planifier');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
set role authenticated;
select pg_temp.fails(format($$select public.create_job(p_title => 'Intrus', p_trade => '', p_client => %L, p_site => %L)$$, :'client', :'site'), 'Paul ne peut pas créer de chantier chez un client de A');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
set role authenticated;
select pg_temp.fails(format($$select public.create_job(p_title => 'Agent', p_trade => '', p_client => %L, p_site => %L)$$, :'client', :'site'), 'Un agent ne peut pas créer de chantier');
reset role;

-- ===== Lot 3 : stockage des photos =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
set role authenticated;
insert into storage.objects (bucket_id, name) values ('photos', format('%s/%s/avant-1.jpg', :'company_a', :'job3'));
select pg_temp.check((select count(*) from storage.objects) = 1, 'Karim dépose une photo dans son chantier');
select pg_temp.fails(format($$insert into storage.objects (bucket_id, name) values ('photos', '%s/%s/x.jpg')$$, :'company_a', :'job4'), 'Karim ne peut pas déposer dans un chantier où il n''est pas affecté');
select pg_temp.fails(format($$insert into storage.objects (bucket_id, name) values ('photos', '%s/%s/x.jpg')$$, :'company_b', :'job3'), 'Un chemin incohérent (mauvaise entreprise) est refusé');
select pg_temp.fails(format($$insert into storage.objects (bucket_id, name) values ('photos', 'n-importe-quoi.jpg')$$), 'Un chemin mal formé est refusé');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
set role authenticated;
select pg_temp.check((select count(*) from storage.objects) = 0, 'Paul ne voit aucune photo de A');
select pg_temp.fails(format($$insert into storage.objects (bucket_id, name) values ('photos', '%s/%s/intrus.jpg')$$, :'company_a', :'job3'), 'Paul ne peut pas déposer de photo chez A');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select pg_temp.check((select count(*) from storage.objects) = 1, 'Marc voit la photo de Karim');
reset role;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
set role authenticated;
delete from storage.objects;
reset role;
select pg_temp.check((select count(*) from storage.objects) = 1, 'Karim (agent) ne peut pas supprimer de photo');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
set role authenticated;
delete from storage.objects;
reset role;
select pg_temp.check((select count(*) from storage.objects) = 1, 'Paul ne peut pas supprimer une photo de A');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
delete from storage.objects;
reset role;
select pg_temp.check((select count(*) from storage.objects) = 0, 'Marc (gérant) supprime une photo de son chantier');

-- ===== Fonctions internes fermées =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
set role authenticated;
select pg_temp.fails(format($$select public._log_event(%L, %L, 'faux', null)$$, :'company_a', :'job'), 'Paul ne peut pas écrire dans l''historique de A');
select pg_temp.fails(format($$select public._notify_managers(%L, %L, 'spam')$$, :'company_a', :'job'), 'Paul ne peut pas envoyer de notifications à A');
select pg_temp.fails(format($$select public._refresh_planning_status(%L)$$, :'job'), 'Paul ne peut pas appeler les fonctions internes');
reset role;

-- ===== Visiteur non connecté =====
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select pg_temp.check((select count(*) from public.jobs) = 0, 'Un visiteur non connecté ne voit rien');
select pg_temp.fails($$select public.create_company('X', 'Y')$$, 'Un visiteur ne peut pas créer d''entreprise');
reset role;

-- ===== Lot 6 : heure réelle des actions faites hors connexion, et retards =====
reset role;
insert into public.jobs (company_id, client_id, site_id, title, scheduled_date, start_time, duration_min,
  photos_before_required, photos_after_required, checklist_required, created_by)
values (:'company_a', :'client', :'site', 'Chantier en retard',
  (now() at time zone 'Europe/Paris' - interval '2 hours')::date, (now() at time zone 'Europe/Paris' - interval '2 hours')::time(0), 60,
  false, false, false, :'marc')
returning id as job3 \gset
insert into public.job_assignments (company_id, job_id, member_id) values (:'company_a', :'job3', :'karim');
select pg_temp.check(public.notify_late_jobs() >= 1, 'Un chantier non démarré 30 min après l''heure est signalé');
select pg_temp.check(public.notify_late_jobs() = 0, 'Le retard n''est signalé qu''une fois');
select pg_temp.check((select count(*) from public.notifications where job_id = :'job3' and type = 'chantier_en_retard' and member_id = :'marc') = 1,
  'Marc reçoit la notification de retard');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', false);
set role authenticated;
select pg_temp.fails($$select public.notify_late_jobs()$$, 'Karim ne peut pas lancer le contrôle des retards');
select public.start_job(:'job3', now() - interval '20 minutes');
select pg_temp.check(abs(extract(epoch from (select started_at from public.jobs where id = :'job3') - (now() - interval '20 minutes'))) < 2,
  'Démarré hors connexion : l''heure réelle du démarrage est gardée');
select public.finish_job(:'job3', null, now() + interval '3 hours');
select pg_temp.check((select finished_at from public.jobs where id = :'job3') <= now(), 'Une heure dans le futur est ramenée à maintenant');
reset role;

-- ===== Lot 7 : liens d'invitation =====
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a9', null);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
insert into public.members (company_id, first_name, role) values (:'company_a', 'Inès', 'agent') returning id as ines \gset
select public.create_invite_link(:'ines') as lien \gset
select pg_temp.check(length(:'lien') = 64, 'Marc obtient un lien d''invitation pour Inès');
select pg_temp.check((select invite_hash from public.members where id = :'ines') <> :'lien', 'Seule l''empreinte du lien est gardée');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
set role authenticated;
select pg_temp.fails(format($$select public.create_invite_link(%L)$$, :'ines'), 'Paul ne peut pas créer de lien pour A');
reset role;
select set_config('request.jwt.claim.sub', '', false);
set role anon;
select pg_temp.check((select first_name from public.invite_info(:'lien')) = 'Inès', 'Avant de rejoindre, on voit le prénom et l''entreprise');
select pg_temp.check((select count(*) from public.invite_info('faux')) = 0, 'Un faux lien ne montre rien');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a9', false);
set role authenticated;
select pg_temp.check(public.claim_invite(:'lien') = 'agent', 'L''appareil d''Inès rejoint l''équipe avec le lien');
select pg_temp.check((select count(*) from public.jobs) >= 0 and public.my_member_id(:'company_a') = :'ines', 'Inès est reconnue comme membre de A');
select pg_temp.fails(format($$select public.claim_invite(%L)$$, :'lien'), 'Le lien ne sert qu''une fois');
reset role;

-- ===== Lot 7 : abonnement, limites, pilotes =====
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select pg_temp.check(public.company_access(:'company_a') = 'essai', 'Une nouvelle entreprise est en essai');
select pg_temp.check((select trial_ends_at::date from public.companies where id = :'company_a') = (now() + interval '14 days')::date, 'L''essai dure 14 jours');
select pg_temp.fails(format($$update public.companies set subscription_status = 'active' where id = %L$$, :'company_a'), 'Le gérant ne peut pas s''activer un abonnement lui-même');
update public.companies set phone = '0493000000' where id = :'company_a';
select pg_temp.check((select phone from public.companies where id = :'company_a') = '0493000000', 'Le gérant modifie encore les coordonnées de son entreprise');
select pg_temp.fails(format($$select public.billing_update('mauvais', %L, p_status => 'active')$$, :'company_a'), 'Sans le secret, impossible de changer l''abonnement');
reset role;
insert into private.settings values ('stripe_webhook_secret', 'whsec_test');
update public.companies set trial_ends_at = now() - interval '1 day' where id = :'company_a';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select pg_temp.check(public.company_access(:'company_a') = 'expire', 'Après l''essai, l''accès expire');
select pg_temp.fails(format($$insert into public.members (company_id, first_name, role) select %L, 'Agent ' || g, 'agent' from generate_series(1, 5) g$$, :'company_a'),
  'Offre Starter : pas plus de 5 salariés');
select public.billing_update('whsec_test', :'company_a', 'cus_123', 'sub_123', 'active', 'pro', 'year', now() + interval '1 year', false);
select pg_temp.check(public.company_access(:'company_a') = 'actif', 'Après paiement (secret correct), l''abonnement est actif');
select pg_temp.check((select plan || '/' || billing_interval from public.companies where id = :'company_a') = 'pro/year', 'Offre Pro annuelle enregistrée');
reset role;
insert into public.pilot_codes (code, uses_left, pilot_days) values ('PILOTE-TEST', 1, 90);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', false);
set role authenticated;
select pg_temp.check((select count(*) from public.pilot_codes) = 0, 'Les codes pilotes ne sont pas lisibles');
select pg_temp.fails($$select public.redeem_pilot_code('INCONNU')$$, 'Un code inconnu est refusé');
select pg_temp.check(public.redeem_pilot_code('pilote-test') > now() + interval '89 days', 'Paul devient pilote pour 90 jours');
select pg_temp.check(public.company_access(:'company_b') = 'pilote', 'Une entreprise pilote a accès gratuitement');
reset role;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
set role authenticated;
select pg_temp.fails($$select public.redeem_pilot_code('PILOTE-TEST')$$, 'Le code ne sert pas plus que prévu');
select pg_temp.check(public.company_access(:'company_b') is null, 'Marc ne voit pas l''état de l''entreprise de Paul');
reset role;

-- ===== Effacement complet d'une entreprise (RGPD) =====
reset role;
delete from public.companies where id = :'company_a';
select pg_temp.check(
  (select count(*) from public.jobs) + (select count(*) from public.clients) + (select count(*) from public.photos)
  + (select count(*) from public.incidents) + (select count(*) from public.job_events) + (select count(*) from public.notifications)
  + (select count(*) from public.members where company_id = :'company_a') = 0,
  'Supprimer l''entreprise A efface toutes ses données');
select pg_temp.check((select count(*) from public.companies where id = :'company_b') = 1, 'L''entreprise B est intacte');

\echo 'Tous les tests de la base sont passés.'
