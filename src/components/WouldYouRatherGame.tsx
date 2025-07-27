import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useTimer } from "@/hooks/useTimer";
import { ChevronRight, Users, RotateCcw, Trophy, Clock, ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";


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
  selected_character_id?: string;
}

interface Question {
  id: string;
  option_a: string;
  option_b: string;
  category: string;
  created_at?: string;
}

interface WouldYouRatherGameProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (room: Room) => void;
}

export const WouldYouRatherGame = ({ room, players, currentPlayer, onUpdateRoom }: WouldYouRatherGameProps) => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<Question[]>([]);
  const [questionQueue, setQuestionQueue] = useState<Question[]>([]);
  const [isPreloadingNext, setIsPreloadingNext] = useState(false);
  const [characterData, setCharacterData] = useState<{[key: string]: any}>({});
  const { toast } = useToast();

  const gameState = room.game_state || {};
  const showResults = gameState.showResults || false;
  const questionIndex = gameState.questionIndex || 0;

  // Timer for voting phase
  const votingTimer = useTimer({
    initialTime: 30,
    onTimeUp: () => {
      if (!hasVoted && !showResults && currentQuestion) {
        toast({
          title: "Time's up!",
          description: "Voting time expired - selecting random option",
          variant: "destructive",
        });
        // Auto-vote random option
        const randomOption = Math.random() < 0.5 ? "A" : "B";
        vote(randomOption);
      }
    }
  });

  // Timer management effects
  useEffect(() => {
    if (currentQuestion && !hasVoted && !showResults) {
      votingTimer.restart();
    } else {
      votingTimer.stop();
    }
  }, [currentQuestion, hasVoted, showResults]);

  useEffect(() => {
    loadCurrentQuestion();
    loadVotes();
    loadCharacterData();
    
    // Check if current player has voted
    const playerVoted = Object.keys(gameState.votes || {}).includes(currentPlayer.player_id);
    setHasVoted(playerVoted);
  }, [room.game_state, currentPlayer.player_id]);

  const loadCurrentQuestion = async () => {
    if (gameState.currentQuestion) {
      setCurrentQuestion(gameState.currentQuestion);
      return;
    }

    // Load a random question if none is set
    if (currentPlayer.is_host) {
      await loadNextQuestion();
    }
  };

  const loadVotes = async () => {
    try {
      const { data: votesData } = await supabase
        .from("game_votes")
        .select("player_id, vote")
        .eq("room_id", room.id)
        .eq("question_id", gameState.currentQuestion?.id || "");

      const votesMap: Record<string, string> = {};
      votesData?.forEach(vote => {
        votesMap[vote.player_id] = vote.vote;
      });
      setVotes(votesMap);
    } catch (error) {
      console.error("Error loading votes:", error);
    }
  };

  const loadCharacterData = async () => {
    const characterIds = players.map(p => p.selected_character_id).filter(Boolean);
    if (characterIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('cat_characters')
        .select('*')
        .in('id', characterIds);

      if (error) throw error;

      const characterMap = data?.reduce((acc, char) => {
        acc[char.id] = char;
        return acc;
      }, {} as any) || {};

      setCharacterData(characterMap);
    } catch (error) {
      console.error('Error loading character data:', error);
    }
  };

  const preloadMoreQuestions = async () => {
    if (isPreloadingNext) return;
    
    setIsPreloadingNext(true);
    try {
      const newQuestions = await loadQuestions();
      setQuestionQueue(prev => [...prev, ...newQuestions]);
    } catch (error) {
      console.error("Error preloading questions:", error);
    } finally {
      setIsPreloadingNext(false);
    }
  };

  const generateAIQuestions = async () => {
    try {
      const { data: customizationData } = await supabase
        .from("ai_chat_customizations")
        .select("customization_text")
        .eq("room_id", room.id)
        .single();

      const customization = customizationData?.customization_text || "a fun group of friends";

      const response = await supabase.functions.invoke('ai-chat', {
        body: {
          action: 'generate_would_you_rather',
          customization,
          players: players
        }
      });

      if (response.error) throw response.error;

      const aiResponse = JSON.parse(response.data.response);
      const generatedQuestions = aiResponse.questions.map((q: any, index: number) => ({
        id: crypto.randomUUID(),
        option_a: q.option_a,
        option_b: q.option_b,
        category: "AI Generated",
        created_at: new Date().toISOString()
      }));

      setAiQuestions(generatedQuestions);
      return generatedQuestions;
    } catch (error) {
      console.error("Error generating AI questions:", error);
      return [];
    }
  };

  const loadQuestions = async (): Promise<Question[]> => {
    let questions: Question[] = [];

    // First try to get room-specific questions
    const { data: roomQuestions, error: roomQuestionsError } = await supabase
      .from("room_questions")
      .select("question_data")
      .eq("room_id", room.room_code)
      .eq("game_type", "would_you_rather");

    if (!roomQuestionsError && roomQuestions && roomQuestions.length > 0) {
      questions = roomQuestions.map((rq: any) => ({
        id: crypto.randomUUID(),
        option_a: rq.question_data.option_a,
        option_b: rq.question_data.option_b,
        category: "Room Custom",
        created_at: new Date().toISOString()
      }));
    }

    // If no room questions, fall back to AI generation
    if (questions.length === 0) {
      const aiQuestions = await generateAIQuestions();
      if (aiQuestions.length > 0) {
        questions = aiQuestions;
      }
    }

    // If still no questions, get from database
    if (questions.length === 0) {
      const { data: questionsData, error: questionsError } = await supabase
        .from("would_you_rather_questions")
        .select("*");

      if (questionsError) throw questionsError;
      questions = questionsData || [];
    }

    return questions;
  };

  const loadNextQuestion = async () => {
    if (!currentPlayer.is_host) return;

    setIsLoading(true);
    try {
      let questions: Question[] = [];

      // First check if we have questions in the queue
      if (questionQueue.length > 0) {
        questions = [...questionQueue];
      } else {
        // Load fresh questions if queue is empty
        questions = await loadQuestions();
        setQuestionQueue(questions);
      }
      
      if (questions.length === 0) {
        // Add default questions as fallback
        const defaultQuestions = [
          {
            id: crypto.randomUUID(),
            option_a: "Have the ability to fly",
            option_b: "Have the ability to read minds",
            category: "default",
            created_at: new Date().toISOString()
          },
          {
            id: crypto.randomUUID(), 
            option_a: "Always be 10 minutes late",
            option_b: "Always be 20 minutes early",
            category: "default",
            created_at: new Date().toISOString()
          },
          {
            id: crypto.randomUUID(),
            option_a: "Live in a world without music",
            option_b: "Live in a world without movies",
            category: "default",
            created_at: new Date().toISOString()
          }
        ];
        questions.push(...defaultQuestions);
      }

      // Pick a random question and remove it from queue
      const randomIndex = Math.floor(Math.random() * questions.length);
      const randomQuestion = questions[randomIndex];
      const remainingQuestions = questions.filter((_, index) => index !== randomIndex);
      
      // Update question queue
      setQuestionQueue(remainingQuestions);

      // Update room with new question
      const newGameState = {
        ...gameState,
        currentQuestion: randomQuestion,
        questionIndex: questionIndex + 1,
        votes: {},
        showResults: false
      };

      const { error } = await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      if (error) throw error;

      // Clear votes for this question
      await supabase
        .from("game_votes")
        .delete()
        .eq("room_id", room.id);

      setCurrentQuestion(randomQuestion);
      setVotes({});
      setHasVoted(false);

      // Preload more questions if queue is getting low
      if (remainingQuestions.length < 3 && !isPreloadingNext) {
        preloadMoreQuestions();
      }
    } catch (error) {
      console.error("Error loading next question:", error);
      toast({
        title: "Error",
        description: "Failed to load next question",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const vote = async (option: "A" | "B") => {
    if (hasVoted || !currentQuestion) return;

    try {
      // Save vote to database
      const { error } = await supabase
        .from("game_votes")
        .insert({
          room_id: room.id,
          player_id: currentPlayer.player_id,
          question_id: currentQuestion.id,
          vote: option
        });

      if (error) throw error;

      // Update local state
      const newVotes = { ...votes, [currentPlayer.player_id]: option };
      setVotes(newVotes);
      setHasVoted(true);

      // Update room game state with vote
      const updatedGameState = {
        ...gameState,
        votes: newVotes
      };

      await supabase
        .from("rooms")
        .update({ game_state: updatedGameState })
        .eq("id", room.id);

      toast({
        title: "Vote Recorded!",
        description: `You chose Option ${option}`,
        className: "bg-success text-success-foreground",
      });

      // Auto-show results if everyone has voted
      if (Object.keys(newVotes).length === players.length) {
        setTimeout(async () => {
          await supabase
            .from("rooms")
            .update({ 
              game_state: { 
                ...gameState, 
                votes: newVotes, 
                showResults: true 
              } 
            })
            .eq("id", room.id);
        }, 1000);
      }
    } catch (error) {
      console.error("Error voting:", error);
      toast({
        title: "Error",
        description: "Failed to record vote",
        variant: "destructive",
      });
    }
  };

  const showResultsHandler = async () => {
    if (!currentPlayer.is_host) return;

    const updatedGameState = {
      ...gameState,
      showResults: true
    };

    const { error } = await supabase
      .from("rooms")
      .update({ game_state: updatedGameState })
      .eq("id", room.id);

    if (!error) {
      // Update the room state immediately
      const updatedRoom = {
        ...room,
        game_state: updatedGameState
      };
      onUpdateRoom(updatedRoom);
    }
  };

  const backToLobby = async () => {
    const newGameState = { phase: "lobby", currentQuestion: null, votes: {} };
    
    const { error } = await supabase
      .from("rooms")
      .update({
        game_state: newGameState
      })
      .eq("id", room.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to return to lobby",
        variant: "destructive",
      });
    } else {
      // Update the room state immediately
      const updatedRoom = {
        ...room,
        game_state: newGameState
      };
      onUpdateRoom(updatedRoom);
    }
  };

  const transferHostAndLeave = async () => {
    try {
      // Find next player to be host (first non-current player)
      const nextHost = players.find(p => p.player_id !== currentPlayer.player_id);
      
      if (nextHost) {
        // Update all players - make next player host, remove current player
        await supabase
          .from("players")
          .update({ is_host: true })
          .eq("room_id", room.id)
          .eq("player_id", nextHost.player_id);

        // Update room host
        await supabase
          .from("rooms")
          .update({ host_id: nextHost.player_id })
          .eq("id", room.id);
      }

      // Remove current player
      await supabase
        .from("players")
        .delete()
        .eq("room_id", room.id)
        .eq("player_id", currentPlayer.player_id);

      // If only one player left or no next host, deactivate room
      if (players.length <= 1 || !nextHost) {
        await supabase
          .from("rooms")
          .update({ is_active: false })
          .eq("id", room.id);
      }

      // Clear local storage
      localStorage.removeItem("puzzz_player_id");
      localStorage.removeItem("puzzz_player_name");

      toast({
        title: "Left Game",
        description: nextHost ? `${nextHost.player_name} is now the host` : "Game ended",
      });

      navigate("/");
    } catch (error) {
      console.error("Error leaving game:", error);
      toast({
        title: "Error",
        description: "Failed to leave game",
        variant: "destructive",
      });
    }
  };

  const playerLeave = async () => {
    try {
      // Remove current player
      await supabase
        .from("players")
        .delete()
        .eq("room_id", room.id)
        .eq("player_id", currentPlayer.player_id);

      // Clear local storage
      localStorage.removeItem("puzzz_player_id");
      localStorage.removeItem("puzzz_player_name");

      toast({
        title: "Left Game",
        description: "You have left the game",
      });

      navigate("/");
    } catch (error) {
      console.error("Error leaving game:", error);
      toast({
        title: "Error",
        description: "Failed to leave game",
        variant: "destructive",
      });
    }
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading question...</p>
        </div>
      </div>
    );
  }

  const optionAVotes = Object.values(votes).filter(vote => vote === "A").length;
  const optionBVotes = Object.values(votes).filter(vote => vote === "B").length;
  const totalVotes = optionAVotes + optionBVotes;
  const optionAPercentage = totalVotes > 0 ? (optionAVotes / totalVotes) * 100 : 0;
  const optionBPercentage = totalVotes > 0 ? (optionBVotes / totalVotes) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Host Controls */}
        {currentPlayer.is_host && (
          <div className="fixed top-4 left-16 z-50 flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Lobby
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Return to Lobby</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to return everyone to the lobby? This will end the current game.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm">Cancel</Button>
                    <Button onClick={backToLobby} size="sm">Yes, Return to Lobby</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Leave Game
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Leave Game</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to leave? Another player will become the new host.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm">Cancel</Button>
                    <Button onClick={transferHostAndLeave} variant="destructive" size="sm">Yes, Leave Game</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Regular Player Controls */}
        {!currentPlayer.is_host && (
          <div className="fixed top-4 left-16 z-50">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Leave Game
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Leave Game</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to leave the game?
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm">Cancel</Button>
                    <Button onClick={playerLeave} variant="destructive" size="sm">Yes, Leave Game</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Trophy className="h-6 w-6 text-warning" />
            <h1 className="text-3xl font-bold text-foreground">Would You Rather</h1>
            <Badge variant="outline" className="text-sm">
              Question {questionIndex}
            </Badge>
          </div>
          <div className="room-code text-lg">{room.room_code}</div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Users className="h-4 w-4" />
            <span className="text-muted-foreground">{players.length} players</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{totalVotes}/{players.length} voted</span>
          </div>
        </div>

        {/* Question Card */}
        <Card className="mb-8">
          <CardContent className="p-8">
         {/* Timer for voting */}
         {!hasVoted && !showResults && votingTimer.isRunning && (
           <div className="text-center space-y-2 mb-6">
             <div className="flex items-center justify-center gap-2 text-destructive">
               <Clock className="h-4 w-4" />
               <span className="font-mono text-lg">{votingTimer.formatTime}</span>
             </div>
             <Progress value={(votingTimer.time / 30) * 100} className="h-2 max-w-xs mx-auto" />
           </div>
         )}

         <div className="text-center mb-8">
           <h2 className="text-2xl font-bold text-foreground mb-4">
             Would you rather...
           </h2>
           {currentQuestion.category && currentQuestion.category !== "AI Generated" && (
             <Badge variant="outline" className="mb-4">
               {currentQuestion.category}
             </Badge>
           )}
         </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Option A */}
              <Card 
                className={`transition-all cursor-pointer ${
                  hasVoted && votes[currentPlayer.player_id] === "A" ? "ring-2 ring-game-option-a" : ""
                } ${hasVoted ? "opacity-75" : "hover:shadow-lg"}`}
                onClick={() => !hasVoted && vote("A")}
              >
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-game-option-a rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                      A
                    </div>
                    <p className="text-lg font-medium text-foreground">
                      {currentQuestion.option_a}
                    </p>
                    
                    {showResults && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{optionAVotes} votes</span>
                          <span>{Math.round(optionAPercentage)}%</span>
                        </div>
                        <Progress value={optionAPercentage} className="h-2" />
                         <div className="flex flex-wrap gap-1 justify-center">
                           {Object.entries(votes)
                             .filter(([_, vote]) => vote === "A")
                             .map(([playerId, _]) => {
                               const player = players.find(p => p.player_id === playerId);
                               const playerCharacter = player?.selected_character_id ? characterData[player.selected_character_id] : null;
                               return (
                                 <div key={playerId} className="flex items-center gap-1">
                                   {playerCharacter ? (
                                     <div className="w-5 h-5 rounded-full overflow-hidden bg-white">
                                          <img
                                            src={`/cats/${playerCharacter.icon_url}`}
                                            alt={playerCharacter.name}
                                            className="w-full h-full object-contain p-0.5"
                                            loading="eager"
                                          />
                                     </div>
                                   ) : null}
                                   <Badge variant="secondary" className="text-xs">
                                     {player?.player_name || playerId}
                                   </Badge>
                                 </div>
                               );
                             })}
                         </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Option B */}
              <Card 
                className={`transition-all cursor-pointer ${
                  hasVoted && votes[currentPlayer.player_id] === "B" ? "ring-2 ring-game-option-b" : ""
                } ${hasVoted ? "opacity-75" : "hover:shadow-lg"}`}
                onClick={() => !hasVoted && vote("B")}
              >
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-game-option-b rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                      B
                    </div>
                    <p className="text-lg font-medium text-foreground">
                      {currentQuestion.option_b}
                    </p>
                    
                    {showResults && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{optionBVotes} votes</span>
                          <span>{Math.round(optionBPercentage)}%</span>
                        </div>
                        <Progress value={optionBPercentage} className="h-2" />
                         <div className="flex flex-wrap gap-1 justify-center">
                           {Object.entries(votes)
                             .filter(([_, vote]) => vote === "B")
                             .map(([playerId, _]) => {
                               const player = players.find(p => p.player_id === playerId);
                               const playerCharacter = player?.selected_character_id ? characterData[player.selected_character_id] : null;
                               return (
                                 <div key={playerId} className="flex items-center gap-1">
                                   {playerCharacter ? (
                                     <div className="w-5 h-5 rounded-full overflow-hidden bg-white">
                                          <img
                                            src={`/cats/${playerCharacter.icon_url}`}
                                            alt={playerCharacter.name}
                                            className="w-full h-full object-contain p-0.5"
                                            loading="eager"
                                          />
                                     </div>
                                   ) : null}
                                   <Badge variant="secondary" className="text-xs">
                                     {player?.player_name || playerId}
                                   </Badge>
                                 </div>
                               );
                             })}
                         </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Voting Status */}
            {!showResults && (
              <div className="text-center mt-6">
                {hasVoted ? (
                  <p className="text-muted-foreground">
                    Waiting for other players to vote... ({totalVotes}/{players.length})
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Click an option to vote!
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {currentPlayer.is_host && (
            <>
              {!showResults && totalVotes > 0 && (
                <Button onClick={showResultsHandler} variant="outline">
                  Show Results
                </Button>
              )}
              
              {showResults && (
                <>
                  <Button onClick={generateAIQuestions} disabled={isLoading} variant="outline" className="gap-2">
                    {isLoading ? "Generating..." : "Generate New AI Questions"}
                  </Button>
                  <Button onClick={loadNextQuestion} disabled={isLoading} className="gap-2">
                    {isLoading ? (
                      "Loading..."
                    ) : (
                      <>
                        <ChevronRight className="h-4 w-4" />
                        Next Question
                      </>
                    )}
                  </Button>
                </>
              )}
            </>
          )}
          
          <Button variant="outline" onClick={backToLobby} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Back to Lobby
          </Button>
        </div>
      </div>
    </div>
  );
};