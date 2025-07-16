-- Drop existing policies
DROP POLICY IF EXISTS "Allow players operations" ON public.players;
DROP POLICY IF EXISTS "Allow rooms operations" ON public.rooms;

-- Recreate policies with proper configuration
CREATE POLICY "Enable all operations for players" ON public.players
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all operations for rooms" ON public.rooms  
FOR ALL USING (true) WITH CHECK (true);

-- Ensure RLS is enabled but permissive
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_players_player_id ON public.players(player_id);
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON public.rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON public.rooms(is_active);

-- Ensure realtime is enabled
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;