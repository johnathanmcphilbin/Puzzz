-- Fix function search path security issues by recreating functions with secure search_path

-- Drop existing functions
DROP FUNCTION IF EXISTS public.validate_room_code(text);
DROP FUNCTION IF EXISTS public.validate_player_name(text);
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Recreate validate_room_code function with secure search_path
CREATE OR REPLACE FUNCTION public.validate_room_code(code text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN code ~ '^[A-Z0-9]{6}$';
END;
$$;

-- Recreate validate_player_name function with secure search_path
CREATE OR REPLACE FUNCTION public.validate_player_name(name text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN length(trim(name)) BETWEEN 1 AND 50 AND name !~ '[<>"\'';&]';
END;
$$;

-- Recreate update_updated_at_column function with secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Move pg_net extension from public to extensions schema
DROP EXTENSION IF EXISTS pg_net;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;