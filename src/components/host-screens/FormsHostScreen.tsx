import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, FileText, Trophy, Clock, Target } from "lucide-react";

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

interface FormsHostScreenProps {
  room: Room;
  players: Player[];
}

interface FormsQuestion {
  id: string;
  question: string;
  category?: string;
  is_controversial?: boolean;
}

interface FormsResponse {
  id: string;
  player_id: string;
  question_id: string;
  selected_player_id: string;
  responded_at: string;
}

export const FormsHostScreen = ({ room, players }: FormsHostScreenProps) => {
  const [currentQuestion, setCurrentQuestion] = useState<FormsQuestion | null>(null);
  const [responses, setResponses] = useState<FormsResponse[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);
  
  const gameState = room.game_state || {};
  const phase = gameState.phase || "waiting";

  useEffect(() => {
    // Load current question
    if (gameState.currentQuestionId) {
      const loadQuestion = async () => {
        try {
          const { data, error } = await supabase
            .from("forms_questions")
            .select("*")
            .eq("id", gameState.currentQuestionId)
            .single();

          if (error) {
            console.error("Error loading question:", error);
          } else {
            setCurrentQuestion(data);
          }
        } catch (error) {
          console.error("Error loading question:", error);
        }
      };

      loadQuestion();
    }

    // Load responses for current question
    if (gameState.currentQuestionId) {
      const loadResponses = async () => {
        try {
          const { data, error } = await supabase
            .from("forms_responses")
            .select("*")
            .eq("room_id", room.id)
            .eq("question_id", gameState.currentQuestionId);

          if (error) {
            console.error("Error loading responses:", error);
          } else {
            setResponses(data || []);
          }
        } catch (error) {
          console.error("Error loading responses:", error);
        }
      };

      loadResponses();
    }

    // Set round number from game state
    if (gameState.roundNumber) {
      setRoundNumber(gameState.roundNumber);
    }

    // Subscribe to response changes
    const channel = supabase
      .channel(`host-forms-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'forms_responses',
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          console.log('Response update:', payload);
          // Reload responses when changes occur
          if (gameState.currentQuestionId) {
            supabase
              .from("forms_responses")
              .select("*")
              .eq("room_id", room.id)
              .eq("question_id", gameState.currentQuestionId)
              .then(({ data }) => {
                if (data) setResponses(data);
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, gameState.currentQuestionId, gameState.roundNumber]);

  const getPlayerName = (playerId: string) => {
    const player = players.find(p => p.player_id === playerId);
    return player ? player.player_name : "Unknown Player";
  };

  const getResponseCounts = () => {
    const counts: { [playerId: string]: number } = {};
    responses.forEach(response => {
      counts[response.selected_player_id] = (counts[response.selected_player_id] || 0) + 1;
    });
    return counts;
  };

  const totalResponses = responses.length;
  const totalPlayers = players.length;
  const responseCounts = getResponseCounts();

  if (phase === "waiting" || !currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 p-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-primary mb-4">Forms Game</h1>
          <div className="flex items-center justify-center space-x-4 text-2xl text-muted-foreground mb-8">
            <span>Room: {room.room_code}</span>
            <span>•</span>
            <span>Round {roundNumber}</span>
          </div>
          <div className="flex items-center justify-center space-y-4">
            <Clock className="h-16 w-16 animate-pulse text-primary" />
          </div>
          <p className="text-3xl text-muted-foreground mt-8">
            Preparing next question...
          </p>
        </div>
      </div>
    );
  }

  if (phase === "results") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-green-50 dark:from-yellow-950 dark:to-green-950 p-8">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-primary mb-4">Round {roundNumber} Results</h1>
          <div className="text-2xl text-muted-foreground">Room: {room.room_code}</div>
        </div>

        <div className="max-w-6xl mx-auto">
          {currentQuestion && (
            <Card className="bg-card/90 backdrop-blur border-2 shadow-2xl mb-8">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center space-x-4 mb-4">
                    <FileText className="h-8 w-8 text-primary" />
                    <h2 className="text-3xl font-bold">Question Results</h2>
                  </div>
                  
                  <div className="p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-green-200 dark:border-green-800 mb-8">
                    <p className="text-2xl font-medium">{currentQuestion.question}</p>
                    {currentQuestion.is_controversial && (
                      <Badge variant="outline" className="mt-4 text-orange-600 border-orange-300">
                        Controversial
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {players.map((player, index) => {
                    const count = responseCounts[player.player_id] || 0;
                    const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                    
                    return (
                      <div 
                        key={player.id}
                        className="space-y-3 animate-fade-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div className="p-4 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">{player.player_name}</span>
                            <div className="flex items-center space-x-2">
                              <Trophy className="h-4 w-4 text-primary" />
                              <Badge variant="outline">{count}</Badge>
                            </div>
                          </div>
                          
                          <Progress value={percentage} className="h-3" />
                          
                          <div className="text-center mt-2">
                            <span className="text-sm text-muted-foreground">
                              {Math.round(percentage)}% of votes
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-8 flex items-center justify-center space-x-8 text-xl text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Users className="h-6 w-6" />
                    <span>{totalResponses} / {totalPlayers} responded</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-6xl font-bold text-primary mb-4">Forms Game</h1>
        <div className="flex items-center justify-center space-x-4 text-2xl text-muted-foreground">
          <span>Room: {room.room_code}</span>
          <span>•</span>
          <span>Round {roundNumber}</span>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Question Display */}
        {currentQuestion && (
          <Card className="bg-card/90 backdrop-blur border-2 shadow-2xl mb-8">
            <CardContent className="p-8">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <FileText className="h-8 w-8 text-primary" />
                  <h2 className="text-3xl font-bold">Current Question</h2>
                </div>
                
                <div className="p-6 bg-gradient-to-r from-green-500/10 to-blue-500/10 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-2xl font-medium">{currentQuestion.question}</p>
                  {currentQuestion.is_controversial && (
                    <Badge variant="outline" className="mt-4 text-orange-600 border-orange-300">
                      Controversial
                    </Badge>
                  )}
                </div>
              </div>

              {/* Live Response Tracking */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {players.map((player, index) => {
                  const count = responseCounts[player.player_id] || 0;
                  const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                  const hasResponded = responses.some(r => r.player_id === player.player_id);
                  
                  return (
                    <div 
                      key={player.id}
                      className="space-y-3 animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className={`p-4 rounded-lg border transition-all ${
                        hasResponded 
                          ? "bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-300" 
                          : "bg-gradient-to-r from-gray-500/5 to-gray-600/5 border-gray-300"
                      }`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{player.player_name}</span>
                          <div className="flex items-center space-x-2">
                            <Target className={`h-4 w-4 ${hasResponded ? "text-green-600" : "text-gray-400"}`} />
                            <Badge variant="outline" className={count > 0 ? "text-primary" : "text-muted-foreground"}>
                              {count}
                            </Badge>
                          </div>
                        </div>
                        
                        <Progress value={percentage} className="h-3" />
                        
                        <div className="text-center mt-2">
                          <span className="text-sm text-muted-foreground">
                            {Math.round(percentage)}% of votes
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Response Progress */}
              <div className="mt-8 flex items-center justify-center space-x-8 text-xl">
                <div className="flex items-center space-x-2">
                  <Users className="h-6 w-6 text-primary" />
                  <span>{totalResponses} / {totalPlayers} responded</span>
                </div>
                <Progress value={(totalResponses / totalPlayers) * 100} className="w-48 h-3" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};