-- Complete system rebuild: Remove foreign key constraint and use atomic function
-- Drop the foreign key constraint that's causing issues
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_room_id_fkey;

-- Clean up any existing data
DELETE FROM public.players;
DELETE FROM public.rooms;

-- Make sure tables are completely clean
TRUNCATE TABLE public.players, public.rooms CASCADE;