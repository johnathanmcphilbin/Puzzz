import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Shuffle, Crown, History } from "lucide-react";

interface Room {
  id: string;
  room_code: string;
  name: string;
  host_id: string;
  current_game: string;
  game_state: any;
  is_active: boolean;
}

interface Player {
  id: string;
  player_name: string;
  player_id: string;
  is_host: boolean;
}

interface ParanoiaGameProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (room: Room) => void;
}

interface ParanoiaQuestion {
  id: string;
  question: string;
  category: string;
  spiciness_level: number;
}

interface ParanoiaRound {
  id: string;
  question_id: string;
  asker_player_id: string;
  chosen_player_id: string;
  is_revealed: boolean;
  round_number: number;
  question?: ParanoiaQuestion;
}

export function ParanoiaGame({ room, players, currentPlayer, onUpdateRoom }: ParanoiaGameProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<ParanoiaQuestion | null>(null);
  const [gameHistory, setGameHistory] = useState<ParanoiaRound[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);

  const gameState = room.game_state || {};
  const phase = gameState.phase || "waiting"; // waiting, reading, answering, randomizing, results, ended
  const currentPlayerIndex = gameState.currentPlayerIndex || 0;
  const roundNumber = gameState.roundNumber || 1;
  const maxRounds = gameState.maxRounds || 10;
  const isCurrentPlayerTurn = players[currentPlayerIndex]?.player_id === currentPlayer.player_id;

  useEffect(() => {
    if (room.current_game === "paranoia") {
      loadGameHistory();
      if (phase === "reading" && isCurrentPlayerTurn && !currentQuestion) {
        loadNewQuestion();
      }
    }
  }, [room.current_game, phase, isCurrentPlayerTurn]);

  const loadGameHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("paranoia_rounds")
        .select(`
          *,
          question:paranoia_questions(*)
        `)
        .eq("room_id", room.id)
        .order("round_number", { ascending: true });

      if (error) throw error;
      setGameHistory(data || []);
    } catch (error) {
      console.error("Error loading game history:", error);
    }
  };

  const loadNewQuestion = async () => {
    try {
      const { data, error } = await supabase
        .from("paranoia_questions")
        .select("*")
        .order("RANDOM()")
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setCurrentQuestion(data[0]);
      }
    } catch (error) {
      console.error("Error loading question:", error);
      toast({
        title: "Error",
        description: "Failed to load question. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startGame = async () => {
    setIsLoading(true);
    try {
      const newGameState = {
        ...gameState,
        phase: "reading",
        currentPlayerIndex: 0,
        roundNumber: 1,
        maxRounds: 10
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });
      
      toast({
        title: "Game Started!",
        description: "The paranoia begins...",
        className: "bg-success text-success-foreground",
      });
    } catch (error) {
      console.error("Error starting game:", error);
      toast({
        title: "Error",
        description: "Failed to start game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectPlayer = async (selectedPlayerId: string) => {
    if (!currentQuestion || !isCurrentPlayerTurn) return;

    setIsLoading(true);
    try {
      // Save the round to database
      const { error: roundError } = await supabase
        .from("paranoia_rounds")
        .insert({
          room_id: room.id,
          question_id: currentQuestion.id,
          asker_player_id: currentPlayer.player_id,
          chosen_player_id: selectedPlayerId,
          round_number: roundNumber,
          is_revealed: false
        });

      if (roundError) throw roundError;

      // Update game state to randomizing phase
      const newGameState = {
        ...gameState,
        phase: "randomizing",
        selectedPlayerId,
        currentQuestionId: currentQuestion.id
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });

      const selectedPlayer = players.find(p => p.player_id === selectedPlayerId);
      toast({
        title: "Choice Made!",
        description: `${currentPlayer.player_name} chose ${selectedPlayer?.player_name}`,
        className: "bg-success text-success-foreground",
      });
    } catch (error) {
      console.error("Error selecting player:", error);
      toast({
        title: "Error",
        description: "Failed to select player. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const spinRandomizer = async () => {
    if (!isCurrentPlayerTurn) return;

    setIsSpinning(true);
    
    // Dramatic pause for suspense
    setTimeout(async () => {
      const shouldReveal = Math.random() < 0.5; // 50% chance to reveal
      
      try {
        // Update the round in database
        const { error: updateError } = await supabase
          .from("paranoia_rounds")
          .update({ is_revealed: shouldReveal })
          .eq("room_id", room.id)
          .eq("round_number", roundNumber);

        if (updateError) throw updateError;

        const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
        const isGameEnded = roundNumber >= maxRounds;

        const newGameState = {
          ...gameState,
          phase: isGameEnded ? "ended" : "reading",
          currentPlayerIndex: isGameEnded ? currentPlayerIndex : nextPlayerIndex,
          roundNumber: isGameEnded ? roundNumber : roundNumber + 1,
          revealed: shouldReveal
        };

        await supabase
          .from("rooms")
          .update({ game_state: newGameState })
          .eq("id", room.id);

        onUpdateRoom({ ...room, game_state: newGameState });
        
        // Reload history to show the new round
        loadGameHistory();
        setCurrentQuestion(null);

        if (shouldReveal) {
          toast({
            title: "🎉 REVEALED!",
            description: "The question is exposed for all to see!",
            className: "bg-destructive text-destructive-foreground",
          });
        } else {
          toast({
            title: "🤫 Secret Safe",
            description: "The question remains hidden...",
            className: "bg-muted text-muted-foreground",
          });
        }
      } catch (error) {
        console.error("Error spinning randomizer:", error);
        toast({
          title: "Error",
          description: "Failed to process randomizer. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSpinning(false);
      }
    }, 2000);
  };

  const endGame = async () => {
    try {
      const newGameState = {
        ...gameState,
        phase: "ended"
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });
      
      toast({
        title: "Game Ended",
        description: "Thanks for playing Paranoia!",
        className: "bg-success text-success-foreground",
      });
    } catch (error) {
      console.error("Error ending game:", error);
    }
  };

  const resetGame = async () => {
    try {
      await supabase
        .from("rooms")
        .update({ current_game: null, game_state: {} })
        .eq("id", room.id);

      onUpdateRoom({ ...room, current_game: null, game_state: {} });
    } catch (error) {
      console.error("Error resetting game:", error);
    }
  };

  // Waiting phase - host can start game
  if (phase === "waiting") {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Paranoia
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A whisper-and-reveal party game that feeds on suspense. Read secret questions, name someone, 
            then let fate decide if the question gets revealed!
          </p>
        </div>

        {currentPlayer.is_host ? (
          <div className="text-center">
            <Button 
              onClick={startGame} 
              disabled={isLoading || players.length < 3}
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            >
              {isLoading ? "Starting..." : "Start Paranoia Game"}
            </Button>
            {players.length < 3 && (
              <p className="text-sm text-muted-foreground mt-2">
                Need at least 3 players to start
              </p>
            )}
          </div>
        ) : (
          <div className="text-center">
            <p className="text-muted-foreground">
              Waiting for {players.find(p => p.is_host)?.player_name} to start the game...
            </p>
          </div>
        )}
      </div>
    );
  }

  // Reading phase - current player sees the question
  if (phase === "reading") {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Round {roundNumber} of {maxRounds}</h1>
          <p className="text-muted-foreground">
            Current turn: <Badge variant="secondary">{players[currentPlayerIndex]?.player_name}</Badge>
          </p>
          <Progress value={(roundNumber / maxRounds) * 100} className="w-64 mx-auto mt-4" />
        </div>

        {isCurrentPlayerTurn ? (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Your Secret Question
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentQuestion ? (
                <div className="space-y-6">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <p className="text-lg font-medium">{currentQuestion.question}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{currentQuestion.category}</Badge>
                      <Badge variant="outline">Spice Level: {currentQuestion.spiciness_level}/5</Badge>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Choose who this question applies to. Everyone will see your choice, but only you know the question!
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {players.filter(p => p.player_id !== currentPlayer.player_id).map((player) => (
                        <Button
                          key={player.player_id}
                          variant="outline"
                          onClick={() => selectPlayer(player.player_id)}
                          disabled={isLoading}
                          className="h-auto p-4 text-left"
                        >
                          <div>
                            <div className="font-medium">{player.player_name}</div>
                            {player.is_host && <Crown className="inline h-3 w-3 ml-1" />}
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p>Loading question...</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <EyeOff className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg">
                {players[currentPlayerIndex]?.player_name} is reading their secret question...
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                They'll choose someone and then we'll see if fate reveals the question!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Randomizing phase
  if (phase === "randomizing") {
    const selectedPlayer = players.find(p => p.player_id === gameState.selectedPlayerId);
    
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Round {roundNumber} of {maxRounds}</h1>
          <p className="text-lg mb-4">
            {players[currentPlayerIndex]?.player_name} chose <Badge variant="secondary">{selectedPlayer?.player_name}</Badge>
          </p>
        </div>

        <Card className="border-warning">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <Shuffle className={`h-16 w-16 mx-auto mb-4 ${isSpinning ? 'animate-spin' : ''}`} />
              <h2 className="text-xl font-bold mb-2">Fate Decides...</h2>
              <p className="text-muted-foreground">
                Will the secret question be revealed to everyone?
              </p>
            </div>

            {isCurrentPlayerTurn && !isSpinning ? (
              <Button 
                onClick={spinRandomizer}
                size="lg"
                className="bg-gradient-to-r from-warning to-destructive hover:from-warning/90 hover:to-destructive/90"
              >
                Spin the Wheel of Fate
              </Button>
            ) : isSpinning ? (
              <div className="animate-pulse">
                <p className="text-lg font-medium">Spinning...</p>
              </div>
            ) : (
              <p className="text-muted-foreground">
                {players[currentPlayerIndex]?.player_name} will spin the wheel...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Game ended - show history
  if (phase === "ended") {
    const revealedQuestions = gameHistory.filter(round => round.is_revealed);
    
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Game Complete!</h1>
          <p className="text-muted-foreground">
            {revealedQuestions.length} out of {gameHistory.length} secrets were revealed
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Revealed Secrets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {revealedQuestions.length > 0 ? (
              <div className="space-y-4">
                {revealedQuestions.map((round) => {
                  const asker = players.find(p => p.player_id === round.asker_player_id);
                  const chosen = players.find(p => p.player_id === round.chosen_player_id);
                  
                  return (
                    <div key={round.id} className="p-4 border rounded-lg">
                      <p className="font-medium mb-2">{round.question?.question}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{asker?.player_name} chose {chosen?.player_name}</span>
                        <Badge variant="outline">Round {round.round_number}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No secrets were revealed this game! 🤫
              </p>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center">
          {currentPlayer.is_host && (
            <Button onClick={resetGame} variant="outline">
              Back to Lobby
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
}