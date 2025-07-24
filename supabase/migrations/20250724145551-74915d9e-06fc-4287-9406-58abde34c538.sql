-- Fix ambiguous column reference in the atomic function
CREATE OR REPLACE FUNCTION create_room_with_host(
  p_room_code TEXT,
  p_room_name TEXT,
  p_host_id TEXT,
  p_player_name TEXT,
  p_current_game TEXT DEFAULT 'would_you_rather'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_data JSON;
  player_data JSON;
  room_id UUID;
  player_count INTEGER;
BEGIN
  -- Start transaction block
  BEGIN
    -- Create the room
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
    RETURNING id INTO room_id;
    
    -- Log room creation
    RAISE NOTICE 'Room created with ID: %', room_id;
    
    -- Add the host as a player
    INSERT INTO players (
      room_id,
      player_id,
      player_name,
      is_host
    ) VALUES (
      room_id,
      p_host_id,
      p_player_name,
      true
    );
    
    -- Verify player was created (fixed ambiguous column reference)
    SELECT COUNT(*) INTO player_count
    FROM players p
    WHERE p.room_id = room_id AND p.player_id = p_host_id;
    
    RAISE NOTICE 'Players created for room: %', player_count;
    
    -- Get the created room data
    SELECT to_json(r.*) INTO room_data
    FROM rooms r
    WHERE r.id = room_id;
    
    -- Get the created player data (fixed ambiguous column reference)
    SELECT to_json(p.*) INTO player_data
    FROM players p
    WHERE p.room_id = room_id AND p.player_id = p_host_id;
    
    -- Return success with both room and player data
    RETURN json_build_object(
      'success', true,
      'room', room_data,
      'player', player_data,
      'player_count', player_count,
      'message', 'Room and player created successfully'
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- If anything fails, the transaction will be rolled back
      RAISE NOTICE 'Error in create_room_with_host: %', SQLERRM;
      RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'error_detail', SQLSTATE,
        'message', 'Failed to create room and player'
      );
  END;
END;
$$;