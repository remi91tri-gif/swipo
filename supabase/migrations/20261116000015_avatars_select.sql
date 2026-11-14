-- Swipo — photos de profil : les membres d'une entreprise peuvent lister les photos de leur entreprise.
-- (Le stockage a besoin de ce droit pour supprimer une ancienne photo.)
create policy "photos de profil de mon entreprise" on storage.objects
  for select to authenticated using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] in (select c::text from public.my_company_ids() c)
  );
