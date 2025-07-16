-- Fix security issues in RLS policies
-- First, let's create proper RLS policies that actually restrict access

-- Update players table to require authentication and room-specific access
DROP POLICY IF EXISTS "Allow all operations on players" ON players;

CREATE POLICY "Users can view players in their room" ON players
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM players WHERE player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
    )
  );

CREATE POLICY "Users can insert themselves as players" ON players
  FOR INSERT WITH CHECK (
    player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
  );

CREATE POLICY "Users can update their own player data" ON players
  FOR UPDATE USING (
    player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
  );

CREATE POLICY "Users can delete their own player data" ON players
  FOR DELETE USING (
    player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
  );

-- Update rooms table to require authentication
DROP POLICY IF EXISTS "Allow all operations on rooms" ON rooms;

CREATE POLICY "Users can view rooms they're in" ON rooms
  FOR SELECT USING (
    id IN (
      SELECT room_id FROM players WHERE player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
    )
  );

CREATE POLICY "Host can create rooms" ON rooms
  FOR INSERT WITH CHECK (
    host_id = current_setting('request.jwt.claims', true)::json->>'player_id'
  );

CREATE POLICY "Host can update their rooms" ON rooms
  FOR UPDATE USING (
    host_id = current_setting('request.jwt.claims', true)::json->>'player_id'
  );

-- Update game-related tables to require room membership
DROP POLICY IF EXISTS "Allow all operations on game requests" ON game_requests;

CREATE POLICY "Users can view game requests in their room" ON game_requests
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM players WHERE player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
    )
  );

CREATE POLICY "Users can create game requests in their room" ON game_requests
  FOR INSERT WITH CHECK (
    player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
    AND room_id IN (
      SELECT room_id FROM players WHERE player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
    )
  );

-- Update game votes table
DROP POLICY IF EXISTS "Allow all operations on votes" ON game_votes;

CREATE POLICY "Users can view votes in their room" ON game_votes
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM players WHERE player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
    )
  );

CREATE POLICY "Users can create votes in their room" ON game_votes
  FOR INSERT WITH CHECK (
    player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
    AND room_id IN (
      SELECT room_id FROM players WHERE player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
    )
  );

-- Update forms responses table
DROP POLICY IF EXISTS "Allow all operations on forms responses" ON forms_responses;

CREATE POLICY "Users can view forms responses in their room" ON forms_responses
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM players WHERE player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
    )
  );

CREATE POLICY "Users can create forms responses in their room" ON forms_responses
  FOR INSERT WITH CHECK (
    player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
    AND room_id IN (
      SELECT room_id FROM players WHERE player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
    )
  );

-- Update paranoia rounds table
DROP POLICY IF EXISTS "Allow all operations on paranoia rounds" ON paranoia_rounds;

CREATE POLICY "Users can view paranoia rounds in their room" ON paranoia_rounds
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM players WHERE player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
    )
  );

CREATE POLICY "Users can create paranoia rounds in their room" ON paranoia_rounds
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT room_id FROM players WHERE player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
    )
  );

-- Update AI chat customizations table
DROP POLICY IF EXISTS "Users can view customizations for their room" ON ai_chat_customizations;
DROP POLICY IF EXISTS "Users can create customizations for their room" ON ai_chat_customizations;

CREATE POLICY "Users can view customizations in their room" ON ai_chat_customizations
  FOR SELECT USING (
    room_id IN (
      SELECT room_code FROM rooms WHERE id IN (
        SELECT room_id FROM players WHERE player_id = current_setting('request.jwt.claims', true)::json->>'player_id'
      )
    )
  );

CREATE POLICY "Only host can create customizations" ON ai_chat_customizations
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT room_code FROM rooms WHERE host_id = current_setting('request.jwt.claims', true)::json->>'player_id'
    )
  );

-- Add input validation functions
CREATE OR REPLACE FUNCTION validate_room_code(code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN code ~ '^[A-Z0-9]{6}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION validate_player_name(name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN length(trim(name)) BETWEEN 1 AND 50 AND name !~ '[<>"\'';&]';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add constraints for input validation
ALTER TABLE rooms ADD CONSTRAINT valid_room_code CHECK (validate_room_code(room_code));
ALTER TABLE players ADD CONSTRAINT valid_player_name CHECK (validate_player_name(player_name));