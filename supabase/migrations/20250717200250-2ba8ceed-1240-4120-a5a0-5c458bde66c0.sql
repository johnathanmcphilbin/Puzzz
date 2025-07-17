
-- Phase 1: Critical RLS Policy Fixes
-- Enable RLS on all tables and implement proper access control

-- First, enable RLS on players and rooms tables
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Enable all operations for players" ON public.players;
DROP POLICY IF EXISTS "Enable all operations for rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow customizations operations" ON public.ai_chat_customizations;
DROP POLICY IF EXISTS "Allow game requests operations" ON public.game_requests;
DROP POLICY IF EXISTS "Allow game votes operations" ON public.game_votes;
DROP POLICY IF EXISTS "Allow forms responses operations" ON public.forms_responses;
DROP POLICY IF EXISTS "Allow paranoia rounds operations" ON public.paranoia_rounds;

-- Create security definer functions for session validation
CREATE OR REPLACE FUNCTION public.get_current_player_id()
RETURNS TEXT AS $$
BEGIN
  -- Get player_id from custom session headers
  RETURN current_setting('request.jwt.claims', true)::json->>'player_id';
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_player_in_room(room_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  player_id_val TEXT;
BEGIN
  player_id_val := public.get_current_player_id();
  
  IF player_id_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.players 
    WHERE room_id = room_uuid 
    AND player_id = player_id_val
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_room_host(room_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  player_id_val TEXT;
BEGIN
  player_id_val := public.get_current_player_id();
  
  IF player_id_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE id = room_uuid 
    AND host_id = player_id_val
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Implement proper RLS policies for rooms
CREATE POLICY "Players can view rooms they joined" ON public.rooms
  FOR SELECT 
  USING (public.is_player_in_room(id));

CREATE POLICY "Anyone can create rooms" ON public.rooms
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Host can update their rooms" ON public.rooms
  FOR UPDATE 
  USING (public.is_room_host(id));

CREATE POLICY "Host can delete their rooms" ON public.rooms
  FOR DELETE 
  USING (public.is_room_host(id));

-- Implement proper RLS policies for players
CREATE POLICY "Players can view players in their room" ON public.players
  FOR SELECT 
  USING (public.is_player_in_room(room_id));

CREATE POLICY "Anyone can join rooms" ON public.players
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Players can update their own data" ON public.players
  FOR UPDATE 
  USING (player_id = public.get_current_player_id());

CREATE POLICY "Host can remove players from their room" ON public.players
  FOR DELETE 
  USING (public.is_room_host(room_id) OR player_id = public.get_current_player_id());

-- Implement proper RLS policies for game-related tables
CREATE POLICY "Players can view game requests in their room" ON public.game_requests
  FOR SELECT 
  USING (public.is_player_in_room(room_id));

CREATE POLICY "Players can create game requests in their room" ON public.game_requests
  FOR INSERT 
  WITH CHECK (public.is_player_in_room(room_id));

CREATE POLICY "Players can view votes in their room" ON public.game_votes
  FOR SELECT 
  USING (public.is_player_in_room(room_id));

CREATE POLICY "Players can vote in their room" ON public.game_votes
  FOR INSERT 
  WITH CHECK (public.is_player_in_room(room_id));

CREATE POLICY "Players can view forms responses in their room" ON public.forms_responses
  FOR SELECT 
  USING (public.is_player_in_room(room_id));

CREATE POLICY "Players can submit forms responses in their room" ON public.forms_responses
  FOR INSERT 
  WITH CHECK (public.is_player_in_room(room_id));

CREATE POLICY "Players can view paranoia rounds in their room" ON public.paranoia_rounds
  FOR SELECT 
  USING (public.is_player_in_room(room_id));

CREATE POLICY "Players can create paranoia rounds in their room" ON public.paranoia_rounds
  FOR INSERT 
  WITH CHECK (public.is_player_in_room(room_id));

CREATE POLICY "Host can view AI customizations for their room" ON public.ai_chat_customizations
  FOR SELECT 
  USING (room_id IN (SELECT room_code FROM public.rooms WHERE public.is_room_host(id)));

CREATE POLICY "Host can create AI customizations for their room" ON public.ai_chat_customizations
  FOR INSERT 
  WITH CHECK (room_id IN (SELECT room_code FROM public.rooms WHERE public.is_room_host(id)));

-- Add session validation and constraints
CREATE TABLE IF NOT EXISTS public.player_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id TEXT NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  room_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE public.player_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their own sessions" ON public.player_sessions
  FOR SELECT 
  USING (player_id = public.get_current_player_id());

CREATE POLICY "Anyone can create sessions" ON public.player_sessions
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Players can update their own sessions" ON public.player_sessions
  FOR UPDATE 
  USING (player_id = public.get_current_player_id());

-- Add database-level validation constraints
ALTER TABLE public.players ADD CONSTRAINT valid_player_name_length 
  CHECK (char_length(trim(player_name)) BETWEEN 1 AND 50);

ALTER TABLE public.rooms ADD CONSTRAINT valid_room_name_length 
  CHECK (char_length(trim(name)) BETWEEN 1 AND 100);

-- Add unique constraint for player names per room
ALTER TABLE public.players ADD CONSTRAINT unique_player_name_per_room 
  UNIQUE (room_id, player_name);

-- Create function to cleanup expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM public.player_sessions 
  WHERE expires_at < now() OR is_active = false;
  
  -- Also cleanup inactive rooms older than 24 hours
  DELETE FROM public.rooms 
  WHERE is_active = false 
  AND updated_at < (now() - interval '24 hours');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to validate session
CREATE OR REPLACE FUNCTION public.validate_session(p_player_id TEXT, p_session_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.player_sessions 
    WHERE player_id = p_player_id 
    AND session_token = p_session_token 
    AND expires_at > now() 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add input sanitization function
CREATE OR REPLACE FUNCTION public.sanitize_input(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove potentially dangerous characters and limit length
  RETURN LEFT(
    regexp_replace(
      COALESCE(input_text, ''), 
      '[<>"\'';&]', 
      '', 
      'g'
    ), 
    1000
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;
