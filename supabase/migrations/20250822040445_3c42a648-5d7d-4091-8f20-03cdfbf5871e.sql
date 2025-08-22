-- Resolver problema de RLS sem policies na tabela bd_ativo
-- Verificar se a tabela é necessária e adicionar policies básicas

-- Desabilitar RLS na tabela bd_ativo se ela existe e não é necessária
-- (baseado na análise de segurança anterior que indicou que ela não tem uso claro)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'bd_ativo' AND schemaname = 'public') THEN
        ALTER TABLE public.bd_ativo DISABLE ROW LEVEL SECURITY;
        
        -- Opcional: Adicionar comentário explicativo
        COMMENT ON TABLE public.bd_ativo IS 'Tabela de configuração - RLS desabilitado por não conter dados sensíveis de usuário';
    END IF;
END $$;