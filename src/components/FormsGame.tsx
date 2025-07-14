import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Users, RotateCcw, Crown, Trophy, AlertTriangle, FileText } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

interface FormsQuestion {
  id: string;
  question: string;
  category: string;
  is_controversial: boolean;
}

interface FormsGameProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (room: Room) => void;
}

export const FormsGame = ({ room, players, currentPlayer, onUpdateRoom }: FormsGameProps) => {
  const [questions, setQuestions] = useState<FormsQuestion[]>([]);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const gameState = room.game_state || {};
  const showResults = gameState.showResults || false;
  const gameQuestions = gameState.questions || [];
  const allResponses = gameState.responses || {};
  const isEndGame = gameState.phase === "endGame";

  useEffect(() => {
    if (gameQuestions.length > 0) {
      setQuestions(gameQuestions);
      setIsLoading(false);
    } else if (currentPlayer.is_host) {
      loadQuestions();
    }
    
    // Load current player's responses
    const playerResponses = allResponses[currentPlayer.player_id] || {};
    setResponses(playerResponses);
  }, [room.game_state, currentPlayer.player_id]);

  const loadQuestions = async () => {
    if (!currentPlayer.is_host) return;

    setIsLoading(true);
    try {
      // Get random 8 questions from the database
      const { data: questionsData } = await supabase
        .from("forms_questions")
        .select("*");

      if (!questionsData || questionsData.length === 0) {
        toast({
          title: "No Questions Available",
          description: "No forms questions found in the database",
          variant: "destructive",
        });
        return;
      }

      // Shuffle and take 8 questions
      const shuffled = questionsData.sort(() => 0.5 - Math.random());
      const selectedQuestions = shuffled.slice(0, 8);

      // Update room with questions
      const newGameState = {
        ...gameState,
        questions: selectedQuestions,
        responses: {},
        showResults: false,
        phase: "playing"
      };

      const { error } = await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      if (error) throw error;

      setQuestions(selectedQuestions);
    } catch (error) {
      console.error("Error loading questions:", error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponseChange = (questionId: string, selectedPlayerId: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: selectedPlayerId
    }));
  };

  const submitResponses = async () => {
    if (Object.keys(responses).length !== questions.length) {
      toast({
        title: "Incomplete",
        description: "Please answer all questions before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Save responses to database
      const responseInserts = Object.entries(responses).map(([questionId, selectedPlayerId]) => ({
        room_id: room.id,
        question_id: questionId,
        player_id: currentPlayer.player_id,
        selected_player_id: selectedPlayerId
      }));

      const { error: insertError } = await supabase
        .from("forms_responses")
        .insert(responseInserts);

      if (insertError) throw insertError;

      // Update room game state with responses
      const updatedResponses = {
        ...allResponses,
        [currentPlayer.player_id]: responses
      };

      const updatedGameState = {
        ...gameState,
        responses: updatedResponses
      };

      const { error } = await supabase
        .from("rooms")
        .update({ game_state: updatedGameState })
        .eq("id", room.id);

      if (error) throw error;

      toast({
        title: "Responses Submitted!",
        description: "Your answers have been recorded",
        className: "bg-success text-success-foreground",
      });

      // Check if everyone has submitted
      if (Object.keys(updatedResponses).length === players.length && currentPlayer.is_host) {
        setTimeout(async () => {
          const resultsGameState = {
            ...gameState,
            responses: updatedResponses,
            showResults: true
          };

          await supabase
            .from("rooms")
            .update({ game_state: resultsGameState })
            .eq("id", room.id);
        }, 1000);
      }
    } catch (error) {
      console.error("Error submitting responses:", error);
      toast({
        title: "Error",
        description: "Failed to submit responses",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const backToLobby = async () => {
    if (!currentPlayer.is_host) return;

    const { error } = await supabase
      .from("rooms")
      .update({
        game_state: { phase: "lobby" }
      })
      .eq("id", room.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to return to lobby",
        variant: "destructive",
      });
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.player_id === playerId);
    return player?.player_name || "Unknown";
  };

  const calculateResults = () => {
    const results: Record<string, Record<string, number>> = {};
    
    questions.forEach(question => {
      results[question.id] = {};
      players.forEach(player => {
        results[question.id][player.player_id] = 0;
      });
    });

    Object.values(allResponses).forEach((playerResponses: any) => {
      Object.entries(playerResponses).forEach(([questionId, selectedPlayerId]) => {
        if (results[questionId] && results[questionId][selectedPlayerId as string] !== undefined) {
          results[questionId][selectedPlayerId as string]++;
        }
      });
    });

    return results;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  const hasSubmitted = Object.keys(allResponses).includes(currentPlayer.player_id);
  const submittedCount = Object.keys(allResponses).length;
  const isComplete = Object.keys(responses).length === questions.length;

  // Results View
  if (showResults) {
    const results = calculateResults();

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-4 mb-4">
              <FileText className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold text-foreground">Forms Game Results</h1>
            </div>
            <div className="room-code text-lg">{room.room_code}</div>
            <p className="text-muted-foreground mt-2">
              {players.length} players completed the survey
            </p>
          </div>

          {/* Results */}
          <div className="space-y-6 mb-8">
            {questions.map((question, index) => (
              <Card key={question.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span>Question {index + 1}</span>
                      {question.is_controversial && (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                    <Badge variant="outline">{question.category}</Badge>
                  </CardTitle>
                  <p className="text-foreground font-medium">{question.question}</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {players
                      .sort((a, b) => (results[question.id][b.player_id] || 0) - (results[question.id][a.player_id] || 0))
                      .map((player) => {
                        const votes = results[question.id][player.player_id] || 0;
                        const percentage = players.length > 0 ? (votes / players.length) * 100 : 0;
                        
                        return (
                          <div key={player.player_id} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                                  {player.player_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="font-medium">{player.player_name}</span>
                                {player.is_host && <Crown className="h-4 w-4 text-warning" />}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {votes} vote{votes !== 1 ? 's' : ''}
                                </span>
                                <span className="text-sm font-medium">
                                  {Math.round(percentage)}%
                                </span>
                              </div>
                            </div>
                            <Progress value={percentage} className="h-2" />
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Host Controls */}
          {currentPlayer.is_host && (
            <div className="flex justify-center">
              <Button
                onClick={backToLobby}
                className="gap-2"
                size="lg"
              >
                <RotateCcw className="h-4 w-4" />
                Back to Lobby
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Game Form View
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Forms Game</h1>
          </div>
          <div className="room-code text-lg">{room.room_code}</div>
          <p className="text-muted-foreground mt-2">
            Answer all questions by selecting the player you think fits best
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">Progress</span>
            <span className="text-sm text-muted-foreground">
              {Object.keys(responses).length} / {questions.length}
            </span>
          </div>
          <Progress 
            value={(Object.keys(responses).length / questions.length) * 100} 
            className="h-2" 
          />
        </div>

        {/* Submission Status */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm">Submissions: {submittedCount} / {players.length}</span>
              </div>
              {hasSubmitted && (
                <Badge className="bg-success text-success-foreground gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Submitted
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Questions Form */}
        {!hasSubmitted ? (
          <div className="space-y-6 mb-8">
            {questions.map((question, index) => (
              <Card key={question.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span>Question {index + 1}</span>
                      {question.is_controversial && (
                        <AlertTriangle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                    <Badge variant="outline">{question.category}</Badge>
                  </CardTitle>
                  <p className="text-foreground font-medium">{question.question}</p>
                </CardHeader>
                <CardContent>
                  <Select
                    value={responses[question.id] || ""}
                    onValueChange={(value) => handleResponseChange(question.id, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a player..." />
                    </SelectTrigger>
                    <SelectContent>
                      {players.map((player) => (
                        <SelectItem key={player.player_id} value={player.player_id}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-semibold">
                              {player.player_name.charAt(0).toUpperCase()}
                            </div>
                            {player.player_name}
                            {player.is_host && <Crown className="h-3 w-3 text-warning ml-1" />}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            ))}

            {/* Submit Button */}
            <div className="flex justify-center">
              <Button
                onClick={submitResponses}
                disabled={!isComplete || isSubmitting}
                size="lg"
                className="gap-2"
              >
                {isSubmitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Submit Responses
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <CheckCircle className="h-16 w-16 text-success mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Responses Submitted!</h3>
              <p className="text-muted-foreground mb-4">
                Waiting for other players to complete their responses...
              </p>
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};