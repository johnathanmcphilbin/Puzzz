-- Remove all room-related database tables and functions
-- We're fully switching to Redis for room storage

-- Drop all room-related functions first
DROP FUNCTION IF EXISTS public.create_room_with_host(TEXT, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.join_room_as_player(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.validate_room_code(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.validate_player_name(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.is_player_in_room(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_room_host(UUID) CASCADE;

-- Drop all room-related tables in reverse dependency order to avoid foreign key constraints
DROP TABLE IF EXISTS public.ai_chat_customizations CASCADE;
DROP TABLE IF EXISTS public.room_questions CASCADE;
DROP TABLE IF EXISTS public.forms_responses CASCADE;
DROP TABLE IF EXISTS public.paranoia_rounds CASCADE;
DROP TABLE IF EXISTS public.game_votes CASCADE;
DROP TABLE IF EXISTS public.game_requests CASCADE;
DROP TABLE IF EXISTS public.players CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;

-- Note: We're keeping question tables as they're still used for game content:
-- - would_you_rather_questions
-- - paranoia_questions  
-- - forms_questions
-- - odd_one_out_questions
-- - cat_characters

-- Remove any room-related policies that might still exist
-- (These should be cleaned up automatically with table drops, but just in case)

-- All room data is now stored in Redis with automatic expiration
-- Room structure in Redis:
-- Key: room:{roomCode}
-- Value: JSON object with room data, players, and game state
-- TTL: 8 hours (28800 seconds)
