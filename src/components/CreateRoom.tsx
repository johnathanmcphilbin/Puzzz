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
      // Generate room code
      const roomCode = generateRoomCode();
      const hostId = crypto.randomUUID();
      
      console.log("Creating room with code:", roomCode);
      console.log("Host ID:", hostId);
      
      // Use database function to create room and player atomically
      const { data: result, error: rpcError } = await supabase
        .rpc('create_room_with_host', {
          room_code_param: roomCode,
          room_name_param: `${trimmedName}'s Room`,
          host_id_param: hostId,
          host_name_param: trimmedName,
          current_game_param: selectedGame,
          game_state_param: { phase: "lobby", currentQuestion: null, votes: {}, hostOnScreen }
        });

      if (rpcError) {
        console.error("RPC error:", rpcError);
        throw new Error(`Failed to create room: ${rpcError.message}`);
      }

      console.log("Room and player created successfully:", result);
      
      const roomData = (result as any)?.room_data;
      const playerData = (result as any)?.player_data;

      if (!roomData || !playerData) {
        throw new Error("Failed to get room or player data");
      }

      // Store session data
      localStorage.setItem("puzzz_player_id", hostId);
      localStorage.setItem("puzzz_player_name", trimmedName);
      localStorage.setItem("puzzz_room_code", roomCode);

      // Track room creation
      trackEvent("room_created", { roomCode, hostName: trimmedName });

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