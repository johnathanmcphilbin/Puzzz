-- Update Aura Cat to use the correct image path in public folder
UPDATE public.cat_characters 
SET icon_url = '/cats/aura-cat.png'
WHERE name = 'Aura Cat';