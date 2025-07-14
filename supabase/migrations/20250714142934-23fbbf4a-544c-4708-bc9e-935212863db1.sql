-- Add more diverse forms questions beyond just "who's most likely to"
INSERT INTO forms_questions (question, category, is_controversial) VALUES
-- Attractiveness & Physical
('Who is the most attractive person in the group?', 'physical', true),
('Who has the best style/fashion sense?', 'physical', false),
('Who has the most beautiful eyes?', 'physical', false),
('Who is the most photogenic?', 'physical', false),
('Who works out the most?', 'physical', false),

-- Personality & Character
('Who is the funniest person here?', 'personality', false),
('Who is the most intelligent?', 'personality', false),
('Who is the most caring and supportive?', 'personality', false),
('Who has the best sense of humor?', 'personality', false),
('Who is the most creative?', 'personality', false),
('Who is the most dramatic?', 'personality', false),
('Who is the best listener?', 'personality', false),
('Who is the most positive person?', 'personality', false),
('Who is the most mysterious?', 'personality', false),
('Who is the most trustworthy?', 'personality', false),

-- Social & Relationships
('Who is the best friend material?', 'social', false),
('Who would make the best partner?', 'social', true),
('Who is the most popular?', 'social', false),
('Who is the best at giving advice?', 'social', false),
('Who is the most loyal friend?', 'social', false),
('Who is the most flirtatious?', 'social', true),
('Who gives the best hugs?', 'social', false),

-- Skills & Talents
('Who is the best dancer?', 'skills', false),
('Who is the best singer?', 'skills', false),
('Who is the best at video games?', 'skills', false),
('Who is the most artistic?', 'skills', false),
('Who is the smartest academically?', 'skills', false),
('Who is the best cook?', 'skills', false),
('Who has the best taste in music?', 'skills', false),
('Who is the best at sports?', 'skills', false),

-- Fun & Entertainment
('Who would be the most fun on a road trip?', 'fun', false),
('Who tells the best jokes?', 'fun', false),
('Who is the life of the party?', 'fun', false),
('Who would win in a dance battle?', 'fun', false),
('Who has the most interesting stories?', 'fun', false),
('Who would survive longest in a zombie apocalypse?', 'fun', false),
('Who would be the best wingman/wingwoman?', 'fun', false),

-- Controversial/Spicy
('Who is secretly the most jealous?', 'controversial', true),
('Who talks behind people''s backs the most?', 'controversial', true),
('Who is the most manipulative?', 'controversial', true),
('Who has the biggest ego?', 'controversial', true),
('Who is the most fake/two-faced?', 'controversial', true),
('Who is the most selfish?', 'controversial', true),
('Who would cheat in a relationship first?', 'controversial', true),
('Who is the most judgmental?', 'controversial', true),
('Who is the biggest gossip?', 'controversial', true),
('Who has the worst temper?', 'controversial', true),

-- Career & Future
('Who will be the most successful?', 'future', false),
('Who will make the most money?', 'future', false),
('Who will get married first?', 'future', false),
('Who will have kids first?', 'future', false),
('Who will travel the world the most?', 'future', false),
('Who would make the best teacher?', 'future', false),
('Who would make the best boss?', 'future', false);