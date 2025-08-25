-- Remove the analytics view completely to resolve security definer view issue
-- The view is not essential for core app functionality
DROP VIEW IF EXISTS public.usuarios_gratuitos_stats;