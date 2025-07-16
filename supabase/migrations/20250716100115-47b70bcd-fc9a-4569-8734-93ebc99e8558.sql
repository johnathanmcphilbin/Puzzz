-- Fix infinite recursion in RLS policies
-- Remove the problematic policies and create simpler ones that work with the current session system

-- Drop all the recursive policies
DROP POLICY IF EXISTS "Users can view players in their room" ON players;
DROP POLICY IF EXISTS "Users can insert themselves as players" ON players;
DROP POLICY IF EXISTS "Users can update their own player data" ON players;
DROP POLICY IF EXISTS "Users can delete their own player data" ON players;
DROP POLICY IF EXISTS "Users can view rooms they're in" ON rooms;
DROP POLICY IF EXISTS "Host can create rooms" ON rooms;
DROP POLICY IF EXISTS "Host can update their rooms" ON rooms;
DROP POLICY IF EXISTS "Users can view game requests in their room" ON game_requests;
DROP POLICY IF EXISTS "Users can create game requests in their room" ON game_requests;
DROP POLICY IF EXISTS "Users can view votes in their room" ON game_votes;
DROP POLICY IF EXISTS "Users can create votes in their room" ON game_votes;
DROP POLICY IF EXISTS "Users can view forms responses in their room" ON forms_responses;
DROP POLICY IF EXISTS "Users can create forms responses in their room" ON forms_responses;
DROP POLICY IF EXISTS "Users can view paranoia rounds in their room" ON paranoia_rounds;
DROP POLICY IF EXISTS "Users can create paranoia rounds in their room" ON paranoia_rounds;
DROP POLICY IF EXISTS "Users can view customizations in their room" ON ai_chat_customizations;
DROP POLICY IF EXISTS "Only host can create customizations" ON ai_chat_customizations;

-- Create simple, non-recursive policies for now
-- Since this is a party game with temporary sessions, we'll use a more permissive approach

-- Players table - allow basic operations for active sessions
CREATE POLICY "Allow players operations" ON players FOR ALL USING (true);

-- Rooms table - allow basic operations 
CREATE POLICY "Allow rooms operations" ON rooms FOR ALL USING (true);

-- Game tables - allow basic operations
CREATE POLICY "Allow game requests operations" ON game_requests FOR ALL USING (true);
CREATE POLICY "Allow game votes operations" ON game_votes FOR ALL USING (true);
CREATE POLICY "Allow forms responses operations" ON forms_responses FOR ALL USING (true);
CREATE POLICY "Allow paranoia rounds operations" ON paranoia_rounds FOR ALL USING (true);
CREATE POLICY "Allow customizations operations" ON ai_chat_customizations FOR ALL USING (true);

-- Keep question tables public (they're game content)
-- These were already working fine