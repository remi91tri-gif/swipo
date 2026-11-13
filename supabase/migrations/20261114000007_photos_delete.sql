-- Swipo — le gérant peut supprimer les photos des chantiers de son entreprise
-- (photo ratée, demande d'un client, effacement RGPD). Les agents ne suppriment rien.

create policy "gérant supprime les photos" on storage.objects
  for delete to authenticated using (
    bucket_id = 'photos'
    and exists (
      select 1 from public.jobs j
      where j.id = public.photo_job(name) and public.has_role(j.company_id, 'gerant')
    )
  );
