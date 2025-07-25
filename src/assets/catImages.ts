// Import cat images as ES6 modules for proper bundling
import angryCat from './cats/angry-cat.png';
import drumCat from './cats/drum-cat.png';
import glassCat from './cats/glass-cat.png';
import happyCat from './cats/happy-cat.png';
import lilCat from './cats/lil-cat.png';
import orangeCat from './cats/orange-cat.png';
import pirateCat from './cats/pirate-cat.png';
import auraCat from './cats/aura-cat.png';

export const catImageMap: Record<string, string> = {
  '/cats/Angry cat.png': angryCat,
  '/cats/Drum cat.png': drumCat,
  '/cats/Glass cat.png': glassCat,
  '/cats/Happy cat.png': happyCat,
  '/cats/Lil Cat.png': lilCat,
  '/cats/Orange cat.png': orangeCat,
  '/cats/Pirate cat.png': pirateCat,
  '/cats/auracat.png': auraCat,
  '/cats/Ballet cat.jpg': '/cats/Ballet cat.jpg',
  '/cats/Chill cat.jpg': '/cats/Chill cat.jpg',
  '/cats/Dino cat.jpg': '/cats/Dino cat.jpg',
  '/cats/Flower cat.jpg': '/cats/Flower cat.jpg',
  '/cats/French cat.jpg': '/cats/French cat.jpg',
  '/cats/Jumper cat.jpg': '/cats/Jumper cat.jpg',
  '/cats/King cat.jpg': '/cats/King cat.jpg',
  '/cats/Milk cat.jpg': '/cats/Milk cat.jpg',
  '/cats/Science cat.jpg': '/cats/Science cat.jpg',
  '/cats/Sick cat.jpg': '/cats/Sick cat.jpg',
  '/cats/Silly cat.jpg': '/cats/Silly cat.jpg',
  '/cats/Tomato cat.jpg': '/cats/Tomato cat.jpg',
  '/cats/Tuff cat.jpg': '/cats/Tuff cat.jpg',
};

export const getCatImageUrl = (iconUrl: string | null): string => {
  if (!iconUrl) return '/placeholder.svg';
  return catImageMap[iconUrl] || '/placeholder.svg';
};