-- Clean up existing AI-generated questions and their votes from global tables
-- First delete the votes that reference AI-generated questions
DELETE FROM public.game_votes 
WHERE question_id IN (
  SELECT id FROM public.would_you_rather_questions WHERE category LIKE 'AI-Generated%'
);

-- Then delete the AI-generated questions from all tables
DELETE FROM public.would_you_rather_questions WHERE category LIKE 'AI-Generated%';
DELETE FROM public.forms_questions WHERE category LIKE 'AI-Generated%';  
DELETE FROM public.paranoia_questions WHERE category LIKE 'AI-Generated%';