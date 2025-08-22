-- Adicionar coluna para análise rica detalhada
ALTER TABLE public.diagnosticos 
ADD COLUMN json_result_rich JSONB;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.diagnosticos.json_result_rich IS 'Análise rica com breakdown por categorias, ações prioritárias e frases prontas (formato ATSRich schema)';