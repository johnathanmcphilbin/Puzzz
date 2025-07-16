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
    normalized = normalized.replace(new RegExp(sub, 'g'), original);
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

export const validateRoomCode = (code: string): boolean => {
  return /^[A-Z0-9]{6}$/.test(code);
};

export const validatePlayerName = (name: string): boolean => {
  const trimmed = name.trim();
  return (
    trimmed.length >= 1 && 
    trimmed.length <= 50 && 
    !/[<>"`';&]/.test(trimmed) &&
    !containsBannedWord(trimmed)
  );
};

export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>"`';&]/g, '')
    .trim()
    .slice(0, 1000);
};

export const sanitizeMessage = (message: string): string => {
  return message
    .replace(/[<>"`';&]/g, '')
    .trim()
    .slice(0, 1000);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const sanitizeCustomization = (customization: string): string => {
  return customization
    .replace(/[<>"`';&]/g, '')
    .trim()
    .slice(0, 500);
};