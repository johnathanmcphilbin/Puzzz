-- Recreate all room-related database tables and functions
-- This allows keeping both Redis and database implementations

-- Create rooms table
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    host_id UUID NOT NULL,
    current_game TEXT,
    game_state JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create players table
CREATE TABLE IF NOT EXISTS public.players (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    player_id UUID NOT NULL,
    player_name TEXT NOT NULL,
    is_host BOOLEAN DEFAULT false,
    selected_character_id UUID,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, player_id),
    UNIQUE(room_id, player_name)
);

-- Create game_votes table
CREATE TABLE IF NOT EXISTS public.game_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    player_id UUID NOT NULL,
    question_id TEXT NOT NULL,
    vote TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, player_id, question_id)
);

-- Create forms_responses table
CREATE TABLE IF NOT EXISTS public.forms_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    player_id UUID NOT NULL,
    selected_player_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, question_id, player_id)
);

-- Create ai_chat_customizations table
CREATE TABLE IF NOT EXISTS public.ai_chat_customizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id TEXT NOT NULL,
    customization_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create room_questions table
CREATE TABLE IF NOT EXISTS public.room_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id TEXT NOT NULL,
    game_type TEXT NOT NULL,
    question_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create paranoia_rounds table
CREATE TABLE IF NOT EXISTS public.paranoia_rounds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    asker_player_id UUID NOT NULL,
    target_player_id UUID NOT NULL,
    question TEXT NOT NULL,
    answer TEXT,
    is_revealed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create game_requests table
CREATE TABLE IF NOT EXISTS public.game_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    player_id UUID NOT NULL,
    requested_game TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(room_id, player_id, requested_game)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_room_code ON public.rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON public.rooms(host_id);
CREATE INDEX IF NOT EXISTS idx_players_room_id ON public.players(room_id);
CREATE INDEX IF NOT EXISTS idx_players_player_id ON public.players(player_id);
CREATE INDEX IF NOT EXISTS idx_game_votes_room_id ON public.game_votes(room_id);
CREATE INDEX IF NOT EXISTS idx_forms_responses_room_id ON public.forms_responses(room_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_customizations_room_id ON public.ai_chat_customizations(room_id);
CREATE INDEX IF NOT EXISTS idx_room_questions_room_id ON public.room_questions(room_id);
CREATE INDEX IF NOT EXISTS idx_paranoia_rounds_room_id ON public.paranoia_rounds(room_id);
CREATE INDEX IF NOT EXISTS idx_game_requests_room_id ON public.game_requests(room_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for rooms table
DROP TRIGGER IF EXISTS update_rooms_updated_at ON public.rooms;
CREATE TRIGGER update_rooms_updated_at
    BEFORE UPDATE ON public.rooms
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Recreate utility functions
CREATE OR REPLACE FUNCTION public.validate_room_code(room_code TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN room_code ~ '^[A-Z0-9]{6}$';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.validate_player_name(player_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN LENGTH(TRIM(player_name)) >= 1 AND LENGTH(TRIM(player_name)) <= 50;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_player_in_room(player_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.players 
        WHERE player_id = player_uuid
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.is_room_host(player_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.players 
        WHERE player_id = player_uuid AND is_host = true
    );
END;
$$ LANGUAGE plpgsql;

-- Create room with host function
CREATE OR REPLACE FUNCTION public.create_room_with_host(
    room_code TEXT,
    room_name TEXT,
    host_player_id TEXT,
    host_player_name TEXT,
    selected_game TEXT
)
RETURNS TABLE(room_id UUID, player_id UUID) AS $$
DECLARE
    new_room_id UUID;
    new_player_id UUID;
    host_uuid UUID;
BEGIN
    -- Validate inputs
    IF NOT public.validate_room_code(room_code) THEN
        RAISE EXCEPTION 'Invalid room code format';
    END IF;
    
    IF NOT public.validate_player_name(host_player_name) THEN
        RAISE EXCEPTION 'Invalid player name';
    END IF;
    
    -- Convert host_player_id to UUID
    host_uuid := host_player_id::UUID;
    
    -- Create room
    INSERT INTO public.rooms (room_code, name, host_id, current_game)
    VALUES (room_code, room_name, host_uuid, selected_game)
    RETURNING id INTO new_room_id;
    
    -- Add host as player
    INSERT INTO public.players (room_id, player_id, player_name, is_host)
    VALUES (new_room_id, host_uuid, host_player_name, true)
    RETURNING id INTO new_player_id;
    
    RETURN QUERY SELECT new_room_id, new_player_id;
END;
$$ LANGUAGE plpgsql;

-- Join room as player function
CREATE OR REPLACE FUNCTION public.join_room_as_player(
    room_code TEXT,
    player_uuid TEXT,
    player_name TEXT
)
RETURNS TABLE(room_id UUID, player_id UUID) AS $$
DECLARE
    target_room_id UUID;
    new_player_id UUID;
    player_id_uuid UUID;
BEGIN
    -- Validate inputs
    IF NOT public.validate_player_name(player_name) THEN
        RAISE EXCEPTION 'Invalid player name';
    END IF;
    
    -- Convert player_uuid to UUID
    player_id_uuid := player_uuid::UUID;
    
    -- Find room
    SELECT id INTO target_room_id
    FROM public.rooms
    WHERE rooms.room_code = join_room_as_player.room_code 
    AND is_active = true;
    
    IF target_room_id IS NULL THEN
        RAISE EXCEPTION 'Room not found or inactive';
    END IF;
    
    -- Check if player name is already taken in this room
    IF EXISTS (
        SELECT 1 FROM public.players 
        WHERE players.room_id = target_room_id 
        AND players.player_name = join_room_as_player.player_name
    ) THEN
        RAISE EXCEPTION 'Player name already taken in this room';
    END IF;
    
    -- Add player to room
    INSERT INTO public.players (room_id, player_id, player_name, is_host)
    VALUES (target_room_id, player_id_uuid, player_name, false)
    RETURNING id INTO new_player_id;
    
    RETURN QUERY SELECT target_room_id, new_player_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS (Row Level Security) if needed
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_chat_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.paranoia_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_requests ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations for authenticated users" ON public.rooms FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.players FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.game_votes FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.forms_responses FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.ai_chat_customizations FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.room_questions FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.paranoia_rounds FOR ALL USING (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.game_requests FOR ALL USING (true);

-- Note: The application now uses both Redis and Database
-- Redis is used for real-time room state with TTL
-- Database can be used for persistence, analytics, or backup 