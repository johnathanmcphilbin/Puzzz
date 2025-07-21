-- Remove stats and perks from Aura Cat, keep only name and image
UPDATE public.cat_characters 
SET 
  stats = null,
  perks = null,
  description = null
WHERE name = 'Aura Cat';