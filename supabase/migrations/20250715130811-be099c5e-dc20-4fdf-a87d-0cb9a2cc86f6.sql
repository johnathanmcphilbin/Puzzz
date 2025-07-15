-- Create analytics tables for visit tracking and user sessions

-- Analytics events table to track all user interactions
CREATE TABLE public.analytics_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  page_path text,
  user_id text,
  session_id text NOT NULL,
  room_code text,
  game_type text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Analytics sessions table to track user sessions
CREATE TABLE public.analytics_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL UNIQUE,
  user_agent text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  page_views integer DEFAULT 1,
  last_activity timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for analytics (allow all operations for now, can be restricted later)
CREATE POLICY "Allow all operations on analytics events" 
ON public.analytics_events 
FOR ALL 
USING (true);

CREATE POLICY "Allow all operations on analytics sessions" 
ON public.analytics_sessions 
FOR ALL 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_analytics_events_event_type ON public.analytics_events(event_type);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX idx_analytics_events_room_code ON public.analytics_events(room_code);
CREATE INDEX idx_analytics_sessions_session_id ON public.analytics_sessions(session_id);
CREATE INDEX idx_analytics_sessions_started_at ON public.analytics_sessions(started_at);

-- Enable realtime for live analytics
ALTER TABLE public.analytics_events REPLICA IDENTITY FULL;
ALTER TABLE public.analytics_sessions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.analytics_sessions;