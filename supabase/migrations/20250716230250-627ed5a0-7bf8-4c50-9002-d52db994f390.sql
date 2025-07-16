-- Clean up existing AI-generated questions from global tables
DELETE FROM public.would_you_rather_questions WHERE category LIKE 'AI-Generated%';
DELETE FROM public.forms_questions WHERE category LIKE 'AI-Generated%';  
DELETE FROM public.paranoia_questions WHERE category LIKE 'AI-Generated%';