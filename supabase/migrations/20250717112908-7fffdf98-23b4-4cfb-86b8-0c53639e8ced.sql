-- Drop and recreate RLS policies for rooms to ensure they work properly
DROP POLICY IF EXISTS "Enable all operations for rooms" ON public.rooms;

-- Create a simple allow-all policy for rooms
CREATE POLICY "Allow all operations for rooms"
ON public.rooms
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;