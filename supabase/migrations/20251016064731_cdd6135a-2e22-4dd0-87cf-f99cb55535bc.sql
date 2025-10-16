-- Garantir que o bucket cv-uploads existe e é público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cv-uploads',
  'cv-uploads',
  false,
  20971520, -- 20MB
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'];

-- Políticas RLS para permitir upload e leitura de arquivos CV
CREATE POLICY "Permitir upload de CVs para todos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'cv-uploads');

CREATE POLICY "Permitir leitura de CVs para todos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'cv-uploads');

CREATE POLICY "Permitir atualização de CVs para todos"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'cv-uploads')
WITH CHECK (bucket_id = 'cv-uploads');

CREATE POLICY "Permitir exclusão de CVs para todos"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'cv-uploads');