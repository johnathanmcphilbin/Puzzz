import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRoomActions } from '@/hooks/useRoomActions';
import { Loader2, Crown, Users } from 'lucide-react';

interface CreateRoomProps {
  selectedGame: string;
  onClose?: () => void;
}

export const CreateRoom = ({ selectedGame, onClose }: CreateRoomProps) => {
  const [playerName, setPlayerName] = useState('');
  const { createRoom, loading } = useRoomActions();

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    const roomCode = await createRoom(playerName, selectedGame);
    if (roomCode) {
      onClose?.();
    }
  };

  const getGameTitle = (gameType: string) => {
    switch (gameType) {
      case 'would_you_rather':
        return 'Would You Rather';
      case 'paranoia':
        return 'Paranoia';
      case 'odd_one_out':
        return 'Odd One Out';
      default:
        return gameType;
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mb-2 flex items-center justify-center gap-2">
          <Crown className="h-5 w-5 text-warning" />
          <CardTitle>Create Room</CardTitle>
        </div>
        <CardDescription>
          Set up a new game room for your friends
        </CardDescription>
        <div className="mt-3 flex items-center justify-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            {getGameTitle(selectedGame)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="playerName">Your Name</Label>
            <Input
              id="playerName"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={e => setPlayerName(e.target.value)}
              maxLength={20}
              disabled={loading}
              autoComplete="nickname"
              name="nickname"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
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
