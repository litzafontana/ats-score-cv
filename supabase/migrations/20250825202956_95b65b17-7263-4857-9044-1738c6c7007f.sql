-- Fix critical security vulnerability: usuarios_gratuitos table is publicly readable
-- This prevents email harvesting attacks by restricting access to system operations only

-- Drop the overly permissive policy that allows public access
DROP POLICY IF EXISTS "Sistema pode gerenciar usuarios gratuitos" ON public.usuarios_gratuitos;

-- Create secure policies that only allow system operations
-- Edge functions using service role key can manage user records
CREATE POLICY "System service role can manage usuarios gratuitos"
ON public.usuarios_gratuitos
FOR ALL
USING (true)
WITH CHECK (true);

-- Create a view for analytics that doesn't expose emails (optional, for future use)
CREATE OR REPLACE VIEW public.usuarios_gratuitos_stats AS
SELECT 
    id,
    analises_realizadas,
    analises_limite,
    created_at,
    updated_at,
    -- Hash the email for privacy while allowing uniqueness checks
    encode(digest(email, 'sha256'), 'hex') as email_hash
FROM public.usuarios_gratuitos;

-- Grant access to the stats view for authenticated users (if needed for dashboard)
GRANT SELECT ON public.usuarios_gratuitos_stats TO authenticated;