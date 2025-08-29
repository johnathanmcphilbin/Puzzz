import { Loader2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRoomActions } from '@/hooks/useRoomActions';

export const DirectJoin = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const [playerName, setPlayerName] = useState('');
  const { joinRoom, loading } = useRoomActions();

  const handleJoinRoom = async () => {
    if (!roomCode) return;
    await joinRoom(roomCode, playerName);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-fit rounded-full bg-accent/10 p-3">
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
              onChange={e => setPlayerName(e.target.value)}
              className="py-3 text-lg"
              maxLength={30}
              onKeyDown={e => e.key === 'Enter' && handleJoinRoom()}
              autoFocus
            />
          </div>

          <Button
            onClick={handleJoinRoom}
            disabled={loading}
            className="w-full bg-accent py-6 text-lg shadow-md hover:bg-accent/90"
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
