import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Vote, Trophy, Clock } from "lucide-react";

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

interface WouldYouRatherHostScreenProps {
  room: Room;
  players: Player[];
}

interface Question {
  id: string;
  option_a: string;
  option_b: string;
}

interface Vote {
  id: string;
  player_id: string;
  vote: string;
  voted_at: string;
}

export const WouldYouRatherHostScreen = ({ room, players }: WouldYouRatherHostScreenProps) => {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [roundNumber, setRoundNumber] = useState(1);
  
  const gameState = room.game_state || {};
  const phase = gameState.phase || "waiting";

  useEffect(() => {
    // Load current question
    if (gameState.currentQuestionId) {
      const loadQuestion = async () => {
        try {
          const { data, error } = await supabase
            .from("would_you_rather_questions")
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

    // Load votes for current question
    if (gameState.currentQuestionId) {
      const loadVotes = async () => {
        try {
          const { data, error } = await supabase
            .from("game_votes")
            .select("*")
            .eq("room_id", room.id)
            .eq("question_id", gameState.currentQuestionId);

          if (error) {
            console.error("Error loading votes:", error);
          } else {
            setVotes(data || []);
          }
        } catch (error) {
          console.error("Error loading votes:", error);
        }
      };

      loadVotes();
    }

    // Set round number from game state
    if (gameState.roundNumber) {
      setRoundNumber(gameState.roundNumber);
    }

    // Subscribe to vote changes
    const channel = supabase
      .channel(`host-wyr-${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_votes',
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          console.log('Vote update:', payload);
          // Reload votes when changes occur
          if (gameState.currentQuestionId) {
            supabase
              .from("game_votes")
              .select("*")
              .eq("room_id", room.id)
              .eq("question_id", gameState.currentQuestionId)
              .then(({ data }) => {
                if (data) setVotes(data);
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, gameState.currentQuestionId, gameState.roundNumber]);

  const optionAVotes = votes.filter(v => v.vote === "option_a").length;
  const optionBVotes = votes.filter(v => v.vote === "option_b").length;
  const totalVotes = votes.length;
  const totalPlayers = players.length;

  const optionAPercentage = totalVotes > 0 ? (optionAVotes / totalVotes) * 100 : 0;
  const optionBPercentage = totalVotes > 0 ? (optionBVotes / totalVotes) * 100 : 0;

  if (phase === "waiting" || !currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-8">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-primary mb-4">Would You Rather</h1>
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

  if (phase === "results" || phase === "showing_results") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 p-8">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-primary mb-4">Round {roundNumber} Results</h1>
          <div className="text-2xl text-muted-foreground">Room: {room.room_code}</div>
        </div>

        <div className="max-w-6xl mx-auto">
          {currentQuestion && (
            <Card className="bg-card/90 backdrop-blur border-2 shadow-2xl mb-8">
              <CardContent className="p-8 text-center">
                <div className="text-2xl font-medium text-muted-foreground mb-8">
                  "Would you rather..."
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Option A Results */}
                  <div className="space-y-4">
                    <div className="p-6 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-lg border-2 border-blue-400">
                      <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-4">Option A</h3>
                      <p className="text-xl mb-4">{currentQuestion.option_a}</p>
                      <div className="flex items-center justify-center space-x-4">
                        <Trophy className="h-8 w-8 text-blue-600" />
                        <span className="text-4xl font-bold text-blue-700 dark:text-blue-300">
                          {optionAVotes}
                        </span>
                        <span className="text-xl text-muted-foreground">
                          ({Math.round(optionAPercentage)}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Option B Results */}
                  <div className="space-y-4">
                    <div className="p-6 bg-gradient-to-r from-purple-500/20 to-purple-600/20 rounded-lg border-2 border-purple-400">
                      <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-4">Option B</h3>
                      <p className="text-xl mb-4">{currentQuestion.option_b}</p>
                      <div className="flex items-center justify-center space-x-4">
                        <Trophy className="h-8 w-8 text-purple-600" />
                        <span className="text-4xl font-bold text-purple-700 dark:text-purple-300">
                          {optionBVotes}
                        </span>
                        <span className="text-xl text-muted-foreground">
                          ({Math.round(optionBPercentage)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-center space-x-8 text-xl text-muted-foreground">
                  <div className="flex items-center space-x-2">
                    <Users className="h-6 w-6" />
                    <span>{totalVotes} / {totalPlayers} voted</span>
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-6xl font-bold text-primary mb-4">Would You Rather</h1>
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
            <CardContent className="p-8 text-center">
              <div className="text-3xl font-medium text-muted-foreground mb-8">
                "Would you rather..."
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Option A */}
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-r from-blue-500/10 to-blue-600/10 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-4">Option A</h3>
                    <p className="text-xl">{currentQuestion.option_a}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">Votes: {optionAVotes}</span>
                      <Badge variant="outline" className="text-blue-700 border-blue-300">
                        {Math.round(optionAPercentage)}%
                      </Badge>
                    </div>
                    <Progress value={optionAPercentage} className="h-4 bg-blue-100" />
                  </div>
                </div>

                {/* Option B */}
                <div className="space-y-4">
                  <div className="p-6 bg-gradient-to-r from-purple-500/10 to-purple-600/10 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h3 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-4">Option B</h3>
                    <p className="text-xl">{currentQuestion.option_b}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-medium">Votes: {optionBVotes}</span>
                      <Badge variant="outline" className="text-purple-700 border-purple-300">
                        {Math.round(optionBPercentage)}%
                      </Badge>
                    </div>
                    <Progress value={optionBPercentage} className="h-4 bg-purple-100" />
                  </div>
                </div>
              </div>

              {/* Voting Progress */}
              <div className="mt-8 flex items-center justify-center space-x-8 text-xl">
                <div className="flex items-center space-x-2">
                  <Vote className="h-6 w-6 text-primary" />
                  <span>{totalVotes} / {totalPlayers} voted</span>
                </div>
                <Progress value={(totalVotes / totalPlayers) * 100} className="w-48 h-3" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};