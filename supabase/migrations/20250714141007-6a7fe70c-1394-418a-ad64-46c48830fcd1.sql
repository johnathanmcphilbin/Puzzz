-- Create a table for forms game questions
CREATE TABLE public.forms_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  is_controversial BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.forms_questions ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow all operations on forms questions" 
ON public.forms_questions 
FOR ALL 
USING (true);

-- Create table for forms game responses
CREATE TABLE public.forms_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  question_id UUID NOT NULL,
  player_id TEXT NOT NULL,
  selected_player_id TEXT NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.forms_responses ENABLE ROW LEVEL SECURITY;

-- Create policy for forms responses
CREATE POLICY "Allow all operations on forms responses" 
ON public.forms_responses 
FOR ALL 
USING (true);

-- Insert sample forms questions
INSERT INTO public.forms_questions (question, category, is_controversial) VALUES
('Who is most likely to get arrested?', 'personality', true),
('Who is most likely to become famous?', 'personality', false),
('Who is most likely to win the lottery and lose it all?', 'personality', false),
('Who is most likely to forget their own birthday?', 'personality', false),
('Who is most likely to become a millionaire?', 'personality', false),
('Who is most likely to get into a bar fight?', 'personality', true),
('Who is most likely to become a teacher?', 'career', false),
('Who is most likely to live abroad?', 'lifestyle', false),
('Who is most likely to have the most kids?', 'lifestyle', false),
('Who is most likely to never get married?', 'lifestyle', true),
('Who is most likely to become an influencer?', 'personality', false),
('Who is most likely to go skydiving?', 'adventure', false),
('Who is most likely to eat something weird on a dare?', 'personality', false),
('Who is most likely to get a tattoo they regret?', 'personality', true),
('Who is most likely to become a politician?', 'career', true),
('Who is most likely to survive a zombie apocalypse?', 'survival', false),
('Who is most likely to cry during a movie?', 'personality', false),
('Who is most likely to become a chef?', 'career', false),
('Who is most likely to get lost in their own city?', 'personality', false),
('Who is most likely to have a secret talent?', 'personality', false),
('Who is most likely to become a CEO?', 'career', false),
('Who is most likely to adopt 10 cats?', 'lifestyle', false),
('Who is most likely to go on a reality TV show?', 'personality', false),
('Who is most likely to become a professional athlete?', 'career', false),
('Who is most likely to start their own business?', 'career', false),
('Who is most likely to move back in with their parents?', 'lifestyle', true),
('Who is most likely to become a YouTuber?', 'career', false),
('Who is most likely to win a game show?', 'personality', false),
('Who is most likely to get banned from a restaurant?', 'personality', true),
('Who is most likely to become a spy?', 'career', false),
('Who is most likely to forget where they parked their car?', 'personality', false),
('Who is most likely to become a stand-up comedian?', 'career', false),
('Who is most likely to get into an argument with a stranger?', 'personality', true),
('Who is most likely to become a hermit?', 'lifestyle', true),
('Who is most likely to win a dance competition?', 'personality', false),
('Who is most likely to become a travel blogger?', 'career', false),
('Who is most likely to get kicked out of a library?', 'personality', true),
('Who is most likely to become a professional gamer?', 'career', false),
('Who is most likely to forget their anniversary?', 'personality', true),
('Who is most likely to become a motivational speaker?', 'career', false),
('Who is most likely to get lost in a mall?', 'personality', false),
('Who is most likely to become a detective?', 'career', false),
('Who is most likely to start a cult?', 'personality', true),
('Who is most likely to become a street performer?', 'career', false),
('Who is most likely to get banned from social media?', 'personality', true),
('Who is most likely to become a food critic?', 'career', false),
('Who is most likely to accidentally dye their hair the wrong color?', 'personality', false),
('Who is most likely to become a life coach?', 'career', false),
('Who is most likely to get into a Twitter argument?', 'personality', true),
('Who is most likely to become a professional organizer?', 'career', false);