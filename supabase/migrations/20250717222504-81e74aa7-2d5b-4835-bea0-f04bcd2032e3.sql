-- Enable realtime for players and rooms tables
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;

-- Add the tables to the supabase_realtime publication
DO $$
BEGIN
  -- If publication doesn't exist, create it
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime FOR TABLE public.players, public.rooms;
  ELSE
    -- If publication exists, add tables to it
    ALTER PUBLICATION supabase_realtime ADD TABLE public.players, public.rooms;
  END IF;
END
$$;