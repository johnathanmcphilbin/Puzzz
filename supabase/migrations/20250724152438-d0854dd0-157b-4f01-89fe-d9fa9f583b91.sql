-- Fix ambiguous column references in join_room_as_player function
CREATE OR REPLACE FUNCTION public.join_room_as_player(p_room_code text, p_player_id text, p_player_name text)
 RETURNS TABLE(success boolean, room_id uuid, player_id text, error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_room_id UUID;
  existing_player_count INTEGER;
BEGIN
  -- Find the room
  SELECT r.id INTO target_room_id 
  FROM rooms r
  WHERE r.room_code = p_room_code AND r.is_active = true;
  
  IF target_room_id IS NULL THEN
    RETURN QUERY SELECT 
      false as success,
      NULL::UUID as room_id,
      ''::TEXT as player_id,
      'Room not found or inactive'::TEXT as error_message;
    RETURN;
  END IF;
  
  -- Check if player name is already taken
  SELECT COUNT(*) INTO existing_player_count
  FROM players p
  WHERE p.room_id = target_room_id AND p.player_name = p_player_name;
  
  IF existing_player_count > 0 THEN
    RETURN QUERY SELECT 
      false as success,
      NULL::UUID as room_id,
      ''::TEXT as player_id,
      'Player name already taken'::TEXT as error_message;
    RETURN;
  END IF;
  
  -- Add the player
  INSERT INTO players (
    room_id,
    player_id,
    player_name,
    is_host
  ) VALUES (
    target_room_id,
    p_player_id,
    p_player_name,
    false
  );
  
  -- Return success
  RETURN QUERY SELECT 
    true as success,
    target_room_id as room_id,
    p_player_id as player_id,
    ''::TEXT as error_message;
    
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT 
      false as success,
      NULL::UUID as room_id,
      ''::TEXT as player_id,
      SQLERRM as error_message;
END;
$function$;