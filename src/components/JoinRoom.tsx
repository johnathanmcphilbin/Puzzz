import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useRoomActions } from "@/hooks/useRoomActions";
import { Loader2, UserPlus } from "lucide-react";

interface JoinRoomProps {
  onClose?: () => void;
}

export const JoinRoom = ({ onClose }: JoinRoomProps) => {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const { joinRoom, loading } = useRoomActions();

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const success = await joinRoom(roomCode, playerName);
    if (success) {
      onClose?.();
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
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomCode">Room Code</Label>
            <Input
              id="roomCode"
              type="text"
              placeholder="Enter 6-character room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
              disabled={loading}
              className="text-center text-lg font-mono tracking-wider font-slashed-zero"
              autoComplete="off"
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
              disabled={loading}
              autoComplete="nickname"
              name="nickname"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading}
          >
            {loading ? (
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
