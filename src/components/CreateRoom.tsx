import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus } from "lucide-react";
import { useAnalyticsContext } from "@/providers/AnalyticsProvider";
import { useAuth } from "@/hooks/useAuth";
import { validatePlayerName, sanitizeInput, validateRoomCode } from "@/utils/inputValidation";

export const CreateRoom = () => {
  const [hostName, setHostName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
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
    const sanitizedName = sanitizeInput(hostName);
    
    if (!validatePlayerName(sanitizedName)) {
      toast({
        title: "Invalid Name",
        description: "Please enter a valid name (1-50 characters, no special characters or inappropriate content).",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      let roomCode;
      let attempts = 0;
      const maxAttempts = 10;

      // Generate unique room code with retry logic
      do {
        roomCode = generateRoomCode();
        attempts++;
        
        if (!validateRoomCode(roomCode)) {
          continue;
        }

        // Check if room code already exists
        const { data: existing } = await supabase
          .from("rooms")
          .select("room_code")
          .eq("room_code", roomCode)
          .eq("is_active", true)
          .single();

        if (!existing) break;
      } while (attempts < maxAttempts);

      if (attempts >= maxAttempts) {
        throw new Error("Unable to generate unique room code");
      }

      const hostId = crypto.randomUUID();
      await createSession(hostId, sanitizedName);

      // Small delay to ensure localStorage is set before navigation
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create room
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .insert({
          room_code: roomCode,
          name: `${sanitizedName}'s Room`,
          host_id: hostId,
          current_game: "would_you_rather",
          game_state: { phase: "lobby", currentQuestion: null, votes: {} }
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add host as player
      const { error: playerError } = await supabase
        .from("players")
        .insert({
          room_id: roomData.id,
          player_name: sanitizedName,
          player_id: hostId,
          is_host: true
        });

      if (playerError) throw playerError;

      // Verify player was inserted successfully before proceeding
      const { data: playerVerification } = await supabase
        .from("players")
        .select("id")
        .eq("room_id", roomData.id)
        .eq("player_id", hostId)
        .single();

      if (!playerVerification) {
        throw new Error("Failed to verify player creation");
      }

      // Track room creation
      await trackEvent("room_created", { roomCode, hostName: sanitizedName });

      toast({
        title: "Room Created!",
        description: `Room created with code ${roomCode}`,
        className: "bg-success text-success-foreground",
      });

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
          />
        </div>

        <Button 
          onClick={createRoom} 
          disabled={isCreating}
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