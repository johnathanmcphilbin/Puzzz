-- Add selected_character_id to players table
ALTER TABLE public.players 
ADD COLUMN selected_character_id UUID REFERENCES public.cat_characters(id);

-- Update the first cat character (Frost) with the uploaded image
UPDATE public.cat_characters 
SET icon_url = '/lovable-uploads/993dcbf1-e20b-436a-b752-be1950462802.png'
WHERE name = 'Frost';