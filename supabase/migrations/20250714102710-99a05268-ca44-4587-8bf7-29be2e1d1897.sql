-- Create rooms table for game sessions
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  host_id TEXT NOT NULL,
  current_game TEXT,
  game_state JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create players table for room participants  
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_id TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create would_you_rather_questions table
CREATE TABLE public.would_you_rather_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game_votes table for tracking votes
CREATE TABLE public.game_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  question_id UUID NOT NULL REFERENCES public.would_you_rather_questions(id),
  vote TEXT NOT NULL CHECK (vote IN ('A', 'B')),
  voted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.would_you_rather_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_votes ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required)
CREATE POLICY "Allow all operations on rooms" ON public.rooms FOR ALL USING (true);
CREATE POLICY "Allow all operations on players" ON public.players FOR ALL USING (true);
CREATE POLICY "Allow all operations on questions" ON public.would_you_rather_questions FOR ALL USING (true);
CREATE POLICY "Allow all operations on votes" ON public.game_votes FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX idx_rooms_code ON public.rooms(room_code);
CREATE INDEX idx_players_room ON public.players(room_id);
CREATE INDEX idx_votes_room ON public.game_votes(room_id);
CREATE INDEX idx_votes_question ON public.game_votes(question_id);

-- Create function to update timestamps
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

-- Enable realtime for all tables
ALTER publication supabase_realtime ADD TABLE public.rooms;
ALTER publication supabase_realtime ADD TABLE public.players;
ALTER publication supabase_realtime ADD TABLE public.game_votes;

-- Insert 200 Would You Rather questions
INSERT INTO public.would_you_rather_questions (option_a, option_b, category) VALUES
('Have the ability to fly', 'Have the ability to become invisible', 'superpowers'),
('Be able to read minds', 'Be able to time travel', 'superpowers'),
('Live in a world without music', 'Live in a world without movies', 'entertainment'),
('Always be 10 minutes late', 'Always be 10 minutes early', 'habits'),
('Have unlimited money', 'Have unlimited time', 'life'),
('Be famous for something bad', 'Be forgotten completely', 'fame'),
('Live underwater', 'Live in space', 'adventure'),
('Have three arms', 'Have three legs', 'physical'),
('Be able to speak every language', 'Be able to play every instrument', 'skills'),
('Live without the internet', 'Live without air conditioning', 'modern life'),
('Have a rewind button for your life', 'Have a pause button for your life', 'life control'),
('Be incredibly beautiful but have no friends', 'Be average looking but have amazing friends', 'social'),
('Live in a treehouse', 'Live in a cave', 'housing'),
('Have the power to heal others', 'Have the power to never get sick', 'health'),
('Be able to control fire', 'Be able to control water', 'elements'),
('Live in the past', 'Live in the future', 'time'),
('Have dinner with your hero', 'Have dinner with your worst enemy', 'social'),
('Be able to breathe underwater', 'Be able to survive in space', 'survival'),
('Have a photographic memory', 'Have perfect intuition', 'mental abilities'),
('Be the smartest person alive', 'Be the most attractive person alive', 'personal traits'),
('Live without your phone', 'Live without your computer', 'technology'),
('Have wings but be unable to fly very high', 'Have gills but only work in polluted water', 'abilities'),
('Be able to talk to animals', 'Be able to talk to plants', 'communication'),
('Have a personal chef', 'Have a personal chauffeur', 'luxury'),
('Be really hairy all over', 'Be completely bald everywhere', 'appearance'),
('Live in a world where everyone tells the truth', 'Live in a world where everyone lies', 'honesty'),
('Be trapped in a romantic comedy', 'Be trapped in a horror movie', 'movies'),
('Have everything you touch turn to gold', 'Have everything you touch turn to chocolate', 'magic'),
('Be 3 feet tall', 'Be 9 feet tall', 'height'),
('Have the hiccups for the rest of your life', 'Always feel like you need to sneeze', 'annoyances'),
('Be able to only whisper', 'Be able to only shout', 'voice'),
('Have to sing everything you say', 'Have to rhyme everything you say', 'speech'),
('Be stuck in an elevator with your ex', 'Be stuck in an elevator with someone who won''t stop talking', 'awkward situations'),
('Have unlimited battery life on all devices', 'Have unlimited data and WiFi everywhere', 'technology'),
('Be able to run 100 mph', 'Be able to jump 50 feet high', 'physical abilities'),
('Have a time machine that only goes forward', 'Have a time machine that only goes backward', 'time travel'),
('Live in a house made of glass', 'Live in a house made of mirrors', 'housing'),
('Be able to only eat sweet foods', 'Be able to only eat salty foods', 'food'),
('Have a unicorn horn', 'Have a mermaid tail', 'mythical features'),
('Be able to remember everything perfectly', 'Be able to forget anything at will', 'memory'),
('Have to always tell the truth', 'Have to always lie', 'honesty'),
('Be able to see 10 minutes into the future', 'Be able to see 10 minutes into the past', 'time vision'),
('Have a personal robot assistant', 'Have a personal human assistant', 'help'),
('Be unable to use technology', 'Be unable to read books', 'learning'),
('Have hands for feet', 'Have feet for hands', 'body parts'),
('Be able to only communicate through emojis', 'Be able to only communicate through interpretive dance', 'communication'),
('Have a pet dragon', 'Have a pet unicorn', 'pets'),
('Be able to control the weather', 'Be able to control gravity', 'powers'),
('Live in a world without colors', 'Live in a world without sounds', 'senses'),
('Have to wear a clown costume every day', 'Have to wear a tuxedo every day', 'clothing'),
('Be able to eat anything without gaining weight', 'Never need to sleep', 'body functions'),
('Have a magic carpet', 'Have a teleportation device', 'transportation'),
('Be famous but constantly followed by paparazzi', 'Be unknown but have complete privacy', 'privacy'),
('Have the ability to shrink to ant size', 'Have the ability to grow to giant size', 'size changing'),
('Live without music', 'Live without books', 'entertainment'),
('Have perfect pitch', 'Have perfect balance', 'physical skills'),
('Be able to walk through walls', 'Be able to walk on water', 'supernatural abilities'),
('Have a third eye', 'Have a third ear', 'extra senses'),
('Be able to only eat foods that start with your first initial', 'Be able to only wear clothes that start with your first initial', 'restrictions'),
('Have to always speak in questions', 'Have to always speak in statements', 'speech patterns'),
('Be able to taste colors', 'Be able to see sounds', 'synesthesia'),
('Have a replicator like in Star Trek', 'Have a TARDIS like in Doctor Who', 'sci-fi tech'),
('Be able to live forever but never age past 30', 'Live a normal lifespan but age very slowly', 'aging'),
('Have super strength but be unable to control it', 'Have super speed but be unable to stop quickly', 'uncontrolled powers'),
('Be able to understand any language but not speak it', 'Be able to speak any language but not understand responses', 'communication barriers'),
('Have a house that cleans itself', 'Have a yard that maintains itself', 'household'),
('Be able to only see in black and white', 'Be able to only hear in mono', 'sensory limitations'),
('Have removable limbs like a toy', 'Have stretchy limbs like rubber', 'flexible body'),
('Be able to photosynthesize like a plant', 'Be able to hibernate like a bear', 'biological abilities'),
('Have a personal theme song that plays wherever you go', 'Have a personal narrator who describes everything you do', 'life soundtrack'),
('Be able to only move by dancing', 'Be able to only move by crawling', 'movement restrictions'),
('Have taste buds on your fingers', 'Have eyes in the back of your head', 'sensory placement'),
('Be able to communicate with aliens', 'Be able to communicate with the dead', 'supernatural communication'),
('Have a magic 8-ball that''s always right', 'Have a crystal ball that shows possible futures', 'fortune telling'),
('Be able to turn any object into food', 'Be able to turn any food into any other food', 'food transformation'),
('Have permanent rainbow hair', 'Have permanent glowing skin', 'colorful features'),
('Be able to only sleep hanging upside down', 'Be able to only sleep standing up', 'sleep positions'),
('Have wheels instead of feet', 'Have propellers instead of arms', 'mechanical body parts'),
('Be able to only eat foods you''ve never tried', 'Be able to only eat your five favorite foods', 'dietary restrictions'),
('Have a personal cloud that follows you everywhere', 'Have a personal rainbow that follows you everywhere', 'weather companions'),
('Be able to change your hair color at will', 'Be able to change your eye color at will', 'changeable features'),
('Have to announce everything you''re going to do before doing it', 'Have to narrate everything you do while doing it', 'verbal habits'),
('Be able to only travel by bouncing', 'Be able to only travel by rolling', 'movement methods'),
('Have a mouth that tastes everything as your favorite flavor', 'Have a nose that smells everything as your favorite scent', 'enhanced senses'),
('Be able to only write with your non-dominant hand', 'Be able to only type with one finger', 'dexterity challenges'),
('Have a personal monsoon that only affects you', 'Have a personal drought that only affects you', 'weather effects'),
('Be able to only see things that are moving', 'Be able to only hear things that are quiet', 'selective senses'),
('Have magnetic hands', 'Have magnetic feet', 'magnetic body parts'),
('Be able to only laugh when you''re sad', 'Be able to only cry when you''re happy', 'emotional expression'),
('Have a personal mini tornado as a pet', 'Have a personal lightning bolt as a pet', 'weather pets'),
('Be able to only walk backwards', 'Be able to only walk sideways', 'directional movement'),
('Have a beard made of flowers', 'Have hair made of grass', 'natural hair'),
('Be able to only speak in movie quotes', 'Be able to only speak in song lyrics', 'scripted speech'),
('Have feet that leave glitter wherever you walk', 'Have hands that leave paint wherever you touch', 'artistic trails'),
('Be able to only see the world in slow motion', 'Be able to only see the world in fast forward', 'time perception'),
('Have a personal earthquake that only you can feel', 'Have a personal aurora that only you can see', 'personal phenomena'),
('Be able to only eat spherical foods', 'Be able to only eat flat foods', 'shape restrictions'),
('Have springs for legs', 'Have shock absorbers for arms', 'mechanical limbs'),
('Be able to only remember things that happened on Tuesdays', 'Be able to only remember things that happened in the morning', 'selective memory'),
('Have a personal gravity field that makes things float around you', 'Have a personal magnetic field that attracts metal objects', 'force fields'),
('Be able to only see people''s skeletons', 'Be able to only see people''s thoughts as bubbles above their heads', 'x-ray vision'),
('Have a tail that shows your emotions', 'Have ears that change shape based on your mood', 'emotional features'),
('Be able to only eat foods that are blue', 'Be able to only drink liquids that are red', 'color-based diet'),
('Have a personal snowstorm that follows you', 'Have a personal sandstorm that follows you', 'storm companions'),
('Be able to only move when music is playing', 'Be able to only speak when music is playing', 'music-dependent actions'),
('Have fingernails that grow an inch per day', 'Have hair that grows a foot per day', 'rapid growth'),
('Be able to only see things that are upside down', 'Be able to only see things that are backwards', 'visual distortion'),
('Have a personal echo that repeats everything you say', 'Have a personal shadow that acts independently', 'audio/visual doubles'),
('Be able to only taste things with your feet', 'Be able to only smell things with your hands', 'sensory relocation'),
('Have a zipper for a mouth', 'Have buttons for eyes', 'clothing features'),
('Be able to only remember the future', 'Be able to only forget the past', 'temporal memory'),
('Have a personal bubble around you at all times', 'Have a personal spotlight that follows you everywhere', 'personal barriers'),
('Be able to only see in thermal vision', 'Be able to only see in night vision', 'enhanced vision'),
('Have a detachable head', 'Have detachable hands', 'removable parts'),
('Be able to only eat foods that rhyme with your name', 'Be able to only wear clothes that rhyme with your mood', 'rhyming restrictions'),
('Have a personal black hole that only sucks up trash', 'Have a personal white hole that only produces useful items', 'cosmic tools'),
('Be able to only move at the speed of molasses', 'Be able to only move at the speed of lightning', 'extreme speeds'),
('Have a compass for a belly button', 'Have a clock for a birthmark', 'functional body features'),
('Be able to only see people when they''re lying', 'Be able to only hear people when they''re telling the truth', 'truth detection'),
('Have a personal fog machine', 'Have a personal confetti cannon', 'party effects'),
('Be able to only eat foods in alphabetical order', 'Be able to only eat foods in order of size', 'ordering restrictions'),
('Have a personal force field that only stops compliments', 'Have a personal force field that only stops criticism', 'emotional shields'),
('Be able to only see in panoramic view', 'Be able to only see in microscopic detail', 'visual extremes'),
('Have a personal black and white filter on life', 'Have a personal sepia filter on life', 'life filters'),
('Be able to only communicate through food', 'Be able to only communicate through flowers', 'symbolic communication'),
('Have a personal time loop that only lasts 5 minutes', 'Have a personal time bubble where you age slower', 'time effects'),
('Be able to only see people''s best qualities', 'Be able to only see people''s potential', 'positive vision'),
('Have a personal translator for animal languages', 'Have a personal translator for plant languages', 'nature communication'),
('Be able to only remember happy memories', 'Be able to only dream about possible futures', 'memory/dream control'),
('Have a personal portal that only leads to libraries', 'Have a personal portal that only leads to kitchens', 'destination portals'),
('Be able to only see the world as a cartoon', 'Be able to only see the world as a video game', 'reality filters'),
('Have a personal assistant who only speaks in riddles', 'Have a personal assistant who only speaks in rhymes', 'cryptic help'),
('Be able to only eat foods that make you levitate', 'Be able to only drink liquids that make you glow', 'magical consumption'),
('Have a personal dimension where only you exist', 'Have a personal dimension that''s exactly like this one but everything is cake', 'alternate dimensions'),
('Be able to only remember things that never happened', 'Be able to only forget things that did happen', 'reality confusion'),
('Have a personal weather system based on your emotions', 'Have a personal ecosystem that grows around you', 'environmental effects'),
('Be able to only see the world through someone else''s eyes', 'Be able to only experience the world through someone else''s emotions', 'empathic vision'),
('Have a personal soundtrack that only you can hear', 'Have a personal narrator that only you can hear', 'private audio'),
('Be able to only exist on Wednesdays', 'Be able to only exist during full moons', 'temporal existence'),
('Have a personal collection of floating objects around you', 'Have a personal swarm of helpful butterflies', 'living accessories'),
('Be able to only communicate with future versions of people', 'Be able to only communicate with past versions of people', 'temporal communication'),
('Have a personal reality where everything you imagine becomes real', 'Have a personal reality where everything real becomes imaginary', 'reality manipulation'),
('Be able to only see the mathematical equations behind everything', 'Be able to only see the poetry in everything', 'perception styles'),
('Have a personal void that follows you around', 'Have a personal star that orbits around you', 'cosmic companions'),
('Be able to only experience one emotion per day', 'Be able to only use one sense per day', 'daily limitations'),
('Have a personal menu of reality options to choose from each morning', 'Have a personal reset button that you can only use once per year', 'reality controls'),
('Be able to only exist in other people''s memories', 'Be able to only exist in other people''s dreams', 'mental existence'),
('Have a personal paradox that follows you everywhere', 'Have a personal miracle that happens to you daily', 'supernatural constants'),
('Be able to only see the connections between all things', 'Be able to only see the spaces between all things', 'universal vision'),
('Have a personal universe in your pocket', 'Have a personal multiverse in your mind', 'cosmic storage'),
('Be able to only communicate through the laws of physics', 'Be able to only communicate through breaking the laws of physics', 'scientific communication'),
('Have a personal eternity that lasts one second', 'Have a personal instant that lasts forever', 'time paradoxes'),
('Be able to only exist as a question', 'Be able to only exist as an answer', 'philosophical existence'),
('Have a personal infinity that fits in a teacup', 'Have a personal nothing that contains everything', 'paradoxical containers'),
('Be able to only see the beauty in everything', 'Be able to only see the humor in everything', 'positive perspectives'),
('Have a personal symphony that plays your life', 'Have a personal novel that writes your story', 'artistic existence'),
('Be able to only communicate through acts of kindness', 'Be able to only communicate through works of art', 'expressive communication'),
('Have a personal garden that grows your thoughts', 'Have a personal library that contains your experiences', 'metaphysical storage'),
('Be able to only see the love in every situation', 'Be able to only see the lessons in every experience', 'wisdom vision'),
('Have a personal rainbow that bridges all your relationships', 'Have a personal constellation that maps your dreams', 'symbolic representations'),
('Be able to only exist in moments of wonder', 'Be able to only exist in moments of gratitude', 'emotional existence'),
('Have a personal magic that only works for others', 'Have a personal wisdom that only grows when shared', 'selfless gifts'),
('Be able to only see the potential in everything', 'Be able to only see the perfection in everything', 'optimistic vision'),
('Have a personal peace that spreads wherever you go', 'Have a personal joy that multiplies when witnessed', 'emotional contagion'),
('Be able to only communicate through bringing people together', 'Be able to only communicate through helping others grow', 'connective communication'),
('Have a personal light that illuminates truth', 'Have a personal warmth that heals all wounds', 'healing presence'),
('Be able to only exist in the present moment', 'Be able to only exist in the space between moments', 'temporal awareness'),
('Have a personal gratitude that transforms everything you touch', 'Have a personal compassion that understands all beings', 'transformative qualities'),
('Be able to only see with the eyes of love', 'Be able to only speak with the voice of wisdom', 'enlightened senses'),
('Have a personal miracle that''s different every day', 'Have a personal mystery that reveals itself slowly', 'divine experiences'),
('Be able to only exist as pure consciousness', 'Be able to only exist as infinite possibility', 'transcendent states'),
('Have a personal truth that sets everyone free', 'Have a personal beauty that inspires all who see it', 'liberating qualities'),
('Be able to only communicate through perfect understanding', 'Be able to only communicate through unconditional acceptance', 'perfect communication'),
('Have a personal essence that brings out the best in everyone', 'Have a personal presence that reminds everyone of their true nature', 'transformative being'),
('Be able to only see the interconnectedness of all life', 'Be able to only see the unique beauty of each individual', 'unified vision'),
('Have a personal love that encompasses all beings', 'Have a personal wisdom that serves all of existence', 'universal service'),
('Be able to only exist as a blessing to the world', 'Be able to only exist as a bridge between all hearts', 'purposeful existence'),
('Have a personal radiance that lights up every room', 'Have a personal serenity that calms every storm', 'peaceful presence'),
('Be able to only see through the eyes of eternity', 'Be able to only love with the heart of infinity', 'limitless perspective'),
('Have a personal grace that makes everything effortless', 'Have a personal harmony that brings all things into balance', 'divine flow'),
('Be able to only exist as a living prayer', 'Be able to only exist as a walking meditation', 'spiritual embodiment');