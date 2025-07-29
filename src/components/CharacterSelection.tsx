import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { getCatImageUrl } from "@/assets/catImages";
import { FUNCTIONS_BASE_URL, SUPABASE_ANON_KEY } from '@/utils/functions';
import { supabase } from '@/integrations/supabase/client';

interface CatCharacter {
  id: string;
  name: string;
  icon_url: string | null;
}

interface CharacterSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  roomCode: string;
  players: any[];
  currentPlayer: any;
  onUpdateRoom: (updatedRoom: any) => void;
  room: any;
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
              onError={(e) => {
                console.error('Failed to load cat image:', imageUrl, 'for character:', character.name);
                setImageError(true);
                e.currentTarget.style.display = 'none';
              }}
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
  roomCode,
  players,
  currentPlayer,
  onUpdateRoom,
  room
}) => {
  const [characters, setCharacters] = useState<CatCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [showingMore, setShowingMore] = useState(false);
  const { toast } = useToast();

  const loadCharacters = useCallback(async () => {
    // Return cached characters if available
    if (cachedCharacters) {
      setCharacters(cachedCharacters);
      return;
    }

    setInitialLoading(true);
    try {
      // Load characters from database
      const { data, error } = await supabase
        .from('cat_characters')
        .select('id, name, icon_url')
        .order('name');
      
      if (error) {
        console.error('Error loading characters:', error);
        throw error;
      }

      const charactersData = data?.map(char => ({
        id: char.id,
        name: char.name,
        icon_url: char.icon_url
      })) || [];
      
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
      // Update player's character in room data (similar to RoomLobby logic)
      const updatedPlayers = players.map(player => 
        player.player_id === currentPlayer.player_id 
          ? { ...player, selectedCharacterId: selectedCharacter, selected_character_id: selectedCharacter }
          : player
      );

      // Immediately update local state for instant UI feedback
      const updatedRoom = {
        ...room,
        players: updatedPlayers
      };
      onUpdateRoom(updatedRoom);

      // Save to Redis in the background
      const response = await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'apikey': SUPABASE_ANON_KEY, 
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}` 
        },
        body: JSON.stringify({ 
          action: 'update', 
          roomCode: roomCode, 
          updates: { players: updatedPlayers } 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update character selection');
      }
      
      toast({
        title: "Character Selected!",
        description: "Your cat character is now displayed",
        className: "bg-success text-success-foreground",
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
      <DialogContent className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl sm:text-2xl font-bold text-center">Choose Your Cat Character</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0 max-h-[50vh] sm:max-h-[60vh]">
          {initialLoading ? (
            <div className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="border-2 rounded-lg p-3 border-gray-200">
                    <div className="text-center">
                      <Skeleton className="w-16 h-16 mx-auto rounded-full mb-2" />
                      <Skeleton className="h-3 w-12 mx-auto" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Character grid */}
              {displayedCharacters.length > 0 && (
                <div className="p-4">
                  <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {displayedCharacters.map((character) => (
                        <div
                          key={character.id}
                          className={`border-2 rounded-lg p-3 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                            selectedCharacter === character.id
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedCharacter(character.id)}
                        >
                          <div className="text-center">
                            <div className="relative w-16 h-16 mx-auto mb-2">
                              <img
                                src={getCatImageUrl(character.icon_url)}
                                alt={character.name}
                                className="w-16 h-16 rounded-full object-contain bg-white p-1"
                                loading="lazy"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                  if (nextElement) {
                                    nextElement.style.display = 'flex';
                                  }
                                }}
                              />
                              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center hidden">
                                🐱
                              </div>
                            </div>
                            <h3 className="font-semibold text-sm">{character.name}</h3>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Load More button */}
              {!showingMore && remainingCharacters.length > 0 && (
                <div className="text-center px-4 pb-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowingMore(true)}
                    className="w-full"
                  >
                    Load More Cats ({remainingCharacters.length} more)
                  </Button>
                </div>
              )}

              {characters.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No characters available yet. Check back soon!
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex justify-center gap-4 mt-6 p-4 flex-shrink-0 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelectCharacter}
            disabled={!selectedCharacter || loading}
          >
            {loading ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};