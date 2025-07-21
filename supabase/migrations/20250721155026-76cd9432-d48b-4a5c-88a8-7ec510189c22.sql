-- Update the first cat character to be Aura Cat with the new image
UPDATE public.cat_characters 
SET 
  name = 'Aura Cat',
  icon_url = '/lovable-uploads/8fbc970b-99c5-4e01-9a08-fe62c4e10df5.png',
  description = 'A mysterious cat with powerful aura'
WHERE name = 'Frost';