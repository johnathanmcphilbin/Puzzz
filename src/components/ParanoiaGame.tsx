import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Users, Crown, Dice1, MessageSquare } from "lucide-react";

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

interface QuestionAssignment {
  question: string;
  fromPlayerId: string;
  toPlayerId: string;
  isRevealed: boolean;
}

export function ParanoiaGame({ room, players, currentPlayer, onUpdateRoom }: ParanoiaGameProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<ParanoiaQuestion[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>("");
  const [customQuestion, setCustomQuestion] = useState<string>("");
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");
  const [isUsingCustom, setIsUsingCustom] = useState(false);

  const gameState = room.game_state || {};
  const phase = gameState.phase || "waiting"; // waiting, setup, playing, reveal_choice, ended
  const currentTurn = gameState.currentTurn || 0;
  const questionAssignments = gameState.questionAssignments || {}; // {assignmentId: {question, fromPlayerId, toPlayerId, isRevealed}}
  const playerOrder = gameState.playerOrder || [];
  const completedTurns = gameState.completedTurns || [];

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

  // Load available questions when game starts
  useEffect(() => {
    if (phase === "setup") {
      loadQuestions();
    }
  }, [phase]);

  const loadQuestions = async () => {
    try {
      // First try to get AI-generated questions for this room
      const { data: aiQuestionsData } = await supabase
        .from("paranoia_questions")
        .select("*")
        .eq("category", `AI-Generated (${room.room_code})`);

      let questionsToUse = [];
      
      if (aiQuestionsData && aiQuestionsData.length > 0) {
        questionsToUse = aiQuestionsData;
      } else {
        // Fall back to general questions
        const { data: generalQuestionsData } = await supabase
          .from("paranoia_questions")
          .select("*")
          .neq("category", `AI-Generated (${room.room_code})`);
        
        questionsToUse = generalQuestionsData || [];
      }
      
      setAvailableQuestions(questionsToUse);
    } catch (error) {
      console.error("Error loading questions:", error);
      toast({
        title: "Error",
        description: "Failed to load questions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startGame = async () => {
    setIsLoading(true);
    try {
      // Shuffle players for turn order
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      
      const newGameState = {
        phase: "setup",
        currentTurn: 0,
        questionAssignments: {},
        playerOrder: shuffledPlayers.map(p => p.player_id),
        completedTurns: [],
        setupComplete: {}
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });
      
      toast({
        title: "Game Started!",
        description: "Everyone choose a question and recipient!",
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

  const submitQuestionAssignment = async () => {
    if ((!selectedQuestionId && !customQuestion) || !selectedRecipient) return;

    setIsLoading(true);
    try {
      const question = isUsingCustom ? customQuestion : availableQuestions.find(q => q.id === selectedQuestionId)?.question;
      
      const assignmentId = `${currentPlayer.player_id}_${Date.now()}`;
      const newAssignment = {
        question,
        fromPlayerId: currentPlayer.player_id,
        toPlayerId: selectedRecipient,
        isRevealed: false
      };

      const newGameState = {
        ...gameState,
        questionAssignments: {
          ...questionAssignments,
          [assignmentId]: newAssignment
        },
        setupComplete: {
          ...gameState.setupComplete,
          [currentPlayer.player_id]: true
        }
      };

      // Check if all players have assigned questions
      const allComplete = Object.keys(newGameState.setupComplete).length === players.length;
      if (allComplete) {
        newGameState.phase = "playing";
        newGameState.currentTurn = 0;
      }

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });

      const recipient = players.find(p => p.player_id === selectedRecipient);
      toast({
        title: "Question Assigned!",
        description: `Question sent to ${recipient?.player_name}`,
        className: "bg-success text-success-foreground",
      });

      // Reset form
      setSelectedQuestionId("");
      setCustomQuestion("");
      setSelectedRecipient("");
      setIsUsingCustom(false);

    } catch (error) {
      console.error("Error submitting question:", error);
      toast({
        title: "Error",
        description: "Failed to submit question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const answerQuestion = async (answer: string) => {
    const currentPlayerId = playerOrder[currentTurn];
    
    setIsLoading(true);
    try {
      const newGameState = {
        ...gameState,
        completedTurns: [...completedTurns, { playerId: currentPlayerId, answer }]
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });

      toast({
        title: "Answer Recorded!",
        description: "Now deciding if the question gets revealed...",
        className: "bg-primary text-primary-foreground",
      });

      // Automatically proceed to reveal decision (45% chance)
      setTimeout(() => {
        handleRevealDecision();
      }, 2000);

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

  const handleRevealDecision = async () => {
    const shouldReveal = Math.random() < 0.45; // 45% chance to reveal
    
    const newGameState = {
      ...gameState,
      phase: "reveal_choice",
      shouldReveal
    };

    await supabase
      .from("rooms")
      .update({ game_state: newGameState })
      .eq("id", room.id);

    onUpdateRoom({ ...room, game_state: newGameState });
  };

  const nextTurn = async () => {
    const nextTurnIndex = currentTurn + 1;
    const isGameComplete = nextTurnIndex >= players.length;

    const newGameState = {
      ...gameState,
      phase: isGameComplete ? "ended" : "playing",
      currentTurn: nextTurnIndex,
      shouldReveal: false
    };

    await supabase
      .from("rooms")
      .update({ game_state: newGameState })
      .eq("id", room.id);

    onUpdateRoom({ ...room, game_state: newGameState });
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

  // Waiting phase
  if (phase === "waiting") {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Paranoia
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Players send secret questions to each other. Answer out loud without others knowing the question. 
            45% chance the question gets revealed! Risk vs. reward - continue or take a shot to learn the question.
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

  // Setup phase - assign questions
  if (phase === "setup") {
    const hasAssigned = gameState.setupComplete?.[currentPlayer.player_id];
    const assignedCount = Object.keys(gameState.setupComplete || {}).length;

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Assign Your Question</h1>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="h-4 w-4" />
            <span className="text-muted-foreground">
              {assignedCount} of {players.length} players assigned
            </span>
          </div>
        </div>

        {!hasAssigned ? (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Choose Question & Recipient
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Question Type Selection */}
              <div className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    variant={!isUsingCustom ? "default" : "outline"}
                    onClick={() => setIsUsingCustom(false)}
                  >
                    Use Pre-made Question
                  </Button>
                  <Button
                    variant={isUsingCustom ? "default" : "outline"}
                    onClick={() => setIsUsingCustom(true)}
                  >
                    Write Custom Question
                  </Button>
                </div>

                {/* Question Selection */}
                {!isUsingCustom ? (
                  <div className="space-y-3">
                    <Label>Select a question:</Label>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {availableQuestions.map((question) => (
                        <Card 
                          key={question.id}
                          className={`cursor-pointer transition-colors ${
                            selectedQuestionId === question.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setSelectedQuestionId(question.id)}
                        >
                          <CardContent className="p-4">
                            <p className="font-medium">{question.question}</p>
                            <div className="flex gap-2 mt-2">
                              <Badge variant="outline">{question.category}</Badge>
                              <Badge variant="outline">Spice: {question.spiciness_level}/5</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="custom-question">Write your question:</Label>
                    <Textarea
                      id="custom-question"
                      placeholder="Who is most likely to..."
                      value={customQuestion}
                      onChange={(e) => setCustomQuestion(e.target.value)}
                      className="min-h-20"
                    />
                  </div>
                )}

                {/* Recipient Selection */}
                <div className="space-y-3">
                  <Label>Send to:</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {players
                      .filter(p => p.player_id !== currentPlayer.player_id)
                      .map((player) => (
                        <Button
                          key={player.player_id}
                          variant={selectedRecipient === player.player_id ? "default" : "outline"}
                          onClick={() => setSelectedRecipient(player.player_id)}
                          className="h-auto p-4"
                        >
                          <div>
                            <div className="font-medium">{player.player_name}</div>
                            {player.is_host && <Crown className="inline h-3 w-3 ml-1" />}
                          </div>
                        </Button>
                      ))}
                  </div>
                </div>

                <Button
                  onClick={submitQuestionAssignment}
                  disabled={isLoading || (!selectedQuestionId && !customQuestion) || !selectedRecipient}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? "Sending..." : "Send Question"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-success" />
              </div>
              <p className="text-lg font-medium mb-2">Question Assigned!</p>
              <p className="text-muted-foreground">
                Waiting for other players to assign their questions...
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Playing phase - take turns answering
  if (phase === "playing") {
    const currentPlayerId = playerOrder[currentTurn];
    const currentPlayerObj = players.find(p => p.player_id === currentPlayerId);
    const isMyTurn = currentPlayerId === currentPlayer.player_id;

    // If we can't find the current player, something is wrong with the game state
    if (!currentPlayerObj) {
      console.error("Current player not found in players array:", { currentPlayerId, playerOrder, players });
      return (
        <Card className="border-destructive">
          <CardContent className="p-8 text-center">
            <p className="text-destructive">Game state error. Please restart the game.</p>
            <Button onClick={resetGame} className="mt-4">Reset Game</Button>
          </CardContent>
        </Card>
      );
    }
    
    // Find the question assigned to current player
    const myQuestion = Object.values(questionAssignments).find(
      (assignment: any) => assignment.toPlayerId === currentPlayerId
    ) as QuestionAssignment | undefined;

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">
            {isMyTurn ? "Your Turn!" : `${currentPlayerObj?.player_name}'s Turn`}
          </h1>
          <div className="text-muted-foreground">
            Turn {currentTurn + 1} of {players.length}
          </div>
        </div>

        {isMyTurn ? (
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Your Secret Question
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-primary/10 rounded-lg">
                <p className="text-lg font-medium">{myQuestion?.question}</p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Answer this question OUT LOUD so everyone can hear. They don't know what the question is!
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {players.map((player) => (
                    <Button
                      key={player.player_id}
                      onClick={() => answerQuestion(player.player_name)}
                      disabled={isLoading}
                      className="h-auto p-4"
                      variant="outline"
                    >
                      <div>
                        <div className="font-medium">{player.player_name}</div>
                        {player.is_host && <Crown className="inline h-3 w-3 ml-1" />}
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium mb-2">
                {currentPlayerObj?.player_name} is answering their secret question
              </p>
              <p className="text-muted-foreground">
                Listen to their answer - but you won't know what the question was!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Reveal choice phase
  if (phase === "reveal_choice") {
    const currentPlayerId = playerOrder[currentTurn];
    const currentPlayerObj = players.find(p => p.player_id === currentPlayerId);
    const shouldReveal = gameState.shouldReveal;
    const isMyChoice = currentPlayerId === currentPlayer.player_id;

    // If we can't find the current player, something is wrong with the game state
    if (!currentPlayerObj) {
      console.error("Current player not found in players array:", { currentPlayerId, playerOrder, players });
      return (
        <Card className="border-destructive">
          <CardContent className="p-8 text-center">
            <p className="text-destructive">Game state error. Please restart the game.</p>
            <Button onClick={resetGame} className="mt-4">Reset Game</Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">
            {shouldReveal ? "🎉 Question Revealed!" : "❓ Question Stays Secret"}
          </h1>
        </div>

        <Card className={shouldReveal ? "border-destructive" : "border-muted"}>
          <CardContent className="p-8 text-center">
            {shouldReveal ? (
              <div>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/20 flex items-center justify-center">
                  <Eye className="h-8 w-8 text-destructive" />
                </div>
                <p className="text-lg font-medium mb-4">The question is revealed to everyone!</p>
                {/* Show the actual question */}
                <div className="p-4 bg-destructive/10 rounded-lg">
                  <p className="font-medium">
                    {(Object.values(questionAssignments).find(
                      (assignment: any) => assignment.toPlayerId === currentPlayerId
                    ) as QuestionAssignment | undefined)?.question}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
                  <EyeOff className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium mb-4">The question remains a mystery!</p>
                {isMyChoice && (
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      {currentPlayerObj?.player_name}, you can continue to the next round or take a "shot" to find out what the question was!
                    </p>
                    <div className="flex gap-4 justify-center">
                      <Button onClick={nextTurn} variant="outline">
                        Continue Playing
                      </Button>
                      <Button onClick={() => {
                        // Reveal question as penalty for wanting to know
                        toast({
                          title: "Question Revealed!",
                          description: (Object.values(questionAssignments).find(
                            (assignment: any) => assignment.toPlayerId === currentPlayerId
                          ) as QuestionAssignment | undefined)?.question,
                          className: "bg-warning text-warning-foreground",
                        });
                        nextTurn();
                      }}>
                        Take Shot & Learn Question
                      </Button>
                    </div>
                  </div>
                )}
                {!isMyChoice && (
                  <p className="text-muted-foreground">
                    Waiting for {currentPlayerObj?.player_name} to decide...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {shouldReveal && (
          <div className="text-center">
            <Button onClick={nextTurn} size="lg">
              Continue to Next Turn
            </Button>
          </div>
        )}
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
            Thanks for playing Paranoia! Hope you enjoyed the mystery and suspense.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Game Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-primary/10 rounded-lg text-center">
                  <div className="text-2xl font-bold text-primary">{players.length}</div>
                  <div className="text-sm text-muted-foreground">Players</div>
                </div>
                <div className="p-4 bg-secondary/10 rounded-lg text-center">
                  <div className="text-2xl font-bold text-secondary">{players.length}</div>
                  <div className="text-sm text-muted-foreground">Questions Asked</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button onClick={resetGame} variant="outline">
            Back to Lobby
          </Button>
        </div>
      </div>
    );
  }

  return null;
}