-- Fix Security Definer View issue by recreating the view without security definer
-- Drop the problematic view and recreate it properly
DROP VIEW IF EXISTS public.usuarios_gratuitos_stats;

-- Create a simple view without security definer properties
-- This view provides analytics data without exposing sensitive emails
CREATE VIEW public.usuarios_gratuitos_stats AS
SELECT 
    COUNT(*) as total_usuarios,
    AVG(analises_realizadas::decimal) as media_analises_realizadas,
    SUM(CASE WHEN analises_realizadas >= analises_limite THEN 1 ELSE 0 END) as usuarios_limite_atingido,
    DATE_TRUNC('day', created_at) as data_criacao,
    COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as novos_usuarios_7_dias
FROM public.usuarios_gratuitos
GROUP BY DATE_TRUNC('day', created_at);

-- Grant select access only to authenticated users for the stats view
REVOKE ALL ON public.usuarios_gratuitos_stats FROM PUBLIC;
GRANT SELECT ON public.usuarios_gratuitos_stats TO authenticated;