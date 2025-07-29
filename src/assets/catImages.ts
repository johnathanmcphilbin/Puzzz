// Static list of available cats from public/cats folder
// All cat images should be placed in public/cats/ for consistent deployment
export const STATIC_CATS = [
  { id: 'auracat', name: 'Aura Cat', icon_url: 'auracat.png' },
  { id: 'tomato-cat', name: 'Tomato Cat', icon_url: 'Tomato cat.jpg' },
  { id: 'tuff-cat', name: 'Tuff Cat', icon_url: 'Tuff cat.jpg' },
  { id: 'sick-cat', name: 'Sick Cat', icon_url: 'Sick cat.jpg' },
  { id: 'silly-cat', name: 'Silly Cat', icon_url: 'Silly cat.jpg' },
  { id: 'robo-arm-cat', name: 'Robo Arm Cat', icon_url: 'Robo arm cat.png' },
  { id: 'science-cat', name: 'Science Cat', icon_url: 'Science cat.jpg' },
  { id: 'pirate-cat', name: 'Pirate Cat', icon_url: 'Pirate cat.png' },
  { id: 'milk-cat', name: 'Milk Cat', icon_url: 'Milk cat.jpg' },
  { id: 'orange-cat', name: 'Orange Cat', icon_url: 'Orange cat.png' },
  { id: 'lil-cat', name: 'Lil Cat', icon_url: 'Lil Cat.png' },
  { id: 'jumper-cat', name: 'Jumper Cat', icon_url: 'Jumper cat.jpg' },
  { id: 'king-cat', name: 'King Cat', icon_url: 'King cat.jpg' },
  { id: 'glass-cat', name: 'Glass Cat', icon_url: 'Glass cat.png' },
  { id: 'happy-cat', name: 'Happy Cat', icon_url: 'Happy cat.png' },
  { id: 'flower-cat', name: 'Flower Cat', icon_url: 'Flower cat.jpg' },
  { id: 'french-cat', name: 'French Cat', icon_url: 'French cat.jpg' },
  { id: 'dino-cat', name: 'Dino Cat', icon_url: 'Dino cat.jpg' },
  { id: 'drum-cat', name: 'Drum Cat', icon_url: 'Drum cat.png' },
  { id: 'chill-cat', name: 'Chill Cat', icon_url: 'Chill cat.jpg' },
  { id: 'angry-cat', name: 'Angry Cat', icon_url: 'Angry cat.png' },
  { id: 'ballet-cat', name: 'Ballet Cat', icon_url: 'Ballet cat.jpg' },
];

/**
 * Gets the proper URL for a cat image
 * Supports:
 * - User uploads (URLs starting with /lovable-uploads/)
 * - Public cat images (filenames that get prefixed with /cats/)
 * - Full URLs (returned as-is)
 * - Paths already starting with / (returned as-is)
 * 
 * Properly URL-encodes filenames to handle spaces and special characters
 */
export const getCatImageUrl = (iconUrl: string | null): string => {
  if (!iconUrl) return '/placeholder.svg';
  
  // If it's already a full URL, return as is
  if (iconUrl.startsWith('http')) {
    return iconUrl;
  }
  
  // If it starts with /, it's already a public path (including /lovable-uploads/)
  if (iconUrl.startsWith('/')) {
    return iconUrl;
  }
  
  // Otherwise, assume it's a filename in the public/cats folder
  // URL-encode the filename to handle spaces and special characters
  const encodedFilename = encodeURIComponent(iconUrl);
  return `/cats/${encodedFilename}`;
};