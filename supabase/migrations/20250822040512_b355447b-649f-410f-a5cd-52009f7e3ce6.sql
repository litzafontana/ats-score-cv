-- Reabilitar RLS na tabela bd_ativo e criar policy segura
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'bd_ativo' AND schemaname = 'public') THEN
        -- Reabilitar RLS
        ALTER TABLE public.bd_ativo ENABLE ROW LEVEL SECURITY;
        
        -- Criar policy para permitir leitura pública (assumindo que é tabela de configuração)
        DROP POLICY IF EXISTS "Allow public read access to bd_ativo" ON public.bd_ativo;
        CREATE POLICY "Allow public read access to bd_ativo" 
        ON public.bd_ativo 
        FOR SELECT 
        USING (true);
        
        -- Atualizar comentário
        COMMENT ON TABLE public.bd_ativo IS 'Tabela de configuração - leitura pública permitida via RLS';
    END IF;
END $$;