-- Create atomic function to create room and host player together
CREATE OR REPLACE FUNCTION public.create_room_with_host(
  room_code_param text,
  room_name_param text,
  host_id_param text,
  host_name_param text,
  current_game_param text DEFAULT 'would_you_rather',
  game_state_param jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  room_record record;
  player_record record;
  result jsonb;
BEGIN
  -- Insert room
  INSERT INTO public.rooms (room_code, name, host_id, current_game, game_state, is_active)
  VALUES (room_code_param, room_name_param, host_id_param, current_game_param, game_state_param, true)
  RETURNING * INTO room_record;
  
  -- Insert host player
  INSERT INTO public.players (room_id, player_name, player_id, is_host)
  VALUES (room_record.id, host_name_param, host_id_param, true)
  RETURNING * INTO player_record;
  
  -- Return both records as JSON
  result := jsonb_build_object(
    'room_data', to_jsonb(room_record),
    'player_data', to_jsonb(player_record)
  );
  
  RETURN result;
END;
$$;