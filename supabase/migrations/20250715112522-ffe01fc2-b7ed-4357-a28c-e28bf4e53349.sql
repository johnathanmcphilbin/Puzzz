-- Clear all existing rooms and related data
DELETE FROM paranoia_rounds;
DELETE FROM forms_responses;
DELETE FROM game_votes;
DELETE FROM game_requests;
DELETE FROM players;
DELETE FROM rooms;

-- Reset any sequences if needed and optimize the tables
VACUUM FULL rooms;
VACUUM FULL players;
VACUUM FULL game_requests;
VACUUM FULL game_votes;
VACUUM FULL forms_responses;
VACUUM FULL paranoia_rounds;