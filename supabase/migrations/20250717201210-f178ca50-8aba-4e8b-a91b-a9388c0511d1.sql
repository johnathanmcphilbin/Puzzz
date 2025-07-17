
-- Fix function search path security issues by setting secure search_path for all functions

-- Update get_current_player_id function with secure search_path
CREATE OR REPLACE FUNCTION public.get_current_player_id()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Get player_id from custom session headers
  RETURN current_setting('request.jwt.claims', true)::json->>'player_id';
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

-- Update is_player_in_room function with secure search_path
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
  
  IF player_id_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.players 
    WHERE room_id = room_uuid 
    AND player_id = player_id_val
  );
END;
$$;

-- Update is_room_host function with secure search_path
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
  
  IF player_id_val IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE id = room_uuid 
    AND host_id = player_id_val
  );
END;
$$;

-- Update cleanup_expired_sessions function with secure search_path
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.player_sessions 
  WHERE expires_at < now() OR is_active = false;
  
  -- Also cleanup inactive rooms older than 24 hours
  DELETE FROM public.rooms 
  WHERE is_active = false 
  AND updated_at < (now() - interval '24 hours');
END;
$$;

-- Update validate_session function with secure search_path
CREATE OR REPLACE FUNCTION public.validate_session(p_player_id text, p_session_token text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.player_sessions 
    WHERE player_id = p_player_id 
    AND session_token = p_session_token 
    AND expires_at > now() 
    AND is_active = true
  );
END;
$$;

-- Update sanitize_input function with secure search_path (already has it but ensuring consistency)
CREATE OR REPLACE FUNCTION public.sanitize_input(input_text text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;
