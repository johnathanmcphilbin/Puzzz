import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CatAvatarSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  roomId: string;
  onCharacterSelected: (characterId: string) => void;
}

// All available cat images from public/cats folder
const CAT_IMAGES = [
  { filename: "Angry cat.png", name: "Angry Cat" },
  { filename: "Ballet cat.jpg", name: "Ballet Cat" },
  { filename: "Chill cat.jpg", name: "Chill Cat" },
  { filename: "Dino cat.jpg", name: "Dino Cat" },
  { filename: "Drum cat.png", name: "Drum Cat" },
  { filename: "Flower cat.jpg", name: "Flower Cat" },
  { filename: "French cat.jpg", name: "French Cat" },
  { filename: "Glass cat.png", name: "Glass Cat" },
  { filename: "Happy cat.png", name: "Happy Cat" },
  { filename: "Jumper cat.jpg", name: "Jumper Cat" },
  { filename: "King cat.jpg", name: "King Cat" },
  { filename: "Lil Cat.png", name: "Lil Cat" },
  { filename: "Milk cat.jpg", name: "Milk Cat" },
  { filename: "Orange cat.png", name: "Orange Cat" },
  { filename: "Pirate cat.png", name: "Pirate Cat" },
  { filename: "Robo arm cat.png", name: "Robo Arm Cat" },
  { filename: "Science cat.jpg", name: "Science Cat" },
  { filename: "Sick cat.jpg", name: "Sick Cat" },
  { filename: "Silly cat.jpg", name: "Silly Cat" },
  { filename: "Tomato cat.jpg", name: "Tomato Cat" },
  { filename: "Tuff cat.jpg", name: "Tuff Cat" },
  { filename: "auracat.png", name: "Aura Cat" },
];

const CharacterCard = React.memo(({ 
  cat, 
  isSelected, 
  onClick 
}: { 
  cat: typeof CAT_IMAGES[0]; 
  isSelected: boolean; 
  onClick: () => void;
}) => {
  const imageUrl = `/cats/${encodeURIComponent(cat.filename)}`;

  return (
    <div
      className={`border-2 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      }`}
      onClick={onClick}
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-2">
          <img
            src={imageUrl}
            alt={cat.name}
            className="w-16 h-16 rounded-full object-cover bg-background"
            loading="eager"
            onError={(e) => {
              // Hide image if it fails to load
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        <h3 className="font-semibold text-sm">{cat.name}</h3>
      </div>
    </div>
  );
});

CharacterCard.displayName = 'CharacterCard';

export const CatAvatarSelection: React.FC<CatAvatarSelectionProps> = ({
  isOpen,
  onClose,
  playerId,
  roomId,
  onCharacterSelected
}) => {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showingMore, setShowingMore] = useState(false);
  const { toast } = useToast();

  const initialCats = CAT_IMAGES.slice(0, 9);
  const remainingCats = CAT_IMAGES.slice(9);
  const displayedCats = showingMore ? CAT_IMAGES : initialCats;

  const handleSelectCat = async () => {
    if (!selectedCat) return;

    setLoading(true);
    try {
      // Find the selected cat
      const cat = CAT_IMAGES.find(c => c.filename === selectedCat);
      if (!cat) throw new Error('Cat not found');

      // First, try to find existing character in database
      let { data: existingChar, error: findError } = await supabase
        .from('cat_characters')
        .select('id')
        .eq('name', cat.name)
        .single();

      let characterId: string;

      if (findError && findError.code === 'PGRST116') {
        // Character doesn't exist, create it
        const { data: newChar, error: createError } = await supabase
          .from('cat_characters')
          .insert({
            name: cat.name,
            icon_url: `/cats/${encodeURIComponent(cat.filename)}`,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        characterId = newChar.id;
      } else if (findError) {
        throw findError;
      } else {
        characterId = existingChar.id;
      }

      // Update player's selected character
      const { error: updateError } = await supabase
        .from('players')
        .update({ selected_character_id: characterId })
        .eq('player_id', playerId)
        .eq('room_id', roomId);

      if (updateError) throw updateError;

      onCharacterSelected(characterId);
      
      toast({
        title: "Cat Selected!",
        description: `You chose ${cat.name}`,
      });
      
      onClose();
      
    } catch (error) {
      console.error('Error selecting cat:', error);
      toast({
        title: "Error",
        description: "Failed to select cat avatar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl font-bold text-center">Choose Your Cat Character</DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0">
          <div className="px-4 pb-4">
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {displayedCats.map((cat) => (
                  <CharacterCard
                    key={cat.filename}
                    cat={cat}
                    isSelected={selectedCat === cat.filename}
                    onClick={() => setSelectedCat(cat.filename)}
                  />
                ))}
              </div>
            </div>
            
            {!showingMore && remainingCats.length > 0 && (
              <div className="text-center pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowingMore(true)}
                  className="w-full"
                >
                  Load More Cats ({remainingCats.length} more)
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-center gap-4 mt-6 p-4 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelectCat}
            disabled={!selectedCat || loading}
          >
            {loading ? "Confirming..." : "Confirm Selection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};