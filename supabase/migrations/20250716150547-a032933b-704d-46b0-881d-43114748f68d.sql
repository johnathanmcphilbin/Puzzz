-- Fix function search path security issues by properly handling all dependencies including triggers

-- First, drop all constraints that depend on the functions
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS valid_room_code;
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS valid_player_name;

-- Drop all triggers that depend on update_updated_at_column function
DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
DROP TRIGGER IF EXISTS update_players_updated_at ON public.players;
DROP TRIGGER IF EXISTS update_game_requests_updated_at ON public.game_requests;
DROP TRIGGER IF EXISTS update_game_votes_updated_at ON public.game_votes;
DROP TRIGGER IF EXISTS update_forms_responses_updated_at ON public.forms_responses;
DROP TRIGGER IF EXISTS update_paranoia_rounds_updated_at ON public.paranoia_rounds;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.validate_room_code(text);
DROP FUNCTION IF EXISTS public.validate_player_name(text);
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Recreate validate_room_code function with secure search_path
CREATE OR REPLACE FUNCTION public.validate_room_code(code text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN code ~ '^[A-Z0-9]{6}$';
END;
$$;

-- Recreate validate_player_name function with secure search_path  
CREATE OR REPLACE FUNCTION public.validate_player_name(name text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN length(trim(name)) BETWEEN 1 AND 50 AND name !~ '[<>"\'';&]';
END;
$$;

-- Recreate update_updated_at_column function with secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the constraints that were dropped
ALTER TABLE public.rooms ADD CONSTRAINT valid_room_code CHECK (public.validate_room_code(room_code));
ALTER TABLE public.players ADD CONSTRAINT valid_player_name CHECK (public.validate_player_name(player_name));

-- Recreate the triggers that were dropped
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();