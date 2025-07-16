import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Eye, EyeOff, Clock, MessageSquare, Zap } from "lucide-react";

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
  const [currentQuestions, setCurrentQuestions] = useState<{[key: string]: ParanoiaQuestion}>({});
  const [playerAnswers, setPlayerAnswers] = useState<{[key: string]: string}>({});
  const [roundNumber, setRoundNumber] = useState(1);
  
  const gameState = room.game_state || {};
  const phase = gameState.phase || "waiting";

  useEffect(() => {
    // Extract data from game state
    if (gameState.currentQuestions) {
      setCurrentQuestions(gameState.currentQuestions);
    }
    
    if (gameState.playerAnswers) {
      setPlayerAnswers(gameState.playerAnswers);
    }
    
    if (gameState.roundNumber) {
      setRoundNumber(gameState.roundNumber);
    }
  }, [gameState]);

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.player_id === playerId);
    return player ? player.player_name : "Unknown Player";
  };

  if (phase === "waiting" || Object.keys(currentQuestions).length === 0) {
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
                    Players are answering their secret questions...
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {players.map((player) => {
                    const hasAnswered = playerAnswers[player.player_id];
                    return (
                      <div key={player.id} className="text-center">
                        <div className="text-sm text-muted-foreground mb-2">{player.player_name}</div>
                        <Badge variant={hasAnswered ? "default" : "outline"} className="text-lg px-4 py-2">
                          {hasAnswered ? "✓ Answered" : "Thinking..."}
                        </Badge>
                      </div>
                    );
                  })}
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

  if (phase === "spinning" || phase === "revealing" || phase === "results" || phase === "showing_results") {
    // Show spinning wheel animation during spinning phase
    if (phase === "spinning") {
      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-8">
          <div className="text-center mb-8">
            <h1 className="text-6xl font-bold text-primary mb-4">Paranoia</h1>
            <div className="flex items-center justify-center space-x-4 text-2xl text-muted-foreground">
              <span>Room: {room.room_code}</span>
              <span>•</span>
              <span>Round {roundNumber}</span>
            </div>
          </div>

          <div className="max-w-4xl mx-auto text-center">
            <Card className="bg-card/90 backdrop-blur border-2 shadow-2xl">
              <CardContent className="p-12">
                <div className="flex items-center justify-center space-x-4 mb-8">
                  <Zap className="h-12 w-12 text-yellow-500 animate-pulse" />
                  <h2 className="text-4xl font-bold">Spinning the Wheel!</h2>
                </div>
                
                {/* Spinning Wheel Animation */}
                <div className="flex justify-center mb-8">
                  <div className="relative">
                    <div className="w-32 h-32 border-8 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                </div>
                
                <p className="text-2xl text-muted-foreground mb-4">
                  Will the questions be revealed?
                </p>
                
                <div className="text-lg text-muted-foreground">
                  <p>Players have answered their secret questions...</p>
                  <p>Now spinning to see which ones get revealed!</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

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
                {gameState.revealedPlayer ? (
                  <Eye className="h-8 w-8 text-green-600" />
                ) : (
                  <EyeOff className="h-8 w-8 text-muted-foreground" />
                )}
                <h2 className="text-3xl font-bold">
                  {gameState.revealedPlayer ? "Question Revealed!" : "Results"}
                </h2>
              </div>
              
              <div className="space-y-6">
                {gameState.revealedPlayer && currentQuestions[gameState.revealedPlayer] ? (
                  <div className="p-6 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-lg border-2 border-green-400">
                    <div className="text-sm text-muted-foreground mb-2">
                      {getPlayerName(gameState.revealedPlayer)}'s Question Was Revealed:
                    </div>
                    <p className="text-2xl font-bold text-foreground mb-4">
                      {currentQuestions[gameState.revealedPlayer].question}
                    </p>
                    {currentQuestions[gameState.revealedPlayer].spiciness_level && (
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        Spiciness Level: {currentQuestions[gameState.revealedPlayer].spiciness_level}/5
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="p-6 bg-gradient-to-r from-gray-500/20 to-gray-600/20 rounded-lg border-2 border-gray-400">
                    <div className="text-sm text-muted-foreground mb-2">All Questions Remain:</div>
                    <p className="text-2xl font-bold text-muted-foreground">
                      🤐 SECRET 🤐
                    </p>
                  </div>
                )}

                {/* Show all player answers */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(playerAnswers).map(([playerId, answeredPlayerId]) => (
                    <div key={playerId} className="text-center p-4 bg-muted/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-2">{getPlayerName(playerId)} chose:</div>
                      <Badge variant="default" className="text-lg px-4 py-2">
                        {getPlayerName(answeredPlayerId)}
                      </Badge>
                    </div>
                  ))}
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