-- First, clear any existing test data to avoid duplicates
DELETE FROM public.cat_characters WHERE name IN (
  'Angry Cat', 'Ballet Cat', 'Chill Cat', 'Dino Cat', 'Drum Cat',
  'Flower Cat', 'French Cat', 'Glass Cat', 'Happy Cat', 'Jumper Cat',
  'King Cat', 'Lil Cat', 'Milk Cat', 'Orange Cat', 'Pirate Cat',
  'Robo Arm Cat', 'Science Cat', 'Sick Cat', 'Silly Cat', 'Tomato Cat',
  'Tuff Cat', 'Aura Cat'
);

-- Insert all cat characters from public/cats folder into cat_characters table
INSERT INTO public.cat_characters (name, icon_url, description) VALUES
('Angry Cat', '/cats/Angry cat.png', 'A fierce and determined feline warrior'),
('Ballet Cat', '/cats/Ballet cat.jpg', 'Graceful and elegant, dances through life'),
('Chill Cat', '/cats/Chill cat.jpg', 'Laid back and relaxed, goes with the flow'),
('Dino Cat', '/cats/Dino cat.jpg', 'Prehistoric predator with modern charm'),
('Drum Cat', '/cats/Drum cat.png', 'Keeps the beat and rocks the house'),
('Flower Cat', '/cats/Flower cat.jpg', 'Blooms with beauty and natural grace'),
('French Cat', '/cats/French cat.jpg', 'Sophisticated and cultured, très chic'),
('Glass Cat', '/cats/Glass cat.png', 'Crystal clear and brilliantly transparent'),
('Happy Cat', '/cats/Happy cat.png', 'Always smiling and spreading joy'),
('Jumper Cat', '/cats/Jumper cat.jpg', 'Athletic and energetic, loves to leap'),
('King Cat', '/cats/King cat.jpg', 'Royal and majestic, rules with wisdom'),
('Lil Cat', '/cats/Lil Cat.png', 'Small but mighty, cuteness overload'),
('Milk Cat', '/cats/Milk cat.jpg', 'Pure and wholesome, loves dairy delights'),
('Orange Cat', '/cats/Orange cat.png', 'Vibrant and warm, full of personality'),
('Pirate Cat', '/cats/Pirate cat.png', 'Adventurous sailor of the seven seas'),
('Robo Arm Cat', '/cats/Robo arm cat.png', 'Cybernetic enhancement meets feline grace'),
('Science Cat', '/cats/Science cat.jpg', 'Brilliant researcher and lab experimenter'),
('Sick Cat', '/cats/Sick cat.jpg', 'Under the weather but still adorable'),
('Silly Cat', '/cats/Silly cat.jpg', 'Goofy and playful, always up for fun'),
('Tomato Cat', '/cats/Tomato cat.jpg', 'Fresh and juicy, garden variety charm'),
('Tuff Cat', '/cats/Tuff cat.jpg', 'Rough and tough, street-smart survivor'),
('Aura Cat', '/cats/auracat.png', 'Mystical and ethereal, radiates energy');