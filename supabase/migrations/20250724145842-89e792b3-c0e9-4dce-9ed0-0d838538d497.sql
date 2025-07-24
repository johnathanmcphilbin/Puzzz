-- Remove unused tables to clean up the database
DROP TABLE IF EXISTS story_turns CASCADE;
DROP TABLE IF EXISTS story_players CASCADE; 
DROP TABLE IF EXISTS story_sessions CASCADE;
DROP TABLE IF EXISTS game_requests CASCADE;

-- Recreate the atomic room creation function with better error handling
DROP FUNCTION IF EXISTS create_room_with_host CASCADE;

CREATE OR REPLACE FUNCTION create_room_with_host(
  p_room_code TEXT,
  p_room_name TEXT,
  p_host_id TEXT,
  p_player_name TEXT,
  p_current_game TEXT DEFAULT 'would_you_rather'
)
RETURNS TABLE(
  success BOOLEAN,
  room_id UUID,
  room_code TEXT,
  player_id TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_room_id UUID;
BEGIN
  -- Create the room first
  INSERT INTO rooms (
    room_code,
    name,
    host_id,
    current_game,
    game_state,
    is_active
  ) VALUES (
    p_room_code,
    p_room_name,
    p_host_id,
    p_current_game,
    '{"phase": "lobby", "votes": {}, "currentQuestion": null}'::jsonb,
    true
  )
  RETURNING id INTO new_room_id;
  
  -- Add the host as a player
  INSERT INTO players (
    room_id,
    player_id,
    player_name,
    is_host
  ) VALUES (
    new_room_id,
    p_host_id,
    p_player_name,
    true
  );
  
  -- Return success
  RETURN QUERY SELECT 
    true as success,
    new_room_id as room_id,
    p_room_code as room_code,
    p_host_id as player_id,
    ''::TEXT as error_message;
    
EXCEPTION
  WHEN OTHERS THEN
    -- Return error details
    RETURN QUERY SELECT 
      false as success,
      NULL::UUID as room_id,
      ''::TEXT as room_code,
      ''::TEXT as player_id,
      SQLERRM as error_message;
END;
$$;

-- Also create a function to join existing rooms atomically
CREATE OR REPLACE FUNCTION join_room_as_player(
  p_room_code TEXT,
  p_player_id TEXT,
  p_player_name TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  room_id UUID,
  player_id TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_room_id UUID;
  existing_player_count INTEGER;
BEGIN
  -- Find the room
  SELECT id INTO target_room_id 
  FROM rooms 
  WHERE room_code = p_room_code AND is_active = true;
  
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
  FROM players 
  WHERE room_id = target_room_id AND player_name = p_player_name;
  
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
$$;