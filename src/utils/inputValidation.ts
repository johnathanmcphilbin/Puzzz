// Input validation utilities to prevent XSS and injection attacks

export const validateRoomCode = (code: string): boolean => {
  return /^[A-Z0-9]{6}$/.test(code);
};

export const validatePlayerName = (name: string): boolean => {
  const trimmed = name.trim();
  return (
    trimmed.length >= 1 && 
    trimmed.length <= 50 && 
    !/[<>"`';&]/.test(trimmed)
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