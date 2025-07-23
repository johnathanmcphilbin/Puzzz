-- Update existing questions with better, less obvious prompts
UPDATE odd_one_out_questions SET
  normal_prompt = 'Name something you take to the beach',
  imposter_prompt = 'Name something you take to work'
WHERE category = 'household';

UPDATE odd_one_out_questions SET
  normal_prompt = 'Name a fictional character from movies',
  imposter_prompt = 'Name a fictional character from books'
WHERE category = 'food';

UPDATE odd_one_out_questions SET
  normal_prompt = 'Name something you do when stressed',
  imposter_prompt = 'Name something you do when happy'
WHERE category = 'clothing';

UPDATE odd_one_out_questions SET
  normal_prompt = 'Name something you use to communicate',
  imposter_prompt = 'Name something you use to cook'
WHERE category = 'tools';

UPDATE odd_one_out_questions SET
  normal_prompt = 'Name something you see at night',
  imposter_prompt = 'Name something you see during the day'
WHERE category = 'nature';

UPDATE odd_one_out_questions SET
  normal_prompt = 'Name something you learn at university',
  imposter_prompt = 'Name something you learn in elementary school'
WHERE category = 'education';

-- Remove the obvious hot/cold question
DELETE FROM odd_one_out_questions WHERE category = 'temperature';

UPDATE odd_one_out_questions SET
  normal_prompt = 'Name a hobby you can do alone',
  imposter_prompt = 'Name a hobby you need others for'
WHERE category = 'activities';

UPDATE odd_one_out_questions SET
  normal_prompt = 'Name something that makes noise',
  imposter_prompt = 'Name something that is silent'
WHERE category = 'animals';

UPDATE odd_one_out_questions SET
  normal_prompt = 'Name something expensive',
  imposter_prompt = 'Name something cheap'
WHERE category = 'materials';

-- Add new better questions
INSERT INTO odd_one_out_questions (normal_prompt, imposter_prompt, category) VALUES
('Name something you find in a pharmacy', 'Name something you find in a library', 'locations'),
('Name something you do before bed', 'Name something you do after waking up', 'routines'),
('Name something round', 'Name something square', 'shapes'),
('Name something that requires electricity', 'Name something that works without electricity', 'technology'),
('Name a reason to visit a doctor', 'Name a reason to visit a dentist', 'health'),
('Name something you wear in summer', 'Name something you wear in winter', 'seasonal'),
('Name something you find in a wallet', 'Name something you find in a purse', 'personal_items'),
('Name something that grows', 'Name something that shrinks', 'science'),
('Name something sticky', 'Name something slippery', 'textures'),
('Name something you do with your hands', 'Name something you do with your feet', 'body_parts');