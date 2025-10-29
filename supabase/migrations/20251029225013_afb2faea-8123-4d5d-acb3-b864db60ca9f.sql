-- Fix arquivos table RLS policies
-- Remove the overly permissive policy that allows any operation
DROP POLICY IF EXISTS "System can manage arquivos" ON public.arquivos;

-- Add proper granular policies for arquivos table

-- Policy 1: Service role can INSERT file records
CREATE POLICY "Service role can insert arquivos"
ON public.arquivos
FOR INSERT
TO service_role
WITH CHECK (true);

-- Policy 2: Service role can UPDATE file records
CREATE POLICY "Service role can update arquivos"
ON public.arquivos
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 3: Users can view their own file records
-- (Keep existing policy - already correctly scoped)
-- The existing "Users can view their own arquivos" policy is already correct

-- Policy 4: Service role can DELETE file records (for cleanup)
CREATE POLICY "Service role can delete arquivos"
ON public.arquivos
FOR DELETE
TO service_role
USING (true);

-- Policy 5: Authenticated users can INSERT their own file records
CREATE POLICY "Authenticated users can insert their own arquivos"
ON public.arquivos
FOR INSERT
TO authenticated
WITH CHECK (
  diagnostico_id IN (
    SELECT id FROM diagnosticos
    WHERE (user_id = auth.uid() OR (user_id IS NULL AND email = auth.email()))
  )
);

-- Policy 6: Anonymous users can INSERT file records for their diagnosticos
CREATE POLICY "Anonymous users can insert arquivos for their diagnosticos"
ON public.arquivos
FOR INSERT
TO anon
WITH CHECK (
  diagnostico_id IN (
    SELECT id FROM diagnosticos
    WHERE user_id IS NULL AND email IS NOT NULL
  )
);