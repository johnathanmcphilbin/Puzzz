import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getCatImageUrl } from "@/assets/catImages";

interface CatCharacter {
  id: string;
  name: string;
  icon_url: string | null;
}

interface CharacterSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  roomId: string;
  onCharacterSelected: (characterId: string) => void;
}

// Cache characters data globally to avoid reloading
let cachedCharacters: CatCharacter[] | null = null;

// Memoized character card component for better performance
const CharacterCard = React.memo(({ 
  character, 
  isSelected, 
  onClick 
}: { 
  character: CatCharacter; 
  isSelected: boolean; 
  onClick: () => void;
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const imageUrl = useMemo(() => getCatImageUrl(character.icon_url), [character.icon_url]);

  return (
    <div
      className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-gray-200 hover:border-primary/50'
      }`}
      onClick={onClick}
    >
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-3">
          {!imageLoaded && !imageError && (
            <Skeleton className="w-20 h-20 rounded-full" />
          )}
          {character.icon_url && !imageError ? (
            <img
              src={imageUrl}
              alt={character.name}
              className={`w-20 h-20 rounded-full object-contain bg-white p-1 transition-opacity duration-200 ${
                imageLoaded ? 'opacity-100' : 'opacity-0 absolute'
              }`}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center">
              🐱
            </div>
          )}
        </div>
        <h3 className="font-bold text-lg">{character.name}</h3>
      </div>
    </div>
  );
});

CharacterCard.displayName = 'CharacterCard';

export const CharacterSelection: React.FC<CharacterSelectionProps> = ({
  isOpen,
  onClose,
  playerId,
  roomId,
  onCharacterSelected
}) => {
  const [characters, setCharacters] = useState<CatCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [showingMore, setShowingMore] = useState(false);
  const { toast } = useToast();

  const loadCharacters = useCallback(async () => {
    // Use cached data if available
    if (cachedCharacters) {
      setCharacters(cachedCharacters);
      return;
    }

    setInitialLoading(true);
    try {
      const { data, error } = await supabase
        .from('cat_characters')
        .select('id, name, icon_url')
        .not('icon_url', 'is', null);

      if (error) throw error;
      
      const charactersData = data || [];
      setCharacters(charactersData);
      cachedCharacters = charactersData; // Cache for next time
    } catch (error) {
      console.error('Error loading characters:', error);
      toast({
        title: "Error",
        description: "Failed to load characters",
        variant: "destructive",
      });
    } finally {
      setInitialLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      loadCharacters();
    }
  }, [isOpen, loadCharacters]);

  const handleSelectCharacter = async () => {
    if (!selectedCharacter) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('players')
        .update({ selected_character_id: selectedCharacter })
        .eq('player_id', playerId)
        .eq('room_id', roomId);

      if (error) throw error;

      // Call the callback immediately
      onCharacterSelected(selectedCharacter);
      
      toast({
        title: "Character Selected!",
        description: "Your character has been chosen",
      });
      
      onClose();
      
    } catch (error) {
      console.error('Error selecting character:', error);
      toast({
        title: "Error",
        description: "Failed to select character",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initialCharacters = characters.slice(0, 10);
  const remainingCharacters = characters.slice(10);
  const displayedCharacters = showingMore ? characters : initialCharacters;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl font-bold text-center">Choose Your Cat Character</DialogTitle>
        </DialogHeader>
        
        {initialLoading ? (
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="border-2 rounded-lg p-4 border-gray-200">
                  <div className="text-center">
                    <Skeleton className="w-20 h-20 mx-auto rounded-full mb-3" />
                    <Skeleton className="h-4 w-16 mx-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Character grid with scroll area */}
            {displayedCharacters.length > 0 && (
              <ScrollArea className="flex-1 min-h-0 max-h-[400px]">
                <div className="px-4 pb-4">
                  <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {displayedCharacters.map((character) => (
                        <CharacterCard
                          key={character.id}
                          character={character}
                          isSelected={selectedCharacter === character.id}
                          onClick={() => setSelectedCharacter(character.id)}
                        />
                      ))}
                    </div>
                  </div>
                  
                  {/* Load More button inside scroll area */}
                  {!showingMore && remainingCharacters.length > 0 && (
                    <div className="text-center pt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowingMore(true)}
                        className="w-full"
                      >
                        Load More Cats ({remainingCharacters.length} more)
                      </Button>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}

            {characters.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No characters available yet. Check back soon!
              </div>
            )}
          </>
        )}

        <div className="flex justify-center gap-4 mt-6 p-4 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelectCharacter}
            disabled={!selectedCharacter || loading}
          >
            {loading ? "Confirming..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};