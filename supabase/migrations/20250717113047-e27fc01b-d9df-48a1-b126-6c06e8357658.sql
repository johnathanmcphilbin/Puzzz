-- Completely reset RLS policies for rooms and players
-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all operations for rooms" ON public.rooms;
DROP POLICY IF EXISTS "Enable all operations for rooms" ON public.rooms;
DROP POLICY IF EXISTS "Enable all operations for players" ON public.players;
DROP POLICY IF EXISTS "Allow all operations for players" ON public.players;

-- Disable RLS temporarily to test
ALTER TABLE public.rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.players DISABLE ROW LEVEL SECURITY;

-- Clean up any existing rooms for testing
DELETE FROM public.players;
DELETE FROM public.rooms;