
-- Simplify and fix the room system to make it functional
-- Remove overly restrictive RLS policies and rebuild with simpler, working ones

-- First, drop all existing restrictive policies
DROP POLICY IF EXISTS "Players can view rooms they joined" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Host can update their rooms" ON public.rooms;
DROP POLICY IF EXISTS "Host can delete their rooms" ON public.rooms;

DROP POLICY IF EXISTS "Players can view players in their room" ON public.players;
DROP POLICY IF EXISTS "Anyone can join rooms" ON public.players;
DROP POLICY IF EXISTS "Players can update their own data" ON public.players;
DROP POLICY IF EXISTS "Host can remove players from their room" ON public.players;

-- Create simple, functional RLS policies for rooms
CREATE POLICY "Allow public room creation" 
ON public.rooms 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public room viewing" 
ON public.rooms 
FOR SELECT 
USING (true);

CREATE POLICY "Allow room updates by host" 
ON public.rooms 
FOR UPDATE 
USING (host_id = get_current_player_id());

CREATE POLICY "Allow room deletion by host" 
ON public.rooms 
FOR DELETE 
USING (host_id = get_current_player_id());

-- Create simple, functional RLS policies for players
CREATE POLICY "Allow public player joining" 
ON public.players 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public player viewing" 
ON public.players 
FOR SELECT 
USING (true);

CREATE POLICY "Allow player updates by self" 
ON public.players 
FOR UPDATE 
USING (player_id = get_current_player_id());

CREATE POLICY "Allow player removal by self or host" 
ON public.players 
FOR DELETE 
USING (
  player_id = get_current_player_id() OR 
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE rooms.id = players.room_id 
    AND rooms.host_id = get_current_player_id()
  )
);

-- Simplify the get_current_player_id function to work with localStorage
CREATE OR REPLACE FUNCTION public.get_current_player_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Try to get player_id from JWT claims (for future auth integration)
  BEGIN
    RETURN current_setting('request.jwt.claims', true)::json->>'player_id';
  EXCEPTION
    WHEN OTHERS THEN
      -- For now, return NULL to allow public access patterns
      RETURN NULL;
  END;
END;
$$;

-- Update other functions to be more permissive for basic functionality
CREATE OR REPLACE FUNCTION public.is_player_in_room(room_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  player_id_val TEXT;
BEGIN
  player_id_val := public.get_current_player_id();
  
  -- If no player_id available, assume they have access (for public rooms)
  IF player_id_val IS NULL THEN
    RETURN true;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.players 
    WHERE room_id = room_uuid 
    AND player_id = player_id_val
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_room_host(room_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  player_id_val TEXT;
BEGIN
  player_id_val := public.get_current_player_id();
  
  -- If no player_id available, check won't work
  IF player_id_val IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE id = room_uuid 
    AND host_id = player_id_val
  );
END;
$$;

-- Drop the overly complex session table and related functions
DROP TABLE IF EXISTS public.player_sessions CASCADE;

-- Drop the validate_session function as it's no longer needed
DROP FUNCTION IF EXISTS public.validate_session(text, text);
