-- Create paranoia_questions table
CREATE TABLE public.paranoia_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  spiciness_level INTEGER DEFAULT 1 CHECK (spiciness_level >= 1 AND spiciness_level <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create paranoia_rounds table
CREATE TABLE public.paranoia_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  question_id UUID NOT NULL REFERENCES public.paranoia_questions(id),
  asker_player_id TEXT NOT NULL,
  chosen_player_id TEXT NOT NULL,
  is_revealed BOOLEAN DEFAULT false,
  round_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.paranoia_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paranoia_rounds ENABLE ROW LEVEL SECURITY;

-- Create policies for paranoia_questions
CREATE POLICY "Allow all operations on paranoia questions" 
ON public.paranoia_questions 
FOR ALL 
USING (true);

-- Create policies for paranoia_rounds
CREATE POLICY "Allow all operations on paranoia rounds" 
ON public.paranoia_rounds 
FOR ALL 
USING (true);

-- Insert sample questions
INSERT INTO public.paranoia_questions (question, category, spiciness_level) VALUES
('Who here would survive a zombie apocalypse the longest?', 'survival', 2),
('Who would be the first to cry during a sad movie?', 'personality', 1),
('Who would be most likely to become famous?', 'personality', 2),
('Who would eat the most pizza at a party?', 'food', 1),
('Who would be the best at keeping a secret?', 'trust', 2),
('Who would be most likely to get lost even with GPS?', 'funny', 1),
('Who would be the best wingman/wingwoman?', 'relationships', 3),
('Who would be most likely to win a dance battle?', 'skills', 2),
('Who here has the most charisma?', 'personality', 2),
('Who would be the first to quit a difficult video game?', 'gaming', 1),
('Who would be most likely to start a successful business?', 'career', 2),
('Who has the best poker face?', 'skills', 2),
('Who would be most likely to become a millionaire?', 'success', 2),
('Who would be the best travel companion?', 'personality', 1),
('Who would be most likely to get kicked out of a library?', 'funny', 2),
('Who here gives the best hugs?', 'affection', 1),
('Who would be most likely to forget their own birthday?', 'forgetful', 1),
('Who would be the first to use a dating app?', 'relationships', 3),
('Who would be most likely to win a cooking competition?', 'skills', 2),
('Who here is the biggest risk-taker?', 'personality', 3);