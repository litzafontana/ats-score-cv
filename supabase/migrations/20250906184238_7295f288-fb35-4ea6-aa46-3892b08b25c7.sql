-- Remove the overly permissive policy that allows public access to user emails
DROP POLICY IF EXISTS "System service role can manage usuarios gratuitos" ON public.usuarios_gratuitos;

-- Create a secure policy that only allows users to view their own data
CREATE POLICY "Users can view their own usage data" 
ON public.usuarios_gratuitos 
FOR SELECT 
USING (email = auth.email());

-- Edge functions will use service role key which bypasses RLS automatically
-- No additional policies needed for system operations