-- Create tables for fantasy cat storytelling game
CREATE TABLE public.cat_characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  stats JSONB DEFAULT '{"strength": 1, "stealth": 1, "speed": 1, "intelligence": 1, "charisma": 1}'::jsonb,
  perks TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.story_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  story_theme TEXT,
  current_turn INTEGER DEFAULT 0,
  max_turns INTEGER DEFAULT 20,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  story_content JSONB DEFAULT '[]'::jsonb,
  final_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.story_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_session_id UUID REFERENCES public.story_sessions(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  cat_character_id UUID REFERENCES public.cat_characters(id),
  turn_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.story_turns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_session_id UUID REFERENCES public.story_sessions(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  ai_prompt TEXT NOT NULL,
  player_action TEXT NOT NULL,
  ai_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cat_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_turns ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required)
CREATE POLICY "Allow all operations on cat_characters" 
ON public.cat_characters FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on story_sessions" 
ON public.story_sessions FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on story_players" 
ON public.story_players FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on story_turns" 
ON public.story_turns FOR ALL USING (true) WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_story_sessions_updated_at
BEFORE UPDATE ON public.story_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default cat characters with placeholder data
INSERT INTO public.cat_characters (name, description, stats, perks) VALUES
('Shadow', 'A mysterious black cat with piercing green eyes, master of stealth and cunning.', '{"strength": 2, "stealth": 5, "speed": 4, "intelligence": 4, "charisma": 2}', ARRAY['Shadow Step: Can become invisible for one turn', 'Night Vision: Enhanced perception in dark environments']),
('Flame', 'A fiery orange tabby with boundless energy and fierce loyalty.', '{"strength": 5, "stealth": 2, "speed": 3, "intelligence": 3, "charisma": 4}', ARRAY['Fire Claws: Attacks deal extra damage', 'Inspiring Roar: Boosts nearby allies'' morale']),
('Frost', 'An elegant white cat with ice-blue eyes, calm and calculating.', '{"strength": 3, "stealth": 3, "speed": 2, "intelligence": 5, "charisma": 4}', ARRAY['Frost Shield: Can create protective ice barriers', 'Ancient Wisdom: Knows secrets of old magic']),
('Storm', 'A grey tabby with silver stripes, quick as lightning and unpredictable.', '{"strength": 3, "stealth": 3, "speed": 5, "intelligence": 4, "charisma": 2}', ARRAY['Lightning Speed: Can take two actions per turn once per story', 'Storm Call: Can summon weather effects']),
('Sage', 'A wise brown cat with golden eyes, keeper of ancient knowledge.', '{"strength": 2, "stealth": 2, "speed": 2, "intelligence": 5, "charisma": 5}', ARRAY['Healing Touch: Can heal injuries with magic', 'Diplomatic: Better at peaceful solutions']),
('Rogue', 'A sleek black and white tuxedo cat, charming and mischievous.', '{"strength": 3, "stealth": 4, "speed": 4, "intelligence": 3, "charisma": 5}', ARRAY['Lucky Escape: Can avoid one dangerous situation per story', 'Silver Tongue: Excellent at persuasion and deception']);

-- Enable realtime for the new tables
ALTER TABLE public.story_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.story_players REPLICA IDENTITY FULL;
ALTER TABLE public.story_turns REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.story_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_turns;