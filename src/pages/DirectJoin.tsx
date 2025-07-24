import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRoomActions } from "@/hooks/useRoomActions";
import { Loader2, UserPlus } from "lucide-react";

export const DirectJoin = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [playerName, setPlayerName] = useState("");
  const { joinRoom, loading } = useRoomActions();

  const handleJoinRoom = async () => {
    if (!roomCode) return;
    await joinRoom(roomCode, playerName);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-accent/10 rounded-full w-fit">
            <UserPlus className="h-8 w-8 text-accent" />
          </div>
          <CardTitle className="text-2xl">Join Room {roomCode}</CardTitle>
          <CardDescription className="text-base">
            Enter your name to join the game
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="playerName" className="text-base font-medium">
              Your Name
            </Label>
            <Input
              id="playerName"
              placeholder="Enter your name..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="text-lg py-3"
              maxLength={30}
              onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
              autoFocus
            />
          </div>

          <Button 
            onClick={handleJoinRoom} 
            disabled={loading}
            className="w-full text-lg py-6 bg-accent hover:bg-accent/90 shadow-md"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Joining Room...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-5 w-5" />
                Join Room
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
