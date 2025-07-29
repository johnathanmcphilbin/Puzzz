-- Remove redundant category column from would_you_rather_questions table
ALTER TABLE public.would_you_rather_questions DROP COLUMN IF EXISTS category;