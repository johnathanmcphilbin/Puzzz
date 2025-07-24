-- First, let's check what the current constraint allows by dropping and recreating it
-- Drop the existing constraint
ALTER TABLE room_questions DROP CONSTRAINT IF EXISTS room_questions_game_type_check;

-- Create a new constraint that allows all our game types
ALTER TABLE room_questions 
ADD CONSTRAINT room_questions_game_type_check 
CHECK (game_type IN ('would_you_rather', 'paranoia', 'odd_one_out', 'odd-one-out', 'forms'));

-- Update any existing records that might have the old format
UPDATE room_questions 
SET game_type = 'odd_one_out' 
WHERE game_type = 'odd-one-out';