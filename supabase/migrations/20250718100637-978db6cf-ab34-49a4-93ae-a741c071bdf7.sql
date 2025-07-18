-- Create table for room-specific AI generated questions
CREATE TABLE public.room_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id TEXT NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('would_you_rather', 'paranoia')),
  question_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_questions ENABLE ROW LEVEL SECURITY;

-- Create policy for all operations
CREATE POLICY "Allow all operations on room_questions" 
ON public.room_questions 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create index for better performance
CREATE INDEX idx_room_questions_room_game ON public.room_questions(room_id, game_type);