-- Create table for odd one out questions
CREATE TABLE public.odd_one_out_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  normal_prompt TEXT NOT NULL,
  imposter_prompt TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.odd_one_out_questions ENABLE ROW LEVEL SECURITY;

-- Create policy for reading questions
CREATE POLICY "Allow all users to read odd one out questions" 
ON public.odd_one_out_questions 
FOR SELECT 
USING (true);

-- Insert some sample questions
INSERT INTO public.odd_one_out_questions (normal_prompt, imposter_prompt, category) VALUES
('Name something you might find in a kitchen', 'Name something you might find in a bathroom', 'household'),
('Name a type of fruit', 'Name a type of vegetable', 'food'),
('Name something you wear on your feet', 'Name something you wear on your hands', 'clothing'),
('Name a tool you use for cooking', 'Name a tool you use for gardening', 'tools'),
('Name something that flies in the sky', 'Name something that swims in the ocean', 'nature'),
('Name a school subject', 'Name a type of sport', 'education'),
('Name something hot', 'Name something cold', 'temperature'),
('Name something you do at the beach', 'Name something you do in the mountains', 'activities'),
('Name an animal that lives on land', 'Name an animal that lives in water', 'animals'),
('Name something made of metal', 'Name something made of wood', 'materials');