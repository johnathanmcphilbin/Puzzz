// Import cat images as ES6 modules for proper bundling
import angryCat from './cats/angry-cat.png';
import balletCat from './cats/ballet-cat.jpg';
import chillCat from './cats/chill-cat.jpg';
import dinoCat from './cats/dino-cat.jpg';
import drumCat from './cats/drum-cat.png';
import flowerCat from './cats/flower-cat.jpg';
import frenchCat from './cats/french-cat.jpg';
import glassCat from './cats/glass-cat.png';
import happyCat from './cats/happy-cat.png';
import jumperCat from './cats/jumper-cat.jpg';
import kingCat from './cats/king-cat.jpg';
import lilCat from './cats/lil-cat.png';
import milkCat from './cats/milk-cat.jpg';
import orangeCat from './cats/orange-cat.png';
import pirateCat from './cats/pirate-cat.png';
import scienceCat from './cats/science-cat.jpg';
import sickCat from './cats/sick-cat.jpg';
import sillyCat from './cats/silly-cat.jpg';
import tomatoCat from './cats/tomato-cat.jpg';
import tuffCat from './cats/tuff-cat.jpg';
import auraCat from './cats/aura-cat.png';

export const catImageMap: Record<string, string> = {
  '/cats/Angry cat.png': angryCat,
  '/cats/Ballet cat.jpg': balletCat,
  '/cats/Chill cat.jpg': chillCat,
  '/cats/Dino cat.jpg': dinoCat,
  '/cats/Drum cat.png': drumCat,
  '/cats/Flower cat.jpg': flowerCat,
  '/cats/French cat.jpg': frenchCat,
  '/cats/Glass cat.png': glassCat,
  '/cats/Happy cat.png': happyCat,
  '/cats/Jumper cat.jpg': jumperCat,
  '/cats/King cat.jpg': kingCat,
  '/cats/Lil Cat.png': lilCat,
  '/cats/Milk cat.jpg': milkCat,
  '/cats/Orange cat.png': orangeCat,
  '/cats/Pirate cat.png': pirateCat,
  '/cats/Robo arm cat.png': '/cats/Robo arm cat.png', // This one doesn't have a corresponding src/assets file
  '/cats/Science cat.jpg': scienceCat,
  '/cats/Sick cat.jpg': sickCat,
  '/cats/Silly cat.jpg': sillyCat,
  '/cats/Tomato cat.jpg': tomatoCat,
  '/cats/Tuff cat.jpg': tuffCat,
  '/cats/auracat.png': auraCat,
};

// Static list of available cats from public/cats folder
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

export const getCatImageUrl = (iconUrl: string | null): string => {
  if (!iconUrl) return '/placeholder.svg';
  
  // If it's already a full URL, return as is
  if (iconUrl.startsWith('http')) {
    return iconUrl;
  }
  
  // If it starts with /, it's already a public path
  if (iconUrl.startsWith('/')) {
    return iconUrl;
  }
  
  // Otherwise, assume it's a filename in the public/cats folder
  return `/cats/${iconUrl}`;
};