-- Enable pg_cron and pg_net extensions for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule room cleanup to run every 5 minutes
SELECT cron.schedule(
  'cleanup-stale-rooms',
  '*/5 * * * *', -- every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://heqqjpxlithgoswwyjoi.supabase.co/functions/v1/cleanup-rooms',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcXFqcHhsaXRoZ29zd3d5am9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0ODYzOTEsImV4cCI6MjA2ODA2MjM5MX0.93khyYHQ_XrTH5S-qyK5UA6mT94CEYz7quEhn9kx1X0"}'::jsonb
    ) as request_id;
  $$
);