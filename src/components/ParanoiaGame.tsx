import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Shuffle, Crown, History, Users } from "lucide-react";

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

export function ParanoiaGame({ room, players, currentPlayer, onUpdateRoom }: ParanoiaGameProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<ParanoiaQuestion | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<string | null>(null);

  const gameState = room.game_state || {};
  const phase = gameState.phase || "waiting"; // waiting, answering, spinning, results, ended
  const roundNumber = gameState.roundNumber || 1;
  const maxRounds = gameState.maxRounds || 5;
  const playerAnswers = gameState.playerAnswers || {};
  const currentQuestions = gameState.currentQuestions || {};
  const revealedPlayer = gameState.revealedPlayer || null;

  useEffect(() => {
    if (room.current_game === "paranoia" && phase === "answering" && !currentQuestion) {
      loadQuestion();
    }
  }, [room.current_game, phase]);

  // Real-time subscription for game state changes
  useEffect(() => {
    const channel = supabase
      .channel('paranoia-game-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${room.id}`
        },
        (payload) => {
          if (payload.new) {
            onUpdateRoom(payload.new as Room);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id]);

  const loadQuestion = async () => {
    try {
      // First get the count of questions
      const { count } = await supabase
        .from("paranoia_questions")
        .select("*", { count: "exact", head: true });
      
      if (!count || count === 0) {
        throw new Error("No questions available");
      }

      // Get a random offset
      const randomOffset = Math.floor(Math.random() * count);
      
      // Get the question at that offset
      const { data, error } = await supabase
        .from("paranoia_questions")
        .select("*")
        .range(randomOffset, randomOffset)
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setCurrentQuestion(data[0]);
      } else {
        throw new Error("No question found");
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
        phase: "answering",
        roundNumber: 1,
        maxRounds: 5,
        playerAnswers: {},
        currentQuestions: {},
        revealedPlayer: null
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });
      
      toast({
        title: "Game Started!",
        description: "Everyone gets a question. Answer secretly!",
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

  const submitAnswer = async (selectedPlayerId: string) => {
    if (!currentQuestion) return;

    setIsLoading(true);
    try {
      const newPlayerAnswers = {
        ...playerAnswers,
        [currentPlayer.player_id]: selectedPlayerId
      };

      const newCurrentQuestions = {
        ...currentQuestions,
        [currentPlayer.player_id]: currentQuestion
      };

      const newGameState = {
        ...gameState,
        playerAnswers: newPlayerAnswers,
        currentQuestions: newCurrentQuestions
      };

      // Check if all players have answered
      const allAnswered = Object.keys(newPlayerAnswers).length === players.length;
      
      if (allAnswered) {
        newGameState.phase = "spinning";
      }

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });

      const selectedPlayer = players.find(p => p.player_id === selectedPlayerId);
      toast({
        title: "Answer Submitted!",
        description: `You chose ${selectedPlayer?.player_name}`,
        className: "bg-success text-success-foreground",
      });

      if (allAnswered) {
        toast({
          title: "Everyone Answered!",
          description: "Time to spin the wheel of fate...",
          className: "bg-warning text-warning-foreground",
        });
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast({
        title: "Error",
        description: "Failed to submit answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const spinWheel = async () => {
    if (!currentPlayer.is_host) return;

    setIsSpinning(true);
    
    // Dramatic pause for suspense
    setTimeout(async () => {
      const randomPlayer = players[Math.floor(Math.random() * players.length)];
      setSpinResult(randomPlayer.player_id);
      
      try {
        const newGameState = {
          ...gameState,
          phase: "results",
          revealedPlayer: randomPlayer.player_id
        };

        await supabase
          .from("rooms")
          .update({ game_state: newGameState })
          .eq("id", room.id);

        onUpdateRoom({ ...room, game_state: newGameState });
        
        toast({
          title: "🎉 The Wheel Has Spoken!",
          description: `${randomPlayer.player_name}'s question will be revealed!`,
          className: "bg-destructive text-destructive-foreground",
        });
      } catch (error) {
        console.error("Error spinning wheel:", error);
        toast({
          title: "Error",
          description: "Failed to process wheel spin. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSpinning(false);
      }
    }, 3000);
  };

  const nextRound = async () => {
    if (!currentPlayer.is_host) return;

    try {
      const isGameEnded = roundNumber >= maxRounds;
      
      const newGameState = {
        ...gameState,
        phase: isGameEnded ? "ended" : "answering",
        roundNumber: isGameEnded ? roundNumber : roundNumber + 1,
        playerAnswers: {},
        currentQuestions: {},
        revealedPlayer: null
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });
      setCurrentQuestion(null);
      setSpinResult(null);
      
      if (isGameEnded) {
        toast({
          title: "Game Complete!",
          description: "Thanks for playing Paranoia!",
          className: "bg-success text-success-foreground",
        });
      } else {
        toast({
          title: `Round ${roundNumber + 1} Starting!`,
          description: "Get ready for new questions...",
          className: "bg-primary text-primary-foreground",
        });
      }
    } catch (error) {
      console.error("Error starting next round:", error);
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
            Everyone gets a secret question and chooses someone. Then the wheel of fate decides 
            whose question gets revealed to everyone!
          </p>
        </div>

        {currentPlayer.is_host ? (
          <div className="text-center">
            <Button 
              onClick={startGame} 
              disabled={isLoading || players.length < 2}
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            >
              {isLoading ? "Starting..." : "Start Paranoia Game"}
            </Button>
            {players.length < 2 && (
              <p className="text-sm text-muted-foreground mt-2">
                Need at least 2 players to start
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

  // Answering phase - everyone answers their question
  if (phase === "answering") {
    const hasAnswered = currentPlayer.player_id in playerAnswers;
    const answeredCount = Object.keys(playerAnswers).length;

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Round {roundNumber} of {maxRounds}</h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="h-4 w-4" />
            <span className="text-muted-foreground">
              {answeredCount} of {players.length} players answered
            </span>
          </div>
          <Progress value={(answeredCount / players.length) * 100} className="w-64 mx-auto" />
        </div>

        {!hasAnswered ? (
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
                      Choose who this question applies to. Your choice will be revealed later!
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {players.filter(p => p.player_id !== currentPlayer.player_id).map((player) => (
                        <Button
                          key={player.player_id}
                          variant="outline"
                          onClick={() => submitAnswer(player.player_id)}
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
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                <Eye className="h-8 w-8 text-success" />
              </div>
              <p className="text-lg font-medium mb-2">Answer Submitted!</p>
              <p className="text-muted-foreground">
                Waiting for other players to finish answering...
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Spinning phase - wheel decides whose question gets revealed
  if (phase === "spinning") {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Round {roundNumber} of {maxRounds}</h1>
          <p className="text-lg mb-4">Everyone has answered! Time for the wheel of fate...</p>
        </div>

        <Card className="border-warning">
          <CardContent className="p-8 text-center">
            <div className="mb-6">
              <div className="relative w-32 h-32 mx-auto mb-4">
                <Shuffle className={`w-full h-full ${isSpinning ? 'animate-spin' : ''}`} style={{ 
                  animationDuration: isSpinning ? '2s' : '0s' 
                }} />
                {isSpinning && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full animate-pulse" />
                )}
              </div>
              <h2 className="text-xl font-bold mb-2">Wheel of Fate</h2>
              <p className="text-muted-foreground">
                Which player's question will be revealed?
              </p>
            </div>

            {currentPlayer.is_host && !isSpinning ? (
              <Button 
                onClick={spinWheel}
                size="lg"
                className="bg-gradient-to-r from-warning to-destructive hover:from-warning/90 hover:to-destructive/90"
              >
                Spin the Wheel!
              </Button>
            ) : isSpinning ? (
              <div className="space-y-2">
                <div className="animate-pulse">
                  <p className="text-lg font-medium">The wheel is spinning...</p>
                  <p className="text-sm text-muted-foreground">Deciding fate...</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">
                {players.find(p => p.is_host)?.player_name} will spin the wheel...
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Results phase - show whose question was revealed and all answers
  if (phase === "results") {
    const revealedPlayerObj = players.find(p => p.player_id === revealedPlayer);
    const revealedQuestion = currentQuestions[revealedPlayer];
    
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Round {roundNumber} Results</h1>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-full">
            <Crown className="h-4 w-4" />
            <span className="font-medium">{revealedPlayerObj?.player_name}'s question was revealed!</span>
          </div>
        </div>

        {/* Revealed Question */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-center text-destructive">
              🎯 The Revealed Question
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center p-4 bg-destructive/10 rounded-lg">
              <p className="text-lg font-medium">{revealedQuestion?.question}</p>
              <div className="flex justify-center gap-2 mt-2">
                <Badge variant="outline">{revealedQuestion?.category}</Badge>
                <Badge variant="outline">Spice Level: {revealedQuestion?.spiciness_level}/5</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* All Player Answers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Everyone's Answers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {players.map((player) => {
                const answeredPlayerId = playerAnswers[player.player_id];
                const answeredPlayer = players.find(p => p.player_id === answeredPlayerId);
                const isRevealed = player.player_id === revealedPlayer;
                
                return (
                  <div 
                    key={player.player_id} 
                    className={`p-4 rounded-lg border ${isRevealed ? 'border-destructive bg-destructive/5' : 'border-muted'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{player.player_name}</span>
                        {player.is_host && <Crown className="h-3 w-3" />}
                        {isRevealed && <Badge variant="destructive" className="text-xs">REVEALED</Badge>}
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-muted-foreground">chose</span>
                        <div className="font-medium">{answeredPlayer?.player_name}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center">
          {currentPlayer.is_host && (
            <>
              {roundNumber < maxRounds ? (
                <Button onClick={nextRound} size="lg">
                  Next Round ({roundNumber + 1}/{maxRounds})
                </Button>
              ) : (
                <Button onClick={nextRound} size="lg">
                  End Game
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // Game ended
  if (phase === "ended") {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Game Complete!</h1>
          <p className="text-muted-foreground text-lg">
            Thanks for playing Paranoia! Hope you enjoyed the suspense.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Game Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">{maxRounds}</div>
                <div className="text-sm text-muted-foreground">Rounds Played</div>
              </div>
              <div className="p-4 bg-secondary/10 rounded-lg">
                <div className="text-2xl font-bold text-secondary">{players.length}</div>
                <div className="text-sm text-muted-foreground">Players</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 justify-center">
          <Button onClick={resetGame} variant="outline">
            Back to Lobby
          </Button>
        </div>
      </div>
    );
  }

  return null;
}