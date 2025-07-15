-- Remove existing cron jobs that use insecure authentication
SELECT cron.unschedule('cleanup-stale-rooms');
SELECT cron.unschedule('room-cleanup-job');

-- Create a new secure cron job that uses a secret in the request body
SELECT cron.schedule(
  'secure-room-cleanup',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://heqqjpxlithgoswwyjoi.supabase.co/functions/v1/cleanup-rooms',
        headers:='{"Content-Type": "application/json"}'::jsonb,
        body:='{"secret": "' || current_setting('app.cleanup_secret', true) || '"}'::jsonb
    ) as request_id;
  $$
);