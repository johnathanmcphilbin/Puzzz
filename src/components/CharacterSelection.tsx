import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CatCharacter {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  stats: {
    speed: number;
    stealth: number;
    charisma: number;
    strength: number;
    intelligence: number;
  };
  perks: string[] | null;
}

interface CharacterSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  roomId: string;
  onCharacterSelected: (characterId: string) => void;
}

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
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadCharacters();
    }
  }, [isOpen]);

  const loadCharacters = async () => {
    try {
      const { data, error } = await supabase
        .from('cat_characters')
        .select('*')
        .not('icon_url', 'is', null);

      if (error) throw error;
      
      const formattedCharacters = data?.map(character => ({
        ...character,
        stats: character.stats as CatCharacter['stats'],
        perks: character.perks as string[] | null
      })) || [];
      
      setCharacters(formattedCharacters);
    } catch (error) {
      console.error('Error loading characters:', error);
      toast({
        title: "Error",
        description: "Failed to load characters",
        variant: "destructive",
      });
    }
  };

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

      onCharacterSelected(selectedCharacter);
      onClose();
      
      toast({
        title: "Character Selected!",
        description: "Your character has been chosen",
      });
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

  const getStatColor = (stat: number) => {
    if (stat >= 4) return 'bg-green-500';
    if (stat >= 3) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Choose Your Cat Character</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {characters.map((character) => (
            <div
              key={character.id}
              className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedCharacter === character.id
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-primary/50'
              }`}
              onClick={() => setSelectedCharacter(character.id)}
            >
              <div className="text-center mb-3">
                {character.icon_url ? (
                  <img
                    src={character.icon_url}
                    alt={character.name}
                    className="w-20 h-20 mx-auto rounded-full object-cover mb-2"
                  />
                ) : (
                  <div className="w-20 h-20 mx-auto rounded-full bg-gray-200 flex items-center justify-center mb-2">
                    🐱
                  </div>
                )}
                <h3 className="font-bold text-lg">{character.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{character.description}</p>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-semibold">Stats:</div>
                {Object.entries(character.stats).map(([statName, value]) => (
                  <div key={statName} className="flex items-center justify-between">
                    <span className="text-xs capitalize">{statName}:</span>
                    <div className="flex space-x-1">
                      {[1, 2, 3, 4, 5].map((dot) => (
                        <div
                          key={dot}
                          className={`w-2 h-2 rounded-full ${
                            dot <= value ? getStatColor(value) : 'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {character.perks && character.perks.length > 0 && (
                <div className="mt-3">
                  <div className="text-sm font-semibold mb-2">Perks:</div>
                  <div className="flex flex-wrap gap-1">
                    {character.perks.map((perk, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {perk}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {characters.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No characters available yet. Check back soon!
          </div>
        )}

        <div className="flex justify-center gap-4 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSelectCharacter}
            disabled={!selectedCharacter || loading}
          >
            {loading ? "Selecting..." : "Choose Character"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};