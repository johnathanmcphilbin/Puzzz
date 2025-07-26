// Import all cat images as ES6 modules
import angryCat from './cats/angry-cat.png';
import auraCat from './cats/aura-cat.png';
import drumCat from './cats/drum-cat.png';
import glassCat from './cats/glass-cat.png';
import happyCat from './cats/happy-cat.png';
import lilCat from './cats/lil-cat.png';
import orangeCat from './cats/orange-cat.png';
import pirateCat from './cats/pirate-cat.png';
import balletCat from './cats/ballet-cat.jpg';
import chillCat from './cats/chill-cat.jpg';
import dinoCat from './cats/dino-cat.jpg';
import flowerCat from './cats/flower-cat.jpg';
import frenchCat from './cats/french-cat.jpg';
import jumperCat from './cats/jumper-cat.jpg';
import kingCat from './cats/king-cat.jpg';
import milkCat from './cats/milk-cat.jpg';
import scienceCat from './cats/science-cat.jpg';
import sickCat from './cats/sick-cat.jpg';
import sillyCat from './cats/silly-cat.jpg';
import tomatoCat from './cats/tomato-cat.jpg';
import tuffCat from './cats/tuff-cat.jpg';

// Map database paths to imported images
const catImageMap: Record<string, string> = {
  '/cats/Angry cat.png': angryCat,
  '/cats/auracat.png': auraCat,
  '/cats/Drum cat.png': drumCat,
  '/cats/Glass cat.png': glassCat,
  '/cats/Happy cat.png': happyCat,
  '/cats/Lil Cat.png': lilCat,
  '/cats/Orange cat.png': orangeCat,
  '/cats/Pirate cat.png': pirateCat,
  '/cats/Ballet cat.jpg': balletCat,
  '/cats/Chill cat.jpg': chillCat,
  '/cats/Dino cat.jpg': dinoCat,
  '/cats/Flower cat.jpg': flowerCat,
  '/cats/French cat.jpg': frenchCat,
  '/cats/Jumper cat.jpg': jumperCat,
  '/cats/King cat.jpg': kingCat,
  '/cats/Milk cat.jpg': milkCat,
  '/cats/Science cat.jpg': scienceCat,
  '/cats/Sick cat.jpg': sickCat,
  '/cats/Silly cat.jpg': sillyCat,
  '/cats/Tomato cat.jpg': tomatoCat,
  '/cats/Tuff cat.jpg': tuffCat,
};

export const getCatImageUrl = (iconUrl: string | null): string => {
  if (!iconUrl) return '/placeholder.svg';
  
  // Use mapped image if available, otherwise return original path
  const mappedImage = catImageMap[iconUrl];
  if (mappedImage) {
    console.log(`Using mapped image for ${iconUrl}:`, mappedImage);
    return mappedImage;
  }
  
  console.log(`No mapping found for ${iconUrl}, using original path`);
  return iconUrl;
};