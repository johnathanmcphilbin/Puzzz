
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import { useAnalyticsContext } from "@/providers/AnalyticsProvider";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeInput } from "@/utils/inputValidation";

interface CreateRoomProps {
  selectedGame?: string;
}

export const CreateRoom = ({ selectedGame = "would_you_rather" }: CreateRoomProps) => {
  const [hostName, setHostName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [hostOnScreen, setHostOnScreen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { trackEvent } = useAnalyticsContext();
  const { createSession } = useAuth();

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createRoom = async () => {
    const trimmedName = hostName.trim();
    
    if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 30) {
      toast({
        title: "Invalid Name",
        description: "Please enter a name between 1-30 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    
    try {
      // Sanitize the host name
      const sanitizedName = await sanitizeInput(trimmedName);
      
      // Generate room code and host ID
      const roomCode = generateRoomCode();
      const hostId = crypto.randomUUID();
      
      console.log("Creating room with code:", roomCode);
      console.log("Host ID:", hostId);
      
      // Create room first
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .insert({
          room_code: roomCode,
          name: `${sanitizedName}'s Room`,
          host_id: hostId,
          current_game: selectedGame,
          game_state: { phase: "lobby", currentQuestion: null, votes: {}, hostOnScreen },
          is_active: true
        })
        .select()
        .single();

      if (roomError) {
        console.error("Room creation error:", roomError);
        throw new Error("Failed to create room");
      }

      console.log("Room created successfully:", roomData);

      // Create session for the host
      await createSession(hostId, sanitizedName, roomData.id);

      // Add host as player
      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .insert({
          room_id: roomData.id,
          player_name: sanitizedName,
          player_id: hostId,
          is_host: true
        })
        .select()
        .single();

      if (playerError) {
        console.error("Player creation error:", playerError);
        // Clean up room if player creation fails
        await supabase.from("rooms").delete().eq("id", roomData.id);
        throw new Error("Failed to add host to room");
      }

      console.log("Player created successfully:", playerData);

      // Store additional session data
      localStorage.setItem("puzzz_room_code", roomCode);

      // Track room creation
      trackEvent("room_created", { roomCode, hostName: sanitizedName });

      toast({
        title: "Room Created!",
        description: `Room created with code ${roomCode}`,
        className: "bg-success text-success-foreground",
      });

      // Navigate to room
      navigate(`/room/${roomCode}`);
      
    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full max-w-lg shadow-lg">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 p-3 bg-primary/10 rounded-full w-fit">
          <Plus className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Create New Room</CardTitle>
        <CardDescription className="text-base">
          Start a new game session for you and your friends
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="hostName" className="text-base font-medium">
            Your Name
          </Label>
          <Input
            id="hostName"
            placeholder="Enter your name..."
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            className="text-lg py-3"
            maxLength={30}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                createRoom();
              }
            }}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="hostOnScreen" 
            checked={hostOnScreen}
            onCheckedChange={(checked) => setHostOnScreen(checked === true)}
          />
          <Label htmlFor="hostOnScreen" className="text-base font-medium cursor-pointer">
            Host on screen
          </Label>
        </div>

        <Button 
          onClick={createRoom} 
          disabled={isCreating || !hostName.trim()}
          className="w-full text-lg py-6 bg-primary hover:bg-primary-hover shadow-md"
          size="lg"
        >
          {isCreating ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating Room...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-5 w-5" />
              Create Room
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
