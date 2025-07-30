-- Re-populate cat_characters table with all the cats
INSERT INTO cat_characters (name, icon_url, description, stats) VALUES
('Angry Cat', '/cats/angry-cat.png', 'A fierce feline with a permanent scowl', '{"speed": 2, "stealth": 4, "charisma": 1, "strength": 5, "intelligence": 3}'),
('Aura Cat', '/cats/auracat.png', 'A mystical cat with a powerful aura', '{"speed": 3, "stealth": 5, "charisma": 5, "strength": 3, "intelligence": 4}'),
('Ballet Cat', '/cats/ballet-cat.jpg', 'Graceful dancer on four paws', '{"speed": 4, "stealth": 3, "charisma": 5, "strength": 2, "intelligence": 3}'),
('Chill Cat', '/cats/chill-cat.jpg', 'The most relaxed cat in the world', '{"speed": 1, "stealth": 2, "charisma": 4, "strength": 2, "intelligence": 3}'),
('Dino Cat', '/cats/dino-cat.jpg', 'A prehistoric feline adventure', '{"speed": 3, "stealth": 2, "charisma": 3, "strength": 5, "intelligence": 3}'),
('Drum Cat', '/cats/drum-cat.png', 'Beats to the rhythm of life', '{"speed": 3, "stealth": 1, "charisma": 4, "strength": 3, "intelligence": 2}'),
('Flower Cat', '/cats/flower-cat.jpg', 'Blooming with beauty and grace', '{"speed": 2, "stealth": 3, "charisma": 5, "strength": 1, "intelligence": 4}'),
('French Cat', '/cats/french-cat.jpg', 'Sophisticated Parisian feline', '{"speed": 3, "stealth": 3, "charisma": 5, "strength": 2, "intelligence": 4}'),
('Glass Cat', '/cats/glass-cat.png', 'Transparent and mysterious', '{"speed": 2, "stealth": 5, "charisma": 3, "strength": 1, "intelligence": 5}'),
('Happy Cat', '/cats/happy-cat.png', 'Always smiling and cheerful', '{"speed": 3, "stealth": 2, "charisma": 5, "strength": 3, "intelligence": 3}'),
('Jumper Cat', '/cats/jumper-cat.jpg', 'Athletic and always on the move', '{"speed": 5, "stealth": 3, "charisma": 3, "strength": 4, "intelligence": 2}'),
('King Cat', '/cats/king-cat.jpg', 'Royal ruler of all felines', '{"speed": 3, "stealth": 3, "charisma": 5, "strength": 4, "intelligence": 5}'),
('Lil Cat', '/cats/lil-cat.png', 'Small but mighty companion', '{"speed": 4, "stealth": 4, "charisma": 4, "strength": 1, "intelligence": 3}'),
('Milk Cat', '/cats/milk-cat.jpg', 'Loves dairy and cozy naps', '{"speed": 2, "stealth": 2, "charisma": 3, "strength": 2, "intelligence": 2}'),
('Orange Cat', '/cats/orange-cat.png', 'Bright and energetic tabby', '{"speed": 3, "stealth": 2, "charisma": 4, "strength": 3, "intelligence": 2}'),
('Pirate Cat', '/cats/pirate-cat.png', 'Adventurous seafaring feline', '{"speed": 3, "stealth": 4, "charisma": 4, "strength": 4, "intelligence": 3}'),
('Robo Arm Cat', '/cats/robo-arm-cat.png', 'Cybernetic enhanced super cat', '{"speed": 4, "stealth": 2, "charisma": 3, "strength": 5, "intelligence": 5}'),
('Science Cat', '/cats/science-cat.jpg', 'Genius researcher and inventor', '{"speed": 2, "stealth": 3, "charisma": 2, "strength": 2, "intelligence": 5}'),
('Sick Cat', '/cats/sick-cat.jpg', 'Needs care and attention', '{"speed": 1, "stealth": 2, "charisma": 2, "strength": 1, "intelligence": 3}'),
('Silly Cat', '/cats/silly-cat.jpg', 'Always making everyone laugh', '{"speed": 3, "stealth": 1, "charisma": 5, "strength": 2, "intelligence": 1}'),
('Tomato Cat', '/cats/tomato-cat.jpg', 'Fresh from the garden', '{"speed": 2, "stealth": 3, "charisma": 3, "strength": 2, "intelligence": 2}'),
('Tuff Cat', '/cats/tuff-cat.jpg', 'Tough and ready for anything', '{"speed": 3, "stealth": 3, "charisma": 2, "strength": 5, "intelligence": 3}');

-- Create audit log table for tracking cat_characters operations
CREATE TABLE IF NOT EXISTS cat_characters_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    operation_type text NOT NULL, -- INSERT, UPDATE, DELETE
    cat_id uuid,
    cat_name text,
    operation_timestamp timestamp with time zone DEFAULT now(),
    user_context text,
    details jsonb
);

-- Enable RLS on audit log
ALTER TABLE cat_characters_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow all operations on audit log for monitoring
CREATE POLICY "Allow all operations on cat_characters_audit_log" ON cat_characters_audit_log
FOR ALL USING (true) WITH CHECK (true);

-- Create trigger function to log all operations on cat_characters
CREATE OR REPLACE FUNCTION log_cat_characters_operations()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO cat_characters_audit_log (operation_type, cat_id, cat_name, details)
        VALUES ('DELETE', OLD.id, OLD.name, row_to_json(OLD));
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO cat_characters_audit_log (operation_type, cat_id, cat_name, details)
        VALUES ('UPDATE', NEW.id, NEW.name, jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO cat_characters_audit_log (operation_type, cat_id, cat_name, details)
        VALUES ('INSERT', NEW.id, NEW.name, row_to_json(NEW));
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to log all operations
CREATE TRIGGER cat_characters_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE ON cat_characters
    FOR EACH ROW EXECUTE FUNCTION log_cat_characters_operations();