-- Swipo — une même photo (même fichier) n'est enregistrée qu'une fois, même si l'envoi est répété.
create unique index if not exists photos_storage_path_unique on public.photos (storage_path);
