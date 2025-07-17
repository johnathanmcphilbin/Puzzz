-- Enable realtime for players and rooms tables
ALTER TABLE IF EXISTS public.players REPLICA IDENTITY FULL;
ALTER TABLE IF EXISTS public.rooms REPLICA IDENTITY FULL;

-- Add the tables to the supabase_realtime publication
BEGIN;
  -- Check if publication exists, if not create it
  SELECT pg_catalog.pg_publication_tables
  WHERE pubname = 'supabase_realtime';

  -- Add tables to the publication if they aren't already in it
  CREATE PUBLICATION supabase_realtime FOR TABLE public.players, public.rooms;
EXCEPTION
  WHEN duplicate_object THEN
    -- If publication already exists, add tables to it
    ALTER PUBLICATION supabase_realtime ADD TABLE public.players, public.rooms;
END;