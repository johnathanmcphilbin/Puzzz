-- Complete rebuild: Use simple manual approach
-- Drop the function and recreate tables fresh
DROP FUNCTION IF EXISTS public.create_room_with_host;

-- Recreate tables with minimal constraints
DROP TABLE IF EXISTS public.players CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;

-- Create rooms table
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  host_id TEXT NOT NULL,
  current_game TEXT DEFAULT 'would_you_rather',
  game_state JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create players table without foreign key
CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  player_name TEXT NOT NULL,
  player_id TEXT NOT NULL UNIQUE,
  is_host BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_rooms_code ON public.rooms(room_code);
CREATE INDEX idx_players_room_id ON public.players(room_id);
CREATE INDEX idx_players_player_id ON public.players(player_id);

-- Add trigger for updated_at
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();