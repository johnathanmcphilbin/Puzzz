-- Enable replica identity and real-time for players table
ALTER TABLE public.players REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;