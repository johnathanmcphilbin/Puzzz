import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, EyeOff, Clock, MessageSquare } from "lucide-react";

interface Room {
  id: string;
  room_code: string;
  name: string;
  current_game: string | null;
  game_state: any;
}

interface Player {
  id: string;
  player_id: string;
  player_name: string;
  is_host: boolean;
}

interface ParanoiaHostScreenProps {
  room: Room;
  players: Player[];
}

interface ParanoiaQuestion {
  id: string;
  question: string;
  category?: string;
  spiciness_level?: number;
}

interface ParanoiaRound {
  id: string;
  question_id: string;
  asker_player_id: string;
  chosen_player_id: string;
  is_revealed: boolean;
  round_number: number;
}

export const ParanoiaHostScreen = ({ room, players }: ParanoiaHostScreenProps) => {
  const [currentQuestion, setCurrentQuestion] = useState<ParanoiaQuestion | null>(null);
  const [currentRound, setCurrentRound] = useState<ParanoiaRound | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  
  const gameState = room.game_state || {};
  const phase = gameState.phase || "waiting";

  useEffect(() => {
    // Load current round and question
    if (gameState.currentRoundId) {
      const loadRoundData = async () => {
        try {
          // Load round
          const { data: roundData, error: roundError } = await supabase
            .from("paranoia_rounds")
            .select("*")
            .eq("id", gameState.currentRoundId)
            .single();

          if (roundError) {
            console.error("Error loading round:", roundError);
          } else {
            setCurrentRound(roundData);
            setRoundNumber(roundData.round_number);

            // Load question for this round
            const { data: questionData, error: questionError } = await supabase
              .from("paranoia_questions")
              .select("*")
              .eq("id", roundData.question_id)
              .single();

            if (questionError) {
              console.error("Error loading question:", questionError);
            } else {
              setCurrentQuestion(questionData);
            }
          }
        } catch (error) {
          console.error("Error loading round data:", error);
        }
      };

      loadRoundData();
    }

    // Set round number from game state
    if (gameState.roundNumber) {
      setRoundNumber(gameState.roundNumber);
    }

    // Subscribe to round changes
    const channel = supabase
      .channel(`host-paranoia-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'paranoia_rounds',
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          console.log('Round update:', payload);
          // Reload round data when changes occur
          if (payload.eventType === 'UPDATE' && payload.new.id === gameState.currentRoundId) {
            setCurrentRound(payload.new as ParanoiaRound);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, gameState.currentRoundId, gameState.roundNumber]);

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.player_id === playerId);
    return player ? player.player_name : "Unknown Player";
  };

  if (phase === "waiting" || !currentQuestion || !currentRound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-primary mb-4">Paranoia</h1>
          <div className="flex items-center justify-center space-x-4 text-2xl text-muted-foreground mb-8">
            <span>Room: {room.room_code}</span>
            <span>•</span>
            <span>Round {roundNumber}</span>
          </div>
          <div className="flex items-center justify-center space-y-4">
            <Clock className="h-16 w-16 animate-pulse text-primary" />
          </div>
          <p className="text-3xl text-muted-foreground mt-8">
            Preparing next round...
          </p>
        </div>
      </div>
    );
  }

  if (phase === "answering") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-primary mb-4">Paranoia</h1>
          <div className="flex items-center justify-center space-x-4 text-2xl text-muted-foreground">
            <span>Room: {room.room_code}</span>
            <span>•</span>
            <span>Round {roundNumber}</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Current Round Info */}
          <Card className="bg-card/90 backdrop-blur border-2 shadow-2xl mb-8">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center space-x-4 mb-6">
                <MessageSquare className="h-8 w-8 text-primary" />
                <h2 className="text-3xl font-bold">Secret Question Phase</h2>
              </div>
              
              <div className="space-y-6">
                <div className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-center space-x-2 mb-4">
                    <EyeOff className="h-6 w-6 text-purple-600" />
                    <span className="text-lg font-medium text-purple-700 dark:text-purple-300">
                      Secret Phase - Question Hidden
                    </span>
                  </div>
                  <p className="text-xl text-muted-foreground">
                    {getPlayerName(currentRound.asker_player_id)} is whispering a question to{" "}
                    <span className="font-bold text-foreground">
                      {getPlayerName(currentRound.chosen_player_id)}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">Asking</div>
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {getPlayerName(currentRound.asker_player_id)}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">Answering</div>
                    <Badge variant="default" className="text-lg px-4 py-2">
                      {getPlayerName(currentRound.chosen_player_id)}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-center space-x-8 text-lg text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>{players.length} players</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card className="bg-card/90 backdrop-blur border shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">How Paranoia Works:</h3>
              <div className="space-y-2 text-muted-foreground">
                <p>1. The asker whispers a question privately to the chosen player</p>
                <p>2. The chosen player answers the question out loud for everyone to hear</p>
                <p>3. Everyone tries to guess what the original question was</p>
                <p>4. The question may be revealed depending on the game rules!</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "revealing" || phase === "results") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-purple-50 dark:from-green-950 dark:to-purple-950 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-primary mb-4">Paranoia</h1>
          <div className="flex items-center justify-center space-x-4 text-2xl text-muted-foreground">
            <span>Room: {room.room_code}</span>
            <span>•</span>
            <span>Round {roundNumber}</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Question Reveal */}
          <Card className="bg-card/90 backdrop-blur border-2 shadow-2xl mb-8">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center space-x-4 mb-6">
                {currentRound.is_revealed ? (
                  <Eye className="h-8 w-8 text-green-600" />
                ) : (
                  <EyeOff className="h-8 w-8 text-muted-foreground" />
                )}
                <h2 className="text-3xl font-bold">
                  {currentRound.is_revealed ? "Question Revealed!" : "Question Hidden"}
                </h2>
              </div>
              
              <div className="space-y-6">
                {currentRound.is_revealed ? (
                  <div className="p-6 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg border-2 border-green-400">
                    <div className="text-sm text-muted-foreground mb-2">The Secret Question Was:</div>
                    <p className="text-2xl font-bold text-foreground mb-4">
                      {currentQuestion.question}
                    </p>
                    {currentQuestion.spiciness_level && (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        Spiciness Level: {currentQuestion.spiciness_level}/5
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="p-6 bg-gradient-to-r from-gray-500/20 to-gray-600/20 rounded-lg border-2 border-gray-400">
                    <div className="text-sm text-muted-foreground mb-2">The Question Remains:</div>
                    <p className="text-2xl font-bold text-muted-foreground">
                      🤐 SECRET 🤐
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">Asked by</div>
                    <Badge variant="secondary" className="text-lg px-4 py-2">
                      {getPlayerName(currentRound.asker_player_id)}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">Answered by</div>
                    <Badge variant="default" className="text-lg px-4 py-2">
                      {getPlayerName(currentRound.chosen_player_id)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">Paranoia</h1>
        <div className="flex items-center justify-center space-x-4 text-2xl text-muted-foreground">
          <span>Room: {room.room_code}</span>
          <span>•</span>
          <span>Round {roundNumber}</span>
        </div>
        <p className="text-2xl text-muted-foreground mt-8">Game in progress...</p>
      </div>
    </div>
  );
};