import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";

interface JoinRoomProps {
  onClose?: () => void;
}

export const JoinRoom = ({ onClose }: JoinRoomProps) => {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomCode.trim() || !playerName.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const cleanedRoomCode = roomCode.trim().toUpperCase();
    
    if (cleanedRoomCode.length !== 6) {
      toast({
        title: "Invalid Room Code",
        description: "Room code must be 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);
    
    try {
      console.log("Attempting to join room:", cleanedRoomCode);

      // Check if room exists and is active
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", cleanedRoomCode)
        .eq("is_active", true)
        .maybeSingle();

      if (roomError) {
        console.error("Room lookup error:", roomError);
        throw new Error("Failed to find room");
      }

      if (!roomData) {
        toast({
          title: "Room Not Found",
          description: "The room code you entered doesn't exist or has been closed",
          variant: "destructive",
        });
        return;
      }

      console.log("Room found:", roomData);

      // Check if player name is already taken in this room
      const { data: existingPlayers } = await supabase
        .from("players")
        .select("player_name")
        .eq("room_id", roomData.id);

      const playerNames = existingPlayers?.map(p => p.player_name.toLowerCase()) || [];
      if (playerNames.includes(playerName.trim().toLowerCase())) {
        toast({
          title: "Name Taken",
          description: "This name is already taken in this room. Please choose a different name.",
          variant: "destructive",
        });
        return;
      }

      // Generate player ID and add to room
      const playerId = crypto.randomUUID();

      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .insert({
          room_id: roomData.id,
          player_id: playerId,
          player_name: playerName.trim(),
          is_host: false
        })
        .select()
        .single();

      if (playerError) {
        console.error("Player join error:", playerError);
        throw new Error("Failed to join room");
      }

      console.log("Player joined successfully:", playerData);

      // Store player info in localStorage
      localStorage.setItem("puzzz_player_id", playerId);
      localStorage.setItem("puzzz_player_name", playerName.trim());

      toast({
        title: "Joined Room!",
        description: `Successfully joined ${roomData.name}`,
        className: "bg-success text-success-foreground",
      });

      // Navigate to room
      navigate(`/room/${cleanedRoomCode}`);
      onClose?.();

    } catch (error: any) {
      console.error("Error joining room:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to join room",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <CardTitle>Join Room</CardTitle>
        </div>
        <CardDescription>
          Enter a room code to join an existing game
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={joinRoom} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomCode">Room Code</Label>
            <Input
              id="roomCode"
              type="text"
              placeholder="Enter 6-character room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              disabled={isJoining}
              className="text-center text-lg font-mono tracking-wider"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="playerName">Your Name</Label>
            <Input
              id="playerName"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
              disabled={isJoining}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isJoining}
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining Room...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Join Room
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};