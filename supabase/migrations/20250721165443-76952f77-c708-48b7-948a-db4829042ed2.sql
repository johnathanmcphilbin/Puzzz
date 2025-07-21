-- Update Aura Cat to use the new auracat.png file
UPDATE public.cat_characters 
SET icon_url = '/cats/auracat.png'
WHERE name = 'Aura Cat';