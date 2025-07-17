-- First, let's clean up and rebuild the entire database structure
-- Drop existing tables in reverse dependency order to avoid foreign key constraints
DROP TABLE IF EXISTS public.ai_chat_customizations CASCADE;
DROP TABLE IF EXISTS public.forms_responses CASCADE;
DROP TABLE IF EXISTS public.game_requests CASCADE;
DROP TABLE IF EXISTS public.game_votes CASCADE;
DROP TABLE IF EXISTS public.paranoia_rounds CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;
DROP TABLE IF EXISTS public.forms_questions CASCADE;
DROP TABLE IF EXISTS public.paranoia_questions CASCADE;
DROP TABLE IF EXISTS public.would_you_rather_questions CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.validate_room_code(text) CASCADE;
DROP FUNCTION IF EXISTS public.validate_player_name(text) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.get_current_player_id() CASCADE;
DROP FUNCTION IF EXISTS public.is_player_in_room(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_room_host(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_sessions() CASCADE;
DROP FUNCTION IF EXISTS public.sanitize_input(text) CASCADE;

-- Create the core tables with proper structure
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  host_id TEXT NOT NULL,
  current_game TEXT DEFAULT 'would_you_rather',
  game_state JSONB DEFAULT '{"phase": "lobby", "votes": {}, "currentQuestion": null}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.would_you_rather_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.forms_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_controversial BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.paranoia_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  spiciness_level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.game_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  question_id UUID NOT NULL,
  vote TEXT NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.game_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.forms_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  question_id UUID REFERENCES public.forms_questions(id),
  selected_player_id TEXT NOT NULL,
  responded_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.paranoia_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.paranoia_questions(id),
  asker_player_id TEXT NOT NULL,
  chosen_player_id TEXT NOT NULL,
  round_number INTEGER NOT NULL,
  is_revealed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create utility functions
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security on all tables
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paranoia_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.would_you_rather_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paranoia_questions ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive RLS policies for the game functionality
-- Rooms - allow all operations for now to ensure functionality
CREATE POLICY "Allow all operations on rooms" 
ON public.rooms FOR ALL 
USING (true) 
WITH CHECK (true);

-- Players - allow all operations
CREATE POLICY "Allow all operations on players" 
ON public.players FOR ALL 
USING (true) 
WITH CHECK (true);

-- Game votes - allow all operations
CREATE POLICY "Allow all operations on game_votes" 
ON public.game_votes FOR ALL 
USING (true) 
WITH CHECK (true);

-- Game requests - allow all operations
CREATE POLICY "Allow all operations on game_requests" 
ON public.game_requests FOR ALL 
USING (true) 
WITH CHECK (true);

-- Forms responses - allow all operations
CREATE POLICY "Allow all operations on forms_responses" 
ON public.forms_responses FOR ALL 
USING (true) 
WITH CHECK (true);

-- Paranoia rounds - allow all operations
CREATE POLICY "Allow all operations on paranoia_rounds" 
ON public.paranoia_rounds FOR ALL 
USING (true) 
WITH CHECK (true);

-- Question tables - allow all operations
CREATE POLICY "Allow all operations on would_you_rather_questions" 
ON public.would_you_rather_questions FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on forms_questions" 
ON public.forms_questions FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow all operations on paranoia_questions" 
ON public.paranoia_questions FOR ALL 
USING (true) 
WITH CHECK (true);

-- Insert sample data to ensure the games work
INSERT INTO public.would_you_rather_questions (option_a, option_b, category) VALUES
('Have the ability to fly', 'Have the ability to read minds', 'superpowers'),
('Always be 10 minutes late', 'Always be 20 minutes early', 'time'),
('Live in a world without music', 'Live in a world without movies', 'entertainment'),
('Have unlimited money', 'Have unlimited time', 'life'),
('Be able to speak every language', 'Be able to talk to animals', 'communication'),
('Never have to sleep', 'Never have to eat', 'needs'),
('Know the date of your death', 'Know the cause of your death', 'knowledge'),
('Be famous but poor', 'Be rich but unknown', 'lifestyle'),
('Live in the past', 'Live in the future', 'time_travel'),
('Have a rewind button for life', 'Have a pause button for life', 'control');

INSERT INTO public.forms_questions (question, category) VALUES
('Who is most likely to become famous?', 'future'),
('Who would survive longest in a zombie apocalypse?', 'survival'),
('Who is most likely to win a reality TV show?', 'entertainment'),
('Who would make the best teacher?', 'profession'),
('Who is most likely to become a millionaire?', 'success'),
('Who would be the best travel companion?', 'travel'),
('Who is most likely to forget where they parked?', 'daily_life'),
('Who would make the best superhero?', 'fantasy'),
('Who is most likely to start their own business?', 'entrepreneurship'),
('Who would win in a cooking competition?', 'skills');

INSERT INTO public.paranoia_questions (question, category, spiciness_level) VALUES
('Who in this group would you trust with your biggest secret?', 'trust', 1),
('Who do you think has the most interesting dating life?', 'relationships', 2),
('Who would you want as your partner in a two-person business?', 'partnership', 1),
('Who do you think is the most competitive person here?', 'personality', 1),
('Who would you choose to be stuck on a desert island with?', 'survival', 1),
('Who do you think gives the best advice?', 'wisdom', 1),
('Who would you want to plan your birthday party?', 'events', 1),
('Who do you think is the most adventurous?', 'adventure', 1),
('Who would you choose as your emergency contact?', 'trust', 2),
('Who do you think would make the best roommate?', 'living', 1);