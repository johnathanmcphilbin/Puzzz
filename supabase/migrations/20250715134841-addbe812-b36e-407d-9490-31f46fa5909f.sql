-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Add user_id to rooms table
ALTER TABLE public.rooms ADD COLUMN user_id UUID REFERENCES auth.users(id);

-- Update rooms policies to be auth-based
DROP POLICY IF EXISTS "Allow all operations on rooms" ON public.rooms;

CREATE POLICY "Users can view rooms they created or joined" 
ON public.rooms 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = rooms.id 
    AND players.player_id = auth.uid()::text
  )
);

CREATE POLICY "Authenticated users can create rooms" 
ON public.rooms 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND auth.uid() IS NOT NULL);

CREATE POLICY "Room owners can update their rooms" 
ON public.rooms 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Room owners can delete their rooms" 
ON public.rooms 
FOR DELETE 
USING (auth.uid() = user_id);

-- Update players policies to be auth-based
DROP POLICY IF EXISTS "Allow all operations on players" ON public.players;

CREATE POLICY "Users can view players in rooms they have access to" 
ON public.players 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE rooms.id = players.room_id 
    AND (rooms.user_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.players p2 
                WHERE p2.room_id = rooms.id 
                AND p2.player_id = auth.uid()::text))
  )
);

CREATE POLICY "Authenticated users can join rooms" 
ON public.players 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Players can update their own player record" 
ON public.players 
FOR UPDATE 
USING (player_id = auth.uid()::text);

-- Update game-related tables policies
DROP POLICY IF EXISTS "Allow all operations on game requests" ON public.game_requests;

CREATE POLICY "Users can view game requests for rooms they have access to" 
ON public.game_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE rooms.id = game_requests.room_id 
    AND (rooms.user_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.players 
                WHERE players.room_id = rooms.id 
                AND players.player_id = auth.uid()::text))
  )
);

CREATE POLICY "Players can create game requests" 
ON public.game_requests 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = game_requests.room_id 
    AND players.player_id = auth.uid()::text
  )
);

-- Update game votes policies
DROP POLICY IF EXISTS "Allow all operations on votes" ON public.game_votes;

CREATE POLICY "Users can view votes for rooms they have access to" 
ON public.game_votes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE rooms.id = game_votes.room_id 
    AND (rooms.user_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.players 
                WHERE players.room_id = rooms.id 
                AND players.player_id = auth.uid()::text))
  )
);

CREATE POLICY "Players can vote" 
ON public.game_votes 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = game_votes.room_id 
    AND players.player_id = auth.uid()::text
  )
);

-- Update forms responses policies
DROP POLICY IF EXISTS "Allow all operations on forms responses" ON public.forms_responses;

CREATE POLICY "Users can view forms responses for rooms they have access to" 
ON public.forms_responses 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE rooms.id = forms_responses.room_id 
    AND (rooms.user_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.players 
                WHERE players.room_id = rooms.id 
                AND players.player_id = auth.uid()::text))
  )
);

CREATE POLICY "Players can submit forms responses" 
ON public.forms_responses 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = forms_responses.room_id 
    AND players.player_id = auth.uid()::text
  )
);

-- Update paranoia rounds policies
DROP POLICY IF EXISTS "Allow all operations on paranoia rounds" ON public.paranoia_rounds;

CREATE POLICY "Users can view paranoia rounds for rooms they have access to" 
ON public.paranoia_rounds 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.rooms 
    WHERE rooms.id = paranoia_rounds.room_id 
    AND (rooms.user_id = auth.uid() OR 
         EXISTS (SELECT 1 FROM public.players 
                WHERE players.room_id = rooms.id 
                AND players.player_id = auth.uid()::text))
  )
);

CREATE POLICY "Players can create paranoia rounds" 
ON public.paranoia_rounds 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.players 
    WHERE players.room_id = paranoia_rounds.room_id 
    AND players.player_id = auth.uid()::text
  )
);

-- Update analytics policies to be more restrictive
DROP POLICY IF EXISTS "Allow all operations on analytics events" ON public.analytics_events;
DROP POLICY IF EXISTS "Allow all operations on analytics sessions" ON public.analytics_sessions;

CREATE POLICY "Users can view their own analytics events" 
ON public.analytics_events 
FOR SELECT 
USING (user_id = auth.uid()::text);

CREATE POLICY "System can insert analytics events" 
ON public.analytics_events 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own analytics sessions" 
ON public.analytics_sessions 
FOR SELECT 
USING (session_id = auth.uid()::text);

CREATE POLICY "System can manage analytics sessions" 
ON public.analytics_sessions 
FOR ALL 
USING (true);

-- Create trigger to auto-create profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for profiles updated_at
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();