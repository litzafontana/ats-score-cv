-- Criar bucket para upload temporário de CVs
INSERT INTO storage.buckets (id, name, public)
VALUES ('cv-uploads', 'cv-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: Permitir upload anônimo temporário
CREATE POLICY "Permitir upload temporário de CVs"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (bucket_id = 'cv-uploads');

-- RLS: Backend pode ler CVs usando service_role
CREATE POLICY "Backend pode ler CVs"
ON storage.objects FOR SELECT
TO service_role
USING (bucket_id = 'cv-uploads');

-- RLS: Permitir deleção pelo service_role (limpeza)
CREATE POLICY "Backend pode deletar CVs"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'cv-uploads');