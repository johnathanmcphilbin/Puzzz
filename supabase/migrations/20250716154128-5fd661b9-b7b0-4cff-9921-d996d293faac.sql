-- Disable all existing room cleanup cron jobs
SELECT cron.unschedule('cleanup-stale-rooms');
SELECT cron.unschedule('room-cleanup-job');
SELECT cron.unschedule('secure-room-cleanup');

-- List remaining cron jobs to verify cleanup
SELECT * FROM cron.job;