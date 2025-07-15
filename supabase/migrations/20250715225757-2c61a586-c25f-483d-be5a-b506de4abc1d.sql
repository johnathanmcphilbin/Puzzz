-- Create a setting for the cleanup secret that can be accessed by the cron job
-- This will be used to validate cron job requests
ALTER SYSTEM SET app.cleanup_secret = 'your-secure-cleanup-secret-here';
SELECT pg_reload_conf();