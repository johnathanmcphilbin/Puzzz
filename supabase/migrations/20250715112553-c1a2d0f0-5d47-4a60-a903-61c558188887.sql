-- Clear all existing rooms and related data in correct order
DELETE FROM paranoia_rounds;
DELETE FROM forms_responses;
DELETE FROM game_votes;
DELETE FROM game_requests;
DELETE FROM players;
DELETE FROM rooms;