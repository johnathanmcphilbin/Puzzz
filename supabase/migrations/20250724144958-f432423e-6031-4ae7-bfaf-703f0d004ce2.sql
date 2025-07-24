-- Create an atomic function to create room and add host player
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
AS $$
DECLARE
  room_data JSON;
  player_data JSON;
  room_id UUID;
BEGIN
  -- Set search path for security
  SET search_path = public;
  
  -- Start transaction block
  BEGIN
    -- Create the room
    INSERT INTO public.rooms (
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
    
    -- Add the host as a player
    INSERT INTO public.players (
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
    
    -- Get the created room data
    SELECT to_json(r.*) INTO room_data
    FROM public.rooms r
    WHERE r.id = room_id;
    
    -- Return success with room data
    RETURN json_build_object(
      'success', true,
      'room', room_data,
      'message', 'Room and player created successfully'
    );
    
  EXCEPTION
    WHEN OTHERS THEN
      -- If anything fails, the transaction will be rolled back
      RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'message', 'Failed to create room and player'
      );
  END;
END;
$$;