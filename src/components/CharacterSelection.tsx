import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { getCatImageUrl } from '@/assets/catImages';
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
const CharacterCard = React.memo(
  ({
    character,
    isSelected,
    onClick,
  }: {
    character: CatCharacter;
    isSelected: boolean;
    onClick: () => void;
  }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const imageUrl = useMemo(
      () => getCatImageUrl(character.icon_url),
      [character.icon_url]
    );

    return (
      <div
        className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-lg ${
          isSelected
            ? 'border-primary bg-primary/5'
            : 'border-gray-200 hover:border-primary/50'
        }`}
        onClick={onClick}
      >
        <div className="text-center">
          <div className="relative mx-auto mb-3 h-20 w-20">
            {!imageLoaded && !imageError && (
              <Skeleton className="h-20 w-20 rounded-full" />
            )}
            {character.icon_url && !imageError ? (
              <img
                src={imageUrl}
                alt={character.name}
                className={`h-20 w-20 rounded-full bg-white object-contain p-1 transition-opacity duration-200 ${
                  imageLoaded ? 'opacity-100' : 'absolute opacity-0'
                }`}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                onError={e => {
                  console.error(
                    'Failed to load cat image:',
                    imageUrl,
                    'for character:',
                    character.name
                  );
                  setImageError(true);
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-200">
                🐱
              </div>
            )}
          </div>
          <h3 className="text-lg font-bold">{character.name}</h3>
        </div>
      </div>
    );
  }
);

CharacterCard.displayName = 'CharacterCard';

export const CharacterSelection: React.FC<CharacterSelectionProps> = ({
  isOpen,
  onClose,
  playerId,
  roomCode,
  players,
  currentPlayer,
  onUpdateRoom,
  room,
}) => {
  const [characters, setCharacters] = useState<CatCharacter[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(
    null
  );
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

      const charactersData =
        data?.map(char => ({
          id: char.id,
          name: char.name,
          icon_url: char.icon_url,
        })) || [];

      setCharacters(charactersData);
      cachedCharacters = charactersData; // Cache for next time
    } catch (error) {
      console.error('Error loading characters:', error);
      toast({
        title: 'Error',
        description: 'Failed to load characters',
        variant: 'destructive',
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
          ? {
              ...player,
              selectedCharacterId: selectedCharacter,
              selected_character_id: selectedCharacter,
            }
          : player
      );

      // Immediately update local state for instant UI feedback
      const updatedRoom = {
        ...room,
        players: updatedPlayers,
      };
      onUpdateRoom(updatedRoom);

      // Save to Redis in the background
      const response = await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'update',
          roomCode: roomCode,
          updates: { players: updatedPlayers },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update character selection');
      }

      toast({
        title: 'Character Selected!',
        description: 'Your cat character is now displayed',
        className: 'bg-success text-success-foreground',
      });

      onClose();
    } catch (error) {
      console.error('Error selecting character:', error);
      toast({
        title: 'Error',
        description: 'Failed to select character',
        variant: 'destructive',
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
      <DialogContent className="flex max-h-[90vh] w-full max-w-md flex-col p-4 sm:max-w-lg sm:p-6 md:max-w-2xl lg:max-w-4xl">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-center text-xl font-bold sm:text-2xl">
            Choose Your Cat Character
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[50vh] min-h-0 flex-1 overflow-y-auto sm:max-h-[60vh]">
          {initialLoading ? (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-lg border-2 border-gray-200 p-3"
                  >
                    <div className="text-center">
                      <Skeleton className="mx-auto mb-2 h-16 w-16 rounded-full" />
                      <Skeleton className="mx-auto h-3 w-12" />
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
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      {displayedCharacters.map(character => (
                        <div
                          key={character.id}
                          className={`cursor-pointer rounded-lg border-2 p-3 transition-all duration-200 hover:shadow-lg ${
                            selectedCharacter === character.id
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedCharacter(character.id)}
                        >
                          <div className="text-center">
                            <div className="relative mx-auto mb-2 h-16 w-16">
                              <img
                                src={getCatImageUrl(character.icon_url)}
                                alt={character.name}
                                className="h-16 w-16 rounded-full bg-white object-contain p-1"
                                loading="lazy"
                                onError={e => {
                                  e.currentTarget.style.display = 'none';
                                  const nextElement = e.currentTarget
                                    .nextElementSibling as HTMLElement;
                                  if (nextElement) {
                                    nextElement.style.display = 'flex';
                                  }
                                }}
                              />
                              <div className="flex hidden h-16 w-16 items-center justify-center rounded-full bg-gray-200">
                                🐱
                              </div>
                            </div>
                            <h3 className="text-sm font-semibold">
                              {character.name}
                            </h3>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Load More button */}
              {!showingMore && remainingCharacters.length > 0 && (
                <div className="px-4 pb-4 text-center">
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
                <div className="py-8 text-center text-gray-500">
                  No characters available yet. Check back soon!
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-6 flex flex-shrink-0 justify-center gap-4 border-t p-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelectCharacter}
            disabled={!selectedCharacter || loading}
          >
            {loading ? 'Saving...' : 'Confirm'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
