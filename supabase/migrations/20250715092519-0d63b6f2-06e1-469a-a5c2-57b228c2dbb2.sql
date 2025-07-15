-- Create game_requests table for players to vote on games they want to play
CREATE TABLE public.game_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  player_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, player_id, game_type)
);

-- Enable Row Level Security
ALTER TABLE public.game_requests ENABLE ROW LEVEL SECURITY;

-- Create policy for game requests
CREATE POLICY "Allow all operations on game requests" 
ON public.game_requests 
FOR ALL 
USING (true);

-- Add index for better performance
CREATE INDEX idx_game_requests_room_id ON public.game_requests(room_id);
CREATE INDEX idx_game_requests_game_type ON public.game_requests(room_id, game_type);