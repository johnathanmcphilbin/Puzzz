-- Insert cat characters with correct dash-separated filenames
-- This ensures all cat images work properly in production

INSERT INTO cat_characters (name, icon_url, description, stats) VALUES
('Aura Cat', '/cats/auracat.png', 'A mystical cat with ethereal powers', '{"speed": 3, "stealth": 3, "charisma": 3, "strength": 2, "intelligence": 3}'),
('Angry Cat', '/cats/angry-cat.png', 'A fierce and intimidating feline with a short temper', '{"speed": 2, "stealth": 1, "charisma": 1, "strength": 4, "intelligence": 2}'),
('Ballet Cat', '/cats/ballet-cat.jpg', 'Graceful and elegant dancer', '{"speed": 3, "stealth": 2, "charisma": 3, "strength": 1, "intelligence": 2}'),
('Chill Cat', '/cats/chill-cat.jpg', 'Laid back and relaxed', '{"speed": 1, "stealth": 3, "charisma": 2, "strength": 1, "intelligence": 3}'),
('Dino Cat', '/cats/dino-cat.jpg', 'Prehistoric feline friend', '{"speed": 2, "stealth": 1, "charisma": 2, "strength": 3, "intelligence": 2}'),
('Drum Cat', '/cats/drum-cat.png', 'Musical rhythm master', '{"speed": 2, "stealth": 1, "charisma": 3, "strength": 2, "intelligence": 2}'),
('Flower Cat', '/cats/flower-cat.jpg', 'Nature loving gentle soul', '{"speed": 1, "stealth": 2, "charisma": 3, "strength": 1, "intelligence": 3}'),
('French Cat', '/cats/french-cat.jpg', 'Sophisticated and cultured', '{"speed": 2, "stealth": 2, "charisma": 3, "strength": 1, "intelligence": 3}'),
('Glass Cat', '/cats/glass-cat.png', 'Transparent and mysterious', '{"speed": 3, "stealth": 3, "charisma": 1, "strength": 1, "intelligence": 2}'),
('Happy Cat', '/cats/happy-cat.png', 'Always cheerful and optimistic', '{"speed": 2, "stealth": 1, "charisma": 3, "strength": 2, "intelligence": 2}'),
('Jumper Cat', '/cats/jumper-cat.jpg', 'Athletic and energetic', '{"speed": 3, "stealth": 2, "charisma": 2, "strength": 2, "intelligence": 1}'),
('King Cat', '/cats/king-cat.jpg', 'Royal and commanding', '{"speed": 1, "stealth": 1, "charisma": 3, "strength": 2, "intelligence": 3}'),
('Lil Cat', '/cats/lil-cat.png', 'Small but mighty', '{"speed": 3, "stealth": 3, "charisma": 2, "strength": 1, "intelligence": 1}'),
('Milk Cat', '/cats/milk-cat.jpg', 'Pure and innocent', '{"speed": 1, "stealth": 2, "charisma": 3, "strength": 1, "intelligence": 3}'),
('Orange Cat', '/cats/orange-cat.png', 'A laid-back orange tabby with one brain cell', '{"speed": 1, "stealth": 1, "charisma": 3, "strength": 2, "intelligence": 1}'),
('Pirate Cat', '/cats/pirate-cat.png', 'A swashbuckling feline adventurer', '{"speed": 3, "stealth": 3, "charisma": 3, "strength": 3, "intelligence": 2}'),
('Robo Arm Cat', '/cats/robo-arm-cat.png', 'Cybernetic enhanced feline', '{"speed": 2, "stealth": 2, "charisma": 1, "strength": 4, "intelligence": 3}'),
('Science Cat', '/cats/science-cat.jpg', 'Intellectual researcher and experimenter', '{"speed": 1, "stealth": 2, "charisma": 2, "strength": 1, "intelligence": 4}'),
('Sick Cat', '/cats/sick-cat.jpg', 'Not feeling well but still brave', '{"speed": 1, "stealth": 2, "charisma": 2, "strength": 1, "intelligence": 2}'),
('Silly Cat', '/cats/silly-cat.jpg', 'Playful and goofy personality', '{"speed": 2, "stealth": 1, "charisma": 3, "strength": 2, "intelligence": 1}'),
('Tomato Cat', '/cats/tomato-cat.jpg', 'Garden-loving vegetable enthusiast', '{"speed": 2, "stealth": 2, "charisma": 2, "strength": 2, "intelligence": 2}'),
('Tuff Cat', '/cats/tuff-cat.jpg', 'Rugged and resilient fighter', '{"speed": 2, "stealth": 2, "charisma": 2, "strength": 3, "intelligence": 2}')

ON CONFLICT (name) DO UPDATE SET 
  icon_url = EXCLUDED.icon_url,
  description = EXCLUDED.description,
  stats = EXCLUDED.stats; 