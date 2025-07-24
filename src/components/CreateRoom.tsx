import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, Crown, Users } from "lucide-react";

interface CreateRoomProps {
  selectedGame: string;
  onClose?: () => void;
}

export const CreateRoom = ({ selectedGame, onClose }: CreateRoomProps) => {
  
  const [playerName, setPlayerName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateRoomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter your name",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const roomCode = generateRoomCode();
      const hostId = crypto.randomUUID();

      console.log("Creating room with code:", roomCode);
      console.log("Host ID:", hostId);

      // Create room
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .insert({
          room_code: roomCode,
          name: `${playerName.trim()}'s Room`,
          host_id: hostId,
          current_game: selectedGame,
          game_state: {
            phase: "lobby",
            votes: {},
            currentQuestion: null
          },
          is_active: true
        })
        .select()
        .single();

      if (roomError) {
        console.error("Room creation error:", roomError);
        throw roomError;
      }

      console.log("Room created successfully:", roomData);

      // Add host as player
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .insert({
          room_id: roomData.id,
          player_id: hostId,
          player_name: playerName.trim(),
          is_host: true
        })
        .select()
        .single();

      if (playerError) {
        console.error("Player creation error:", playerError);
        throw playerError;
      }

      console.log("Player created successfully:", playerData);

      // Store player info in localStorage
      localStorage.setItem("puzzz_player_id", hostId);
      localStorage.setItem("puzzz_player_name", playerName.trim());

      toast({
        title: "Room Created!",
        description: `Room ${roomCode} has been created successfully`,
        className: "bg-success text-success-foreground",
      });

      // Wait a moment to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate to room
      navigate(`/room/${roomCode}`);
      onClose?.();

    } catch (error: any) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create room",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getGameTitle = (gameType: string) => {
    switch (gameType) {
      case "would_you_rather":
        return "Would You Rather";
      case "paranoia":
        return "Paranoia";
      default:
        return gameType;
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Crown className="h-5 w-5 text-warning" />
          <CardTitle>Create Room</CardTitle>
        </div>
        <CardDescription>
          Set up a new game room for your friends
        </CardDescription>
        <div className="flex items-center justify-center gap-2 mt-3">
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {getGameTitle(selectedGame)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={createRoom} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="playerName">Your Name</Label>
            <Input
              id="playerName"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              disabled={isCreating}
              autoComplete="given-name"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Room...
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4" />
                Create Room
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};