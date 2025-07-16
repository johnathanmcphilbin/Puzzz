-- Insert default Would You Rather questions
INSERT INTO public.would_you_rather_questions (option_a, option_b, category) VALUES
('Have the ability to fly', 'Have the ability to read minds', 'general'),
('Always be 10 minutes late', 'Always be 20 minutes early', 'general'),
('Live without music', 'Live without movies', 'general'),
('Have super strength', 'Have super speed', 'general'),
('Be famous but unhappy', 'Be unknown but happy', 'general'),
('Have unlimited money', 'Have unlimited time', 'general'),
('Never use social media again', 'Never watch TV again', 'general'),
('Always know the truth', 'Always live in blissful ignorance', 'general'),
('Be able to speak all languages', 'Be able to talk to animals', 'general'),
('Live in the past', 'Live in the future', 'general'),
('Have a rewind button for life', 'Have a pause button for life', 'general'),
('Be incredibly good looking but poor', 'Be incredibly rich but ugly', 'general'),
('Never have to sleep', 'Never have to eat', 'general'),
('Be stuck on a desert island alone', 'Be stuck in a crowded city forever', 'general'),
('Have the power of invisibility', 'Have the power of teleportation', 'general');

-- Insert default Forms questions
INSERT INTO public.forms_questions (question, category, is_controversial) VALUES
('What''s your biggest fear?', 'general', false),
('If you could have dinner with anyone, dead or alive, who would it be?', 'general', false),
('What''s the most embarrassing thing that happened to you in school?', 'general', false),
('What superpower would you choose and why?', 'general', false),
('What''s your go-to karaoke song?', 'general', false),
('If you could live anywhere in the world, where would it be?', 'general', false),
('What''s the weirdest food combination you actually enjoy?', 'general', false),
('What''s your most unpopular opinion?', 'general', false),
('If you could master any skill instantly, what would it be?', 'general', false),
('What''s the best compliment you''ve ever received?', 'general', false),
('What''s something you''re secretly proud of?', 'general', false),
('If you had to eat one meal for the rest of your life, what would it be?', 'general', false),
('What''s the most spontaneous thing you''ve ever done?', 'general', false),
('What''s your biggest pet peeve?', 'general', false),
('If you could time travel to any era, when and where would you go?', 'general', false);

-- Insert default Paranoia questions
INSERT INTO public.paranoia_questions (question, category, spiciness_level) VALUES
('Who is most likely to survive a zombie apocalypse?', 'general', 2),
('Who would be the best at keeping a secret?', 'general', 1),
('Who is most likely to become famous?', 'general', 1),
('Who would you want on your team during a trivia night?', 'general', 1),
('Who is most likely to get lost even with GPS?', 'general', 1),
('Who would be the best travel companion?', 'general', 1),
('Who is most likely to cry during a sad movie?', 'general', 1),
('Who would be the worst person to be stuck in an elevator with?', 'general', 2),
('Who is most likely to forget someone''s birthday?', 'general', 1),
('Who would be the best at surviving in the wilderness?', 'general', 1),
('Who is most likely to start a food fight?', 'general', 2),
('Who would be the best wingman/wingwoman?', 'general', 2),
('Who is most likely to become a millionaire?', 'general', 1),
('Who would you trust to hide a body?', 'general', 3),
('Who is most likely to laugh at inappropriate times?', 'general', 2),
('Who would be the worst at keeping a poker face?', 'general', 1),
('Who is most likely to get into trouble for something they didn''t do?', 'general', 2),
('Who would be the best at giving relationship advice?', 'general', 1),
('Who is most likely to eat something past its expiration date?', 'general', 1),
('Who would be the first to quit during a difficult challenge?', 'general', 2);