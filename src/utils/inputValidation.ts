
import { supabase } from "@/integrations/supabase/client";

// Input validation utilities to prevent XSS and injection attacks

// List of banned words and inappropriate content
const BANNED_WORDS = [
  'hitler', 'nazi', 'holocaust', 'genocide', 'fascist', 'racist',
  'nigger', 'nigga', 'faggot', 'retard', 'retarded', 'spic', 'chink',
  'kike', 'wetback', 'towelhead', 'sandnigger', 'terrorist',
  'fuck', 'shit', 'bitch', 'asshole', 'damn', 'cunt', 'whore', 'slut',
  'penis', 'vagina', 'dick', 'cock', 'pussy', 'tits', 'boobs', 'sex',
  'rape', 'rapist', 'pedophile', 'molest', 'abuse', 'violence',
  'suicide', 'kill', 'death', 'murder', 'bomb', 'terrorist', 'attack',
  'drug', 'cocaine', 'heroin', 'meth', 'weed', 'marijuana', 'cannabis',
  'admin', 'moderator', 'owner', 'bot', 'system', 'null', 'undefined'
];

// Common character substitutions used to bypass filters
const CHAR_SUBSTITUTIONS: { [key: string]: string } = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b',
  '@': 'a', '!': 'i', '$': 's', '+': 't', '|': 'l', '*': 'a'
};

const normalizeForFilter = (text: string): string => {
  let normalized = text.toLowerCase();
  
  // Replace common substitutions
  for (const [sub, original] of Object.entries(CHAR_SUBSTITUTIONS)) {
    // Escape special regex characters
    const escapedSub = sub.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(escapedSub, 'g'), original);
  }
  
  // Remove spaces, dots, underscores, and dashes
  normalized = normalized.replace(/[\s._-]/g, '');
  
  return normalized;
};

const containsBannedWord = (text: string): boolean => {
  const normalized = normalizeForFilter(text);
  
  return BANNED_WORDS.some(word => {
    const normalizedWord = normalizeForFilter(word);
    return normalized.includes(normalizedWord);
  });
};

export const validateRoomCode = async (code: string): Promise<boolean> => {
  // Use database validation function
  try {
    const { data, error } = await supabase.rpc('validate_room_code', { code });
    return data && !error;
  } catch (error) {
    console.error('Room code validation error:', error);
    return /^[A-Z0-9]{6}$/.test(code); // Fallback to client validation
  }
};

export const validatePlayerName = async (name: string): Promise<boolean> => {
  // Use database validation function
  try {
    const { data, error } = await supabase.rpc('validate_player_name', { name });
    if (data !== null && !error) {
      return data;
    }
  } catch (error) {
    console.error('Player name validation error:', error);
  }
  
  // Fallback to client validation
  const trimmed = name.trim();
  return (
    trimmed.length >= 1 && 
    trimmed.length <= 50 && 
    !/[<>"`';&]/.test(trimmed) &&
    !containsBannedWord(trimmed)
  );
};

export const sanitizeInput = async (input: string): Promise<string> => {
  // Use database sanitization function when possible
  try {
    const { data, error } = await supabase.rpc('sanitize_input', { input_text: input });
    if (data && !error) {
      return data;
    }
  } catch (error) {
    console.error('Database sanitization error:', error);
  }
  
  // Fallback to client sanitization
  return input
    .replace(/[<>"`';&]/g, '')
    .trim()
    .slice(0, 1000);
};

export const sanitizeMessage = async (message: string): Promise<string> => {
  return sanitizeInput(message);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const sanitizeCustomization = async (customization: string): Promise<string> => {
  const sanitized = await sanitizeInput(customization);
  return sanitized.slice(0, 500);
};

// Enhanced security functions
export const isSecurePassword = (password: string): boolean => {
  return password.length >= 8 && 
         /[A-Z]/.test(password) && 
         /[a-z]/.test(password) && 
         /[0-9]/.test(password);
};

export const validateSessionToken = async (playerId: string, sessionToken: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('validate_session', {
      p_player_id: playerId,
      p_session_token: sessionToken
    });
    return data && !error;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
};
