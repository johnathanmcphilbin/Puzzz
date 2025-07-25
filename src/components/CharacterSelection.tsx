import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        .select('id, name, icon_url')
        .not('icon_url', 'is', null);

      if (error) throw error;
      
      setCharacters(data || []);
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
      console.log('Updating player character:', { playerId, roomId, selectedCharacter });
      
      const { error } = await supabase
        .from('players')
        .update({ selected_character_id: selectedCharacter })
        .eq('player_id', playerId)
        .eq('room_id', roomId);

      if (error) {
        console.error('Database update error:', error);
        throw error;
      }

      console.log('Character selection successful, calling callback');
      
      // Call the callback immediately with the selected character ID
      onCharacterSelected(selectedCharacter);
      
      toast({
        title: "Character Selected!",
        description: "Your character has been chosen",
      });
      
      // Close dialog after a short delay
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('Error selecting character:', error);
      toast({
        title: "Error",
        description: "Failed to select character. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">Choose Your Cat Character</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
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
              <div className="text-center">
                {character.icon_url ? (
                  <img
                    src={getCatImageUrl(character.icon_url)}
                    alt={character.name}
                    className="w-20 h-20 mx-auto rounded-full object-contain bg-white p-1 mb-3"
                    loading="eager"
                  />
                ) : (
                  <div className="w-20 h-20 mx-auto rounded-full bg-gray-200 flex items-center justify-center mb-3">
                    🐱
                  </div>
                )}
                <h3 className="font-bold text-lg">{character.name}</h3>
              </div>
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