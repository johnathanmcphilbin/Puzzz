// Static list of available cats from public/cats folder
// All cat images should be placed in public/cats/ for consistent deployment
export const STATIC_CATS = [
  { id: 'auracat', name: 'Aura Cat', icon_url: 'auracat.png' },
  { id: 'tomato-cat', name: 'Tomato Cat', icon_url: 'tomato-cat.jpg' },
  { id: 'tuff-cat', name: 'Tuff Cat', icon_url: 'tuff-cat.jpg' },
  { id: 'sick-cat', name: 'Sick Cat', icon_url: 'sick-cat.jpg' },
  { id: 'silly-cat', name: 'Silly Cat', icon_url: 'silly-cat.jpg' },
  { id: 'robo-arm-cat', name: 'Robo Arm Cat', icon_url: 'robo-arm-cat.png' },
  { id: 'science-cat', name: 'Science Cat', icon_url: 'science-cat.jpg' },
  { id: 'pirate-cat', name: 'Pirate Cat', icon_url: 'pirate-cat.png' },
  { id: 'milk-cat', name: 'Milk Cat', icon_url: 'milk-cat.jpg' },
  { id: 'orange-cat', name: 'Orange Cat', icon_url: 'orange-cat.png' },
  { id: 'lil-cat', name: 'Lil Cat', icon_url: 'lil-cat.png' },
  { id: 'jumper-cat', name: 'Jumper Cat', icon_url: 'jumper-cat.jpg' },
  { id: 'king-cat', name: 'King Cat', icon_url: 'king-cat.jpg' },
  { id: 'glass-cat', name: 'Glass Cat', icon_url: 'glass-cat.png' },
  { id: 'happy-cat', name: 'Happy Cat', icon_url: 'happy-cat.png' },
  { id: 'flower-cat', name: 'Flower Cat', icon_url: 'flower-cat.jpg' },
  { id: 'french-cat', name: 'French Cat', icon_url: 'french-cat.jpg' },
  { id: 'dino-cat', name: 'Dino Cat', icon_url: 'dino-cat.jpg' },
  { id: 'drum-cat', name: 'Drum Cat', icon_url: 'drum-cat.png' },
  { id: 'chill-cat', name: 'Chill Cat', icon_url: 'chill-cat.jpg' },
  { id: 'angry-cat', name: 'Angry Cat', icon_url: 'angry-cat.png' },
  { id: 'ballet-cat', name: 'Ballet Cat', icon_url: 'ballet-cat.jpg' },
];

/**
 * Gets the proper URL for a cat image
 * Supports:
 * - User uploads (URLs starting with /lovable-uploads/)
 * - Public cat images (filenames that get prefixed with /cats/)
 * - Full URLs (returned as-is)
 * - Paths already starting with / (returned as-is)
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
  return `/cats/${iconUrl}`;
};
