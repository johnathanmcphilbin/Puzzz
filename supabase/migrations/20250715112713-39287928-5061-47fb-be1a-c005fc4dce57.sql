-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove any existing cleanup jobs
SELECT cron.unschedule('room-cleanup-job');

-- Create a cron job to run cleanup every 15 minutes
SELECT cron.schedule(
  'room-cleanup-job',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
        url:='https://heqqjpxlithgoswwyjoi.supabase.co/functions/v1/cleanup-rooms',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcXFqcHhsaXRoZ29zd3d5am9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0ODYzOTEsImV4cCI6MjA2ODA2MjM5MX0.93khyYHQ_XrTH5S-qyK5UA6mT94CEYz7quEhn9kx1X0"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);