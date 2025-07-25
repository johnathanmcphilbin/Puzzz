-- Ensure replica identity is set to FULL for players table to capture all column changes
ALTER TABLE public.players REPLICA IDENTITY FULL;