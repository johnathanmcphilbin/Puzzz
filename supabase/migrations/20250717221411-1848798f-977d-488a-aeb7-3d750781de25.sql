-- Add back the AI chat customizations table
CREATE TABLE public.ai_chat_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  customization_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security on the table
ALTER TABLE public.ai_chat_customizations ENABLE ROW LEVEL SECURITY;

-- Create policy for the AI chat customizations
CREATE POLICY "Allow all operations on ai_chat_customizations" 
ON public.ai_chat_customizations FOR ALL 
USING (true) 
WITH CHECK (true);