import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, Gamepad2 } from "lucide-react";

interface Room {
  id: string;
  room_code: string;
  name: string;
  host_id: string;
  current_game: string | null;
  game_state: any;
  is_active: boolean;
}

interface Player {
  id: string;
  player_id: string;
  player_name: string;
  is_host: boolean;
  joined_at: string;
}

interface LobbyHostScreenProps {
  room: Room;
  players: Player[];
}

export const LobbyHostScreen = ({ room, players }: LobbyHostScreenProps) => {
  const [gameVotes, setGameVotes] = useState<{[key: string]: number}>({});

  useEffect(() => {
    const loadGameVotes = async () => {
      try {
        const { data: votes, error } = await supabase
          .from("game_requests")
          .select("game_type, player_id")
          .eq("room_id", room.id);

        if (error) {
          console.error("Error loading game votes:", error);
          return;
        }

        // Count votes per game
        const voteCounts: {[key: string]: number} = {};
        votes?.forEach(vote => {
          voteCounts[vote.game_type] = (voteCounts[vote.game_type] || 0) + 1;
        });

        setGameVotes(voteCounts);
      } catch (error) {
        console.error("Error loading game votes:", error);
      }
    };

    loadGameVotes();

    // Subscribe to vote changes
    const channel = supabase
      .channel(`host-votes-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_requests',
          filter: `room_id=eq.${room.id}`
        },
        () => {
          loadGameVotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id]);

  const gameOptions = [
    { 
      id: "would_you_rather", 
      name: "Would You Rather", 
      description: "Choose between two options",
      color: "bg-blue-500"
    },
    { 
      id: "paranoia", 
      name: "Paranoia", 
      description: "Whisper secrets and guess answers",
      color: "bg-purple-500"
    },
    { 
      id: "forms", 
      name: "Forms", 
      description: "Answer questions about each other",
      color: "bg-green-500"
    },
  ];

  const totalVotes = Object.values(gameVotes).reduce((sum, count) => sum + count, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-8">
      {/* Header */}
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-6xl font-bold text-primary mb-4">Puzzzz</h1>
        <div className="flex items-center justify-center space-x-4 text-2xl text-muted-foreground">
          <span>Room: {room.room_code}</span>
          <span>•</span>
          <span>{room.name}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Players Section */}
        <Card className="bg-card/80 backdrop-blur border-2 shadow-xl">
          <CardContent className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Users className="h-8 w-8 text-primary" />
              <h2 className="text-3xl font-bold">Players ({players.length})</h2>
            </div>
            
            <div className="space-y-4">
              {players.map((player, index) => (
                <div 
                  key={player.id}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <span className="text-xl font-medium">{player.player_name}</span>
                  </div>
                  {player.is_host && (
                    <Badge variant="default" className="flex items-center space-x-1">
                      <Crown className="h-4 w-4" />
                      <span>Host</span>
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Game Voting Section */}
        <Card className="bg-card/80 backdrop-blur border-2 shadow-xl">
          <CardContent className="p-8">
            <div className="flex items-center space-x-3 mb-6">
              <Gamepad2 className="h-8 w-8 text-primary" />
              <h2 className="text-3xl font-bold">Game Voting</h2>
            </div>

            {totalVotes === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-xl">Waiting for players to vote...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {gameOptions.map((game, index) => {
                  const votes = gameVotes[game.id] || 0;
                  const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
                  
                  return (
                    <div 
                      key={game.id}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-medium">{game.name}</span>
                        <Badge variant="outline" className="text-sm">
                          {votes} vote{votes !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                      
                      <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                        <div 
                          className={`h-full ${game.color} transition-all duration-1000 ease-out`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">{game.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Waiting Message */}
      <div className="text-center mt-12 animate-fade-in">
        <p className="text-2xl text-muted-foreground">
          Waiting for host to start the game...
        </p>
      </div>
    </div>
  );
};