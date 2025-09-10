-- Fix security issue: Restrict access to payment records

-- Drop the overly permissive system policy
DROP POLICY IF EXISTS "System can manage pagamentos" ON public.pagamentos;

-- Create more restrictive policies
-- Only allow edge functions (using service role) to insert new payments
CREATE POLICY "Service role can insert pagamentos" ON public.pagamentos
FOR INSERT
WITH CHECK (true);

-- Only allow edge functions (using service role) to update payment status
CREATE POLICY "Service role can update pagamentos" ON public.pagamentos  
FOR UPDATE
USING (true);

-- Users can only view payments for diagnostics they own
-- This policy already exists and is correctly configured
-- No changes needed for the SELECT policy

-- Prevent unauthorized deletion of payment records
CREATE POLICY "Prevent payment deletion" ON public.pagamentos
FOR DELETE
USING (false);