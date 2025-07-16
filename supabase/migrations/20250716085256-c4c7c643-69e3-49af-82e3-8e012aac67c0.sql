-- Create a table to store AI chat customizations (optional for future enhancement)
CREATE TABLE IF NOT EXISTS public.ai_chat_customizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id VARCHAR(6) REFERENCES public.rooms(room_code),
  customization_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_chat_customizations ENABLE ROW LEVEL SECURITY;

-- Create policies for room-based access
CREATE POLICY "Users can view customizations for their room" 
ON public.ai_chat_customizations 
FOR SELECT 
USING (true); -- Allow reading for anyone in the app

CREATE POLICY "Users can create customizations for their room" 
ON public.ai_chat_customizations 
FOR INSERT 
WITH CHECK (true); -- Allow anyone to create customizations