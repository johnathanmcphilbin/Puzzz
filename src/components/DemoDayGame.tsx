import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Crown, Users, CheckCircle, XCircle, Loader2, MessageSquare, Send, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getCatImageUrl } from '@/assets/catImages';
import { useToast } from '@/hooks/use-toast';

interface Question {
  id: string;
  image: string;
  options: string[];
  correctAnswer: string;
}

interface Player {
  id: string;
  player_id: string;
  player_name: string;
  is_host: boolean;
  room_id: string;
  joined_at: string;
  selected_character_id?: string;
}

interface CatCharacter {
  id: string;
  name: string;
  icon_url: string | null;
}

interface Room {
  id: string;
  room_code: string;
  name: string;
  host_id: string;
  current_game: string;
  game_state: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DemoDayGameProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (updates: Partial<Room>) => Promise<void>;
}

// Single Tim question with specific options
const timQuestion: Question = {
  id: "tim",
  image: '/6.png',
  options: ['Tim', 'Patrick Walsh', 'Lucy Daly', 'Lynetta Wang'],
  correctAnswer: 'Tim'
};

type GamePhase = 'waiting' | 'question' | 'results' | 'ai-chat' | 'finished';

interface AIResponse {
  response: string;
  playerName: string;
  timestamp: string;
}

export const DemoDayGame: React.FC<DemoDayGameProps> = ({
  room,
  players,
  currentPlayer,
  onUpdateRoom
}) => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [playerAnswers, setPlayerAnswers] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [characterData, setCharacterData] = useState<Record<string, CatCharacter>>({});
  const [showResults, setShowResults] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const { toast } = useToast();

  const isHost = currentPlayer.is_host;
  const allPlayersAnswered = Object.keys(playerAnswers).length === players.length;

  // Sync game state from room
  useEffect(() => {
    if (room.game_state) {
      if (room.game_state.gamePhase) {
        setGamePhase(room.game_state.gamePhase);
      }
      if (room.game_state.scores) {
        setScores(room.game_state.scores);
      }
      if (room.game_state.playerAnswers) {
        setPlayerAnswers(room.game_state.playerAnswers);
      }
      if (room.game_state.showResults) {
        setShowResults(room.game_state.showResults);
      }
      if (room.game_state.aiResponse) {
        setAiResponse(room.game_state.aiResponse);
      }
    }
  }, [room.game_state]);

  // Load cat characters
  useEffect(() => {
    const loadCharacters = async () => {
      try {
        const { data, error } = await supabase
          .from('cat_characters')
          .select('*');
        
        if (error) {
          console.error('Error loading characters:', error);
          return;
        }

        const charactersMap: Record<string, CatCharacter> = {};
        data?.forEach((char) => {
          if (char.icon_url) {
            charactersMap[char.id] = char as CatCharacter;
          }
        });
        setCharacterData(charactersMap);
      } catch (error) {
        console.error('Error loading characters:', error);
      }
    };

    loadCharacters();
  }, []);

  // Auto-show results when all players answered (host only)
  useEffect(() => {
    if (isHost && gamePhase === 'question' && allPlayersAnswered && Object.keys(playerAnswers).length > 0) {
      setTimeout(() => handleShowResults(), 500);
    }
  }, [playerAnswers, gamePhase, allPlayersAnswered, isHost]);

  const updateGameState = useCallback(async (updates: any) => {
    await onUpdateRoom({
      game_state: {
        ...room.game_state,
        ...updates
      }
    });
  }, [onUpdateRoom, room.game_state]);

  const startGame = async () => {
    const initialState = {
      phase: 'question',
      gamePhase: 'question',
      scores: {},
      playerAnswers: {},
      showResults: false,
      aiResponse: null
    };
    
    await updateGameState(initialState);
  };

  const handleAnswerSelect = async (answer: string) => {
    if (selectedAnswer || gamePhase !== 'question') return;
    
    setSelectedAnswer(answer);
    const newAnswers = { ...playerAnswers, [currentPlayer.player_id]: answer };
    
    await updateGameState({
      playerAnswers: newAnswers
    });
  };

  const handleShowResults = async () => {
    // Calculate scores
    const newScores = { ...scores };
    Object.entries(playerAnswers).forEach(([playerId, answer]) => {
      if (answer === timQuestion.correctAnswer) {
        newScores[playerId] = (newScores[playerId] || 0) + 1;
      }
    });
    
    await updateGameState({
      gamePhase: 'results',
      scores: newScores,
      showResults: true
    });

    // Auto-advance to AI chat after 3 seconds
    setTimeout(() => {
      if (isHost) {
        updateGameState({
          gamePhase: 'ai-chat'
        });
      }
    }, 3000);
  };

  const generateAIResponse = async () => {
    if (!aiPrompt.trim() || isGeneratingAI) return;

    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-demo-response', {
        body: { 
          prompt: aiPrompt.trim(),
          playerName: currentPlayer.player_name,
          wasCorrect: selectedAnswer === timQuestion.correctAnswer
        }
      });

      if (error) throw error;

      if (data.success) {
        let aiMessage = data.response;
        
        // If player got the answer wrong, add the harsh response
        if (selectedAnswer !== timQuestion.correctAnswer) {
          aiMessage = "There are droids smarter than this Eejit! " + aiMessage;
        }

        const response: AIResponse = {
          response: aiMessage,
          playerName: currentPlayer.player_name,
          timestamp: data.timestamp
        };

        await updateGameState({
          aiResponse: response
        });

        setAiPrompt('');
        toast({
          title: "AI Response Generated!",
          description: selectedAnswer === timQuestion.correctAnswer 
            ? "Tim has responded to your message"
            : "The AI has some harsh words for you!",
          className: selectedAnswer === timQuestion.correctAnswer 
            ? "bg-success text-success-foreground"
            : "bg-destructive text-destructive-foreground",
        });
      } else {
        throw new Error(data.error || 'Failed to generate AI response');
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      // Fallback response
      const fallbackMessage = selectedAnswer === timQuestion.correctAnswer 
        ? "Great job identifying me! Thanks for playing!"
        : "There are droids smarter than this Eejit! Better luck next time!";
        
      const response: AIResponse = {
        response: fallbackMessage,
        playerName: currentPlayer.player_name,
        timestamp: new Date().toISOString()
      };

      await updateGameState({
        aiResponse: response
      });

      toast({
        title: "Error",
        description: "Used fallback response due to AI error.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const resetGame = async () => {
    await updateGameState({
      phase: 'lobby',
      gamePhase: 'waiting',
      scores: {},
      playerAnswers: {},
      showResults: false,
      aiResponse: null
    });
  };

  const finishGame = async () => {
    await updateGameState({
      gamePhase: 'finished'
    });
  };

  if (gamePhase === 'waiting') {
    return (
      <div className="min-h-screen gradient-bg p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <h1 className="text-5xl font-bold mb-4 text-primary">Demo Day</h1>
            <h2 className="text-2xl mb-6 text-muted-foreground">Interactive Team Quiz</h2>
            
            <Card className="mb-6 border-2">
              <CardContent className="p-8">
                <div className="flex items-center justify-center gap-4 mb-6">
                  <Users className="h-8 w-8 text-primary" />
                  <span className="text-2xl font-semibold">{players.length} Players Ready</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {players.map((player) => (
                    <div key={player.id} className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                      {player.is_host && <Crown className="h-5 w-5 text-yellow-500" />}
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                        {player.player_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{player.player_name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {isHost && (
              <Button onClick={startGame} size="lg" className="text-xl px-12 py-6 animate-scale-in">
                <Sparkles className="h-6 w-6 mr-3" />
                Start Demo Day Experience
              </Button>
            )}
            
            {!isHost && (
              <p className="text-lg text-muted-foreground animate-pulse">
                Waiting for host to start the demo day experience...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'finished') {
    const sortedScores = Object.entries(scores)
      .map(([playerId, score]) => ({
        player: players.find(p => p.player_id === playerId),
        score
      }))
      .sort((a, b) => b.score - a.score);

    return (
      <div className="min-h-screen gradient-bg p-6">
        <div className="max-w-4xl mx-auto text-center animate-fade-in">
          <h1 className="text-5xl font-bold mb-4 text-primary">Demo Day Complete! 🎉</h1>
          <h2 className="text-2xl mb-8 text-muted-foreground">Final Results</h2>
          
          <Card className="mb-8 border-2">
            <CardContent className="p-8">
              <h3 className="text-2xl font-semibold mb-6">Leaderboard</h3>
              <div className="space-y-4">
                {sortedScores.map((item, index) => (
                  <div key={item.player?.player_id} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold">{index + 1}.</span>
                      {index === 0 && <Crown className="h-6 w-6 text-yellow-500" />}
                      <span className="text-lg font-medium">{item.player?.player_name}</span>
                    </div>
                    <span className="text-xl font-bold">{item.score}/1</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {isHost && (
            <Button onClick={resetGame} size="lg" className="text-xl px-12 py-6">
              Play Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (gamePhase === 'ai-chat') {
    return (
      <div className="min-h-screen gradient-bg p-6">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-primary">Chat with Tim! 🤖</h1>
            <p className="text-lg text-muted-foreground">
              Ask Tim anything or make a comment about the demo day experience
            </p>
          </div>

          <Card className="mb-6 border-2">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold">
                  T
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Tim</h3>
                  <p className="text-muted-foreground">AI-powered team member</p>
                </div>
              </div>

              {aiResponse && (
                <div className="mb-6 p-4 bg-muted rounded-lg animate-scale-in">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-primary mt-1" />
                    <div>
                      <p className="font-medium text-sm text-muted-foreground mb-1">
                        Tim responded to {aiResponse.playerName}:
                      </p>
                      <p className="text-lg">{aiResponse.response}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <Input
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Type your message to Tim..."
                  onKeyPress={(e) => e.key === 'Enter' && generateAIResponse()}
                  disabled={isGeneratingAI}
                  className="text-lg"
                />
                <Button 
                  onClick={generateAIResponse} 
                  disabled={!aiPrompt.trim() || isGeneratingAI}
                  size="lg"
                >
                  {isGeneratingAI ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            {isHost && (
              <Button onClick={finishGame} size="lg" variant="outline">
                Finish Demo Day
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-4 text-primary">Demo Day Quiz</h1>
          <div className="text-lg mb-6">
            Who is this person?
          </div>
        </div>

        <Card className="mb-6 border-2">
          <CardContent className="p-8 text-center">
            <img 
              src={timQuestion.image} 
              alt="Demo Day quiz - identify this team member" 
              className="w-80 h-80 object-contain rounded-lg mx-auto mb-8 bg-white/10 animate-fade-in shadow-lg"
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              {timQuestion.options.map((option: string, index: number) => {
                const isCorrect = option === timQuestion.correctAnswer;
                const isSelected = selectedAnswer === option;
                const showResultsNow = showResults;
                
                let buttonVariant: "default" | "destructive" | "outline" | "secondary" = "outline";
                let buttonClassName = "p-6 text-left h-auto transition-all duration-500 text-lg font-medium";
                
                if (showResultsNow) {
                  if (isCorrect) {
                    buttonVariant = "default";
                    buttonClassName += " bg-green-600 hover:bg-green-600 text-white border-green-600 animate-pulse scale-105";
                  } else if (isSelected) {
                    buttonVariant = "destructive";
                    buttonClassName += " bg-red-600 hover:bg-red-600 text-white border-red-600 scale-95";
                  } else {
                    buttonClassName += " opacity-40 scale-95";
                  }
                } else if (isSelected) {
                  buttonVariant = "default";
                  buttonClassName += " bg-primary text-primary-foreground scale-105";
                }

                return (
                  <Button
                    key={index}
                    variant={buttonVariant}
                    size="lg"
                    onClick={() => handleAnswerSelect(option)}
                    disabled={selectedAnswer !== null || showResultsNow}
                    className={buttonClassName}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>{option}</span>
                      {showResultsNow && isCorrect && (
                        <CheckCircle className="h-6 w-6 ml-3" />
                      )}
                      {showResultsNow && isSelected && !isCorrect && (
                        <XCircle className="h-6 w-6 ml-3" />
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>

            {showResults && (
              <div className="mt-8 p-8 rounded-xl border-2 bg-gradient-to-r from-background/90 to-background/95 backdrop-blur-sm animate-scale-in shadow-2xl">
                <div className="text-center">
                  {selectedAnswer === timQuestion.correctAnswer ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-4">
                        <div className="p-3 rounded-full bg-green-100">
                          <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-green-600">
                        Correct! It is Tim! 🎉
                      </p>
                      <p className="text-xl text-muted-foreground">
                        You got it right! Great job!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-4">
                        <div className="p-3 rounded-full bg-red-100">
                          <XCircle className="h-10 w-10 text-red-600" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-red-600">
                        No! It's not {selectedAnswer}
                      </p>
                      <p className="text-2xl font-semibold text-foreground">
                        It was Tim!
                      </p>
                    </div>
                  )}
                  <div className="mt-6 flex items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-lg">Moving to AI chat experience...</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4 text-lg">Live Scores</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {players.map((player) => {
                const playerCharacter = player.selected_character_id ? characterData[player.selected_character_id] : null;
                return (
                  <div key={player.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      {playerCharacter ? (
                        <img
                          src={getCatImageUrl(playerCharacter.icon_url)}
                          alt={playerCharacter.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                          {player.player_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium">{player.player_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">{scores[player.player_id] || 0}</span>
                      {playerAnswers[player.player_id] && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};