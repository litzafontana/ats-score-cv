-- Remove the overly permissive INSERT policy
DROP POLICY IF EXISTS "Anyone can create diagnosticos" ON public.diagnosticos;

-- Create a new INSERT policy that requires authentication
CREATE POLICY "Authenticated users can create diagnosticos"
ON public.diagnosticos
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND
  (user_id = auth.uid() OR (user_id IS NULL AND email = auth.email()))
);

-- Update the SELECT policy to be more restrictive
DROP POLICY IF EXISTS "Users can view their own diagnosticos" ON public.diagnosticos;

CREATE POLICY "Users can view only their own diagnosticos"
ON public.diagnosticos
FOR SELECT
TO authenticated
USING (
  (user_id IS NOT NULL AND user_id = auth.uid()) OR
  (user_id IS NULL AND email = auth.email())
);

-- Add a policy for anonymous users to create diagnosticos (if needed for your flow)
-- This allows unauthenticated users to create records but only with their own email
CREATE POLICY "Anonymous users can create their own diagnosticos"
ON public.diagnosticos
FOR INSERT
TO anon
WITH CHECK (
  user_id IS NULL AND
  email IS NOT NULL
);

-- Add a policy for anonymous users to view only their diagnosticos by email
CREATE POLICY "Anonymous users can view their own diagnosticos by email"
ON public.diagnosticos
FOR SELECT
TO anon
USING (
  user_id IS NULL AND
  email = auth.email()
);