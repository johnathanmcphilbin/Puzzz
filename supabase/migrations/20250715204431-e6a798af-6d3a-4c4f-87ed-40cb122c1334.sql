-- Add more paranoia questions with different spiciness levels

-- Level 1 (Mild/Tame)
INSERT INTO paranoia_questions (question, category, spiciness_level) VALUES 
('Who would be most likely to become a professional streamer?', 'career', 1),
('Who would be most likely to collect vintage toys?', 'hobbies', 1),
('Who would be most likely to win a cooking competition?', 'skills', 1),
('Who would be most likely to become a teacher?', 'career', 1),
('Who would be most likely to adopt 5 cats?', 'pets', 1),
('Who would be most likely to move to a different country?', 'lifestyle', 1),
('Who would be most likely to become a YouTuber?', 'career', 1),
('Who would be most likely to learn a new language fluently?', 'skills', 1),
('Who would be most likely to become a morning person?', 'lifestyle', 1),
('Who would be most likely to write a book?', 'creative', 1);

-- Level 2 (Mild-Medium)
INSERT INTO paranoia_questions (question, category, spiciness_level) VALUES 
('Who would be most likely to have a secret talent?', 'secrets', 2),
('Who would be most likely to cry during a movie?', 'emotions', 2),
('Who would be most likely to talk to themselves in public?', 'quirks', 2),
('Who would be most likely to forget their own birthday?', 'memory', 2),
('Who would be most likely to have a secret crush on a celebrity?', 'secrets', 2),
('Who would be most likely to sing in the shower loudly?', 'quirks', 2),
('Who would be most likely to get lost in their own neighborhood?', 'skills', 2),
('Who would be most likely to have an imaginary friend as an adult?', 'quirks', 2),
('Who would be most likely to eat ice cream for breakfast?', 'food', 2),
('Who would be most likely to talk to animals like they understand?', 'quirks', 2);

-- Level 3 (Medium)
INSERT INTO paranoia_questions (question, category, spiciness_level) VALUES 
('Who would be most likely to have a secret social media account?', 'secrets', 3),
('Who would be most likely to lie about their age?', 'deception', 3),
('Who would be most likely to stalk someone on social media?', 'behavior', 3),
('Who would be most likely to have a secret addiction to reality TV?', 'guilty_pleasures', 3),
('Who would be most likely to fake being sick to avoid work?', 'deception', 3),
('Who would be most likely to read someone else''s diary?', 'secrets', 3),
('Who would be most likely to have a secret Pinterest board?', 'secrets', 3),
('Who would be most likely to pretend to know a song they don''t know?', 'deception', 3),
('Who would be most likely to have a secret fear of something silly?', 'fears', 3),
('Who would be most likely to secretly judge people''s music taste?', 'judgment', 3);

-- Level 4 (Spicy/Provocative)
INSERT INTO paranoia_questions (question, category, spiciness_level) VALUES 
('Who would be most likely to have a secret they''ll never tell?', 'secrets', 4),
('Who would be most likely to have gone through someone else''s phone?', 'privacy', 4),
('Who would be most likely to have had a crush on a friend''s ex?', 'relationships', 4),
('Who would be most likely to have lied about their relationship status?', 'deception', 4),
('Who would be most likely to have a secret dating app profile?', 'dating', 4),
('Who would be most likely to have ghosted someone?', 'relationships', 4),
('Who would be most likely to have a secret vice?', 'secrets', 4),
('Who would be most likely to have feelings for someone in this group?', 'relationships', 4),
('Who would be most likely to have shared someone else''s secret?', 'betrayal', 4),
('Who would be most likely to have a secret they''re ashamed of?', 'shame', 4);

-- Level 5 (Very Spicy/Intense)
INSERT INTO paranoia_questions (question, category, spiciness_level) VALUES 
('Who would be most likely to have done something they regret while drunk?', 'regret', 5),
('Who would be most likely to have had inappropriate thoughts about someone here?', 'taboo', 5),
('Who would be most likely to have a secret that could ruin a friendship?', 'secrets', 5),
('Who would be most likely to have kissed someone they shouldn''t have?', 'relationships', 5),
('Who would be most likely to have a secret that involves someone in this group?', 'group_secrets', 5),
('Who would be most likely to have betrayed a friend''s trust?', 'betrayal', 5),
('Who would be most likely to have feelings they can''t act on?', 'forbidden', 5),
('Who would be most likely to have done something illegal?', 'illegal', 5),
('Who would be most likely to have a secret that would shock everyone?', 'shocking', 5),
('Who would be most likely to have a dark secret from their past?', 'dark_secrets', 5);