import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CharacterSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacter: (catName: string) => void;
  currentCharacter?: string;
}

// List of all cat images in public/cats/
const ALL_CAT_IMAGES = [
  "Angry cat.png",
  "Ballet cat.jpg", 
  "Chill cat.jpg",
  "Dino cat.jpg",
  "Drum cat.png",
  "Flower cat.jpg",
  "French cat.jpg",
  "Glass cat.png",
  "Happy cat.png",
  "Jumper cat.jpg",
  "King cat.jpg",
  "Lil Cat.png",
  "Milk cat.jpg",
  "Orange cat.png",
  "Pirate cat.png",
  "Robo arm cat.png",
  "Science cat.jpg",
  "Sick cat.jpg",
  "Silly cat.jpg",
  "Tomato cat.jpg",
  "Tuff cat.jpg",
  "auracat.png"
];

const INITIAL_LOAD_COUNT = 9;
const LOAD_MORE_COUNT = 6;

export const CharacterSelection = ({ 
  isOpen, 
  onClose, 
  onSelectCharacter, 
  currentCharacter 
}: CharacterSelectionProps) => {
  const [selectedCat, setSelectedCat] = useState<string>(currentCharacter || "");
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD_COUNT);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const handleImageLoad = (catName: string) => {
    setLoadedImages(prev => new Set([...prev, catName]));
  };

  const handleImageError = (catName: string) => {
    // Remove from loaded images if it fails to load
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(catName);
      return newSet;
    });
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => Math.min(prev + LOAD_MORE_COUNT, ALL_CAT_IMAGES.length));
  };

  const handleConfirm = () => {
    if (selectedCat) {
      onSelectCharacter(selectedCat);
      onClose();
    }
  };

  const visibleCats = ALL_CAT_IMAGES.slice(0, visibleCount);
  const displayedCats = visibleCats.filter(cat => loadedImages.has(cat));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-center text-2xl font-bold">
            Choose Your Cat Character
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 h-[70vh]">
          <div className="p-4">
            {/* Hidden images for preloading */}
            {visibleCats.map((catName) => (
              <img
                key={catName}
                src={`/cats/${catName}`}
                alt=""
                className="hidden"
                onLoad={() => handleImageLoad(catName)}
                onError={() => handleImageError(catName)}
              />
            ))}
            
            {/* Display grid of loaded cats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {displayedCats.map((catName) => (
                <div
                  key={catName}
                  className={`relative aspect-square cursor-pointer rounded-lg border-2 transition-all hover:scale-105 ${
                    selectedCat === catName 
                      ? "border-primary ring-2 ring-primary/20" 
                      : "border-muted hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedCat(catName)}
                >
                  <img
                    src={`/cats/${catName}`}
                    alt={catName.replace(/\.[^/.]+$/, "")}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-xs p-1 rounded text-center truncate">
                    {catName.replace(/\.[^/.]+$/, "")}
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {visibleCount < ALL_CAT_IMAGES.length && (
              <div className="text-center">
                <Button 
                  variant="outline" 
                  onClick={handleLoadMore}
                  className="mb-4"
                >
                  Load More Cats
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Fixed footer with action buttons */}
        <div className="flex-shrink-0 flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedCat}
            className="flex-1"
          >
            Confirm Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};