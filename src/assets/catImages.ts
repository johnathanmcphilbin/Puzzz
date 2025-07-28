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

export const getCatImageUrl = (iconUrl: string | null): string => {
  if (!iconUrl) return '/placeholder.svg';
  return catImageMap[iconUrl] || '/placeholder.svg';
};