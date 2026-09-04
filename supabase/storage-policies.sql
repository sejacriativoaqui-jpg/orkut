-- ============================================================
-- STORAGE — rode DEPOIS de criar os buckets pelo Dashboard
-- (Storage > New bucket, marque "Public bucket" nos 5 abaixo):
--   avatars, covers, posts, communities, albums
-- ============================================================

-- Leitura pública em todos os buckets do app
create policy "orkut buckets: leitura pública"
on storage.objects for select
using (bucket_id in ('avatars','covers','posts','communities','albums'));

-- Upload: só autenticado, e só dentro da própria pasta (path = uid/arquivo.jpg)
create policy "orkut buckets: upload na própria pasta"
on storage.objects for insert
with check (
  bucket_id in ('avatars','covers','posts','communities','albums')
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Atualizar/substituir: só o dono do arquivo
create policy "orkut buckets: atualizar próprio arquivo"
on storage.objects for update
using (
  bucket_id in ('avatars','covers','posts','communities','albums')
  and auth.uid()::text = (storage.foldername(name))[1]
);

-- Excluir: só o dono do arquivo
create policy "orkut buckets: excluir próprio arquivo"
on storage.objects for delete
using (
  bucket_id in ('avatars','covers','posts','communities','albums')
  and auth.uid()::text = (storage.foldername(name))[1]
);
