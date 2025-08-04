import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, Zap, Target } from "lucide-react";
import { toast } from "sonner";

interface Challenge {
  id: string;
  name: string;
  type: string;
  instructions: string;
  timeLimit: number;
  data?: any;
}

interface Player {
  id: string;
  playerName: string;
  isHost: boolean;
}

interface Room {
  roomCode: string;
  gameState?: {
    phase?: string;
    currentChallenge?: number;
    scores?: Record<string, number>;
    challengeData?: any;
    playerResponses?: Record<string, any>;
  };
}

interface PuzzzPanicGameProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (updates: any) => void;
}

const CHALLENGES: Challenge[] = [
  { id: "tap_to_ten", name: "Tap to Ten", type: "tap_counter", instructions: "Tap the screen exactly 10 times as fast as you can!", timeLimit: 15 },
  { id: "color_flash", name: "Color Flash", type: "color_word", instructions: "Tap the word that matches its text (not the color it's shown in)!", timeLimit: 10 },
  { id: "tap_green", name: "Tap When Green", type: "reaction_time", instructions: "Wait for the screen to turn green, then tap as fast as possible!", timeLimit: 15 },
  { id: "swipe_order", name: "Swipe Order", type: "swipe_sequence", instructions: "Swipe in the exact order shown!", timeLimit: 10 },
  { id: "pattern_match", name: "Pattern Match", type: "pattern", instructions: "A pattern of shapes will flash. Tap the correct next shape!", timeLimit: 12 },
  { id: "emoji_recall", name: "Emoji Recall", type: "emoji_memory", instructions: "Four emojis will appear briefly. Pick the one that was missing!", timeLimit: 15 },
  { id: "spot_match", name: "Spot the Match", type: "sequence_match", instructions: "Two emoji sequences will flash. Tap if they match!", timeLimit: 10 },
  { id: "quick_math", name: "Quick Math", type: "math", instructions: "Solve the equation as fast as possible!", timeLimit: 12 },
  { id: "color_tap_race", name: "Color Tap Race", type: "color_tap", instructions: "Tap all the blue shapes as fast as possible!", timeLimit: 15 },
  { id: "tap_fastest", name: "Tap the Fast One", type: "speed_tap", instructions: "One icon moves faster than the rest. Tap the fastest one!", timeLimit: 10 },
  { id: "memory_flip", name: "Memory Flip", type: "grid_memory", instructions: "A 3x3 grid will flash. Pick where the specific emoji was!", timeLimit: 15 },
  { id: "stop_target", name: "Stop at Target", type: "timing", instructions: "Tap to stop the bar in the green zone!", timeLimit: 10 },
  { id: "shape_swipe", name: "Shape Swipe", type: "direction_swipe", instructions: "Swipe in the direction the arrow is pointing!", timeLimit: 8 },
  { id: "count_cats", name: "Count the Cats", type: "counting", instructions: "Count how many cats you see!", timeLimit: 12 },
  { id: "hold_release", name: "Hold and Release", type: "hold_timing", instructions: "Hold the screen down and release exactly at 3 seconds!", timeLimit: 8 }
];

export const PuzzzPanicGame: React.FC<PuzzzPanicGameProps> = ({
  room,
  players,
  currentPlayer,
  onUpdateRoom
}) => {
  const [gamePhase, setGamePhase] = useState(room.gameState?.phase || "waiting");
  const [currentChallenge, setCurrentChallenge] = useState(room.gameState?.currentChallenge || 0);
  const [scores, setScores] = useState(room.gameState?.scores || {});
  const [timeLeft, setTimeLeft] = useState(0);
  const [challengeStartTime, setChallengeStartTime] = useState(0);
  const [playerResponse, setPlayerResponse] = useState<any>(null);
  const [hasResponded, setHasResponded] = useState(false);
  
  // Challenge-specific state
  const [tapCount, setTapCount] = useState(0);
  const [colorWord, setColorWord] = useState({ word: "", color: "", correct: "" });
  const [isGreen, setIsGreen] = useState(false);
  const [swipeSequence, setSwipeSequence] = useState<string[]>([]);
  const [userSwipes, setUserSwipes] = useState<string[]>([]);
  const [mathProblem, setMathProblem] = useState<{ question: string; answer: number; options: number[] }>({ question: "", answer: 0, options: [] });
  const [targetPosition, setTargetPosition] = useState(0);
  const [barPosition, setBarPosition] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout>();
  const challengeRef = useRef<NodeJS.Timeout>();
  const animationRef = useRef<number>();

  const challenge = CHALLENGES[currentChallenge % CHALLENGES.length];
  
  if (!challenge) return null;

  // Sync with room state
  useEffect(() => {
    if (room.gameState) {
      setGamePhase(room.gameState.phase || "waiting");
      setCurrentChallenge(room.gameState.currentChallenge || 0);
      setScores(room.gameState.scores || {});
    }
  }, [room.gameState]);

  // Initialize challenge data
  const initializeChallenge = useCallback(() => {
    setHasResponded(false);
    setPlayerResponse(null);
    setChallengeStartTime(Date.now());
    
    switch (challenge.type) {
      case "tap_counter":
        setTapCount(0);
        break;
      case "color_word":
        const words = ["RED", "BLUE", "GREEN", "YELLOW", "PURPLE"];
        const colors = ["text-red-500", "text-blue-500", "text-green-500", "text-yellow-500", "text-purple-500"];
        const word = words[Math.floor(Math.random() * words.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        setColorWord({ word: word || "", color: color || "", correct: word || "" });
        break;
      case "reaction_time":
        setIsGreen(false);
        const greenDelay = Math.random() * 5000 + 2000; // 2-7 seconds
        setTimeout(() => setIsGreen(true), greenDelay);
        break;
      case "swipe_sequence":
        const directions = ["left", "right", "up", "down"];
        const sequence = Array.from({ length: 3 }, () => directions[Math.floor(Math.random() * directions.length)] || "left");
        setSwipeSequence(sequence);
        setUserSwipes([]);
        break;
      case "math":
        const a = Math.floor(Math.random() * 10) + 1;
        const b = Math.floor(Math.random() * 10) + 1;
        const c = Math.floor(Math.random() * 5) + 1;
        const answer = a + b * c;
        const wrongAnswers = [answer + 1, answer - 1, answer + 2].filter(x => x !== answer);
        const options = [answer, ...wrongAnswers.slice(0, 2)].sort(() => Math.random() - 0.5);
        setMathProblem({ question: `${a} + ${b} × ${c}`, answer, options });
        break;
      case "timing":
        setTargetPosition(Math.random() * 60 + 20); // 20-80% position
        setBarPosition(0);
        // Start moving bar
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = (elapsed / 3000) * 100; // 3 seconds to cross
          setBarPosition(progress);
          if (progress < 100) {
            animationRef.current = requestAnimationFrame(animate);
          }
        };
        animationRef.current = requestAnimationFrame(animate);
        break;
    }
  }, [challenge]);

  // Start timer for challenge
  useEffect(() => {
    if (gamePhase === "challenge" && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gamePhase === "challenge" && !hasResponded) {
      // Time's up, auto-submit
      submitResponse(null);
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, gamePhase, hasResponded]);

  const startGame = () => {
    if (!currentPlayer.isHost) return;
    
    const shuffledChallenges = [...Array(10)].map(() => Math.floor(Math.random() * CHALLENGES.length));
    
    onUpdateRoom({
      gameState: {
        phase: "challenge",
        currentChallenge: 0,
        scores: players.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}),
        challengeOrder: shuffledChallenges,
        playerResponses: {}
      }
    });
  };

  const startChallenge = () => {
    setTimeLeft(challenge.timeLimit);
    initializeChallenge();
    setGamePhase("challenge");
  };

  useEffect(() => {
    if (gamePhase === "challenge" && currentPlayer.isHost) {
      startChallenge();
    }
  }, [gamePhase, currentChallenge]);

  const submitResponse = (response: any) => {
    if (hasResponded) return;
    
    setHasResponded(true);
    setPlayerResponse(response);
    
    const responseTime = Date.now() - challengeStartTime;
    const score = calculateScore(response, responseTime);
    
    onUpdateRoom({
      gameState: {
        ...room.gameState,
        playerResponses: {
          ...room.gameState?.playerResponses,
          [currentPlayer.id]: { response, score, time: responseTime }
        }
      }
    });
  };

  const calculateScore = (response: any, responseTime: number): number => {
    let baseScore = 0;
    const timeBonus = Math.max(0, (challenge.timeLimit * 1000 - responseTime) / 100);
    
    switch (challenge.type) {
      case "tap_counter":
        baseScore = response === 10 ? 1000 : Math.max(0, 1000 - Math.abs(response - 10) * 50);
        break;
      case "color_word":
        baseScore = response === colorWord.correct ? 1000 : 0;
        break;
      case "reaction_time":
        baseScore = response && isGreen ? Math.max(0, 1000 - responseTime / 2) : 0;
        break;
      case "math":
        baseScore = response === mathProblem.answer ? 1000 : 0;
        break;
      case "timing":
        const distance = Math.abs(response - targetPosition);
        baseScore = Math.max(0, 1000 - distance * 20);
        break;
      default:
        baseScore = response ? 500 : 0;
    }
    
    return Math.round(baseScore + timeBonus);
  };

  const nextChallenge = () => {
    if (!currentPlayer.isHost) return;
    
    const nextIndex = currentChallenge + 1;
    if (nextIndex >= 10) {
      // Game finished
      onUpdateRoom({
        gameState: {
          ...room.gameState,
          phase: "finished"
        }
      });
    } else {
      onUpdateRoom({
        gameState: {
          ...room.gameState,
          currentChallenge: nextIndex,
          playerResponses: {}
        }
      });
    }
  };

  const resetGame = () => {
    if (!currentPlayer.isHost) return;
    
    onUpdateRoom({
      gameState: {
        phase: "waiting",
        currentChallenge: 0,
        scores: {},
        playerResponses: {}
      }
    });
  };

  // Touch/swipe handlers
  const handleSwipe = (direction: string) => {
    if (challenge.type === "swipe_sequence" && !hasResponded) {
      const newSwipes = [...userSwipes, direction];
      setUserSwipes(newSwipes);
      
      if (newSwipes.length === swipeSequence.length) {
        const isCorrect = newSwipes.every((swipe, index) => swipe === swipeSequence[index]);
        submitResponse(isCorrect);
      }
    }
  };

  const renderChallenge = () => {
    switch (challenge.type) {
      case "tap_counter":
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl font-bold text-primary">{tapCount}/10</div>
            <Button
              size="lg"
              className="w-64 h-32 text-2xl"
              onClick={() => {
                if (!hasResponded && tapCount < 15) {
                  const newCount = tapCount + 1;
                  setTapCount(newCount);
                  if (newCount === 10) {
                    submitResponse(10);
                  }
                }
              }}
              disabled={hasResponded}
            >
              TAP HERE!
            </Button>
          </div>
        );

      case "color_word":
        return (
          <div className="text-center space-y-6">
            <div className={`text-8xl font-bold ${colorWord.color}`}>
              {colorWord.word}
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {["RED", "BLUE", "GREEN", "YELLOW"].map(word => (
                <Button
                  key={word}
                  size="lg"
                  variant={word === colorWord.word ? "default" : "outline"}
                  onClick={() => submitResponse(word)}
                  disabled={hasResponded}
                >
                  {word}
                </Button>
              ))}
            </div>
          </div>
        );

      case "reaction_time":
        return (
          <div className="text-center space-y-6">
            <div 
              className={`w-64 h-64 mx-auto rounded-full transition-all duration-300 ${
                isGreen ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <Button
              size="lg"
              className="w-48 h-16 text-xl"
              onClick={() => {
                if (isGreen && !hasResponded) {
                  submitResponse(true);
                }
              }}
              disabled={hasResponded || !isGreen}
            >
              {isGreen ? "TAP NOW!" : "WAIT..."}
            </Button>
          </div>
        );

      case "math":
        return (
          <div className="text-center space-y-6">
            <div className="text-6xl font-bold">{mathProblem.question} = ?</div>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              {mathProblem.options.map(option => (
                <Button
                  key={option}
                  size="lg"
                  onClick={() => submitResponse(option)}
                  disabled={hasResponded}
                  className="text-2xl h-16"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        );

      case "timing":
        return (
          <div className="text-center space-y-6">
            <div className="relative w-full max-w-md mx-auto h-8 bg-gray-200 rounded">
              <div 
                className="absolute top-0 h-full bg-green-500 rounded"
                style={{ 
                  left: `${targetPosition}%`, 
                  width: "20%",
                  opacity: 0.3 
                }}
              />
              <div 
                className="absolute top-0 w-2 h-full bg-blue-500 transition-all duration-75"
                style={{ left: `${barPosition}%` }}
              />
            </div>
            <Button
              size="lg"
              className="w-48 h-16 text-xl"
              onClick={() => {
                if (!hasResponded) {
                  if (animationRef.current) {
                    cancelAnimationFrame(animationRef.current);
                  }
                  submitResponse(barPosition);
                }
              }}
              disabled={hasResponded}
            >
              STOP!
            </Button>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Challenge not implemented yet!</p>
            <Button onClick={() => submitResponse(true)} className="mt-4">
              Continue
            </Button>
          </div>
        );
    }
  };

  if (gamePhase === "waiting") {
    return (
      <div className="min-h-screen gradient-bg p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center gap-2">
              <Zap className="h-8 w-8" />
              Puzzz Panic
            </h1>
            <p className="text-lg text-muted-foreground">
              Fast-paced challenges for up to {players.length} players!
            </p>
          </div>

          <Card className="p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">How to Play</h2>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h3 className="font-semibold mb-2">🎯 The Goal</h3>
                <p>Complete 10 random challenges as fast and accurately as possible!</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">⚡ The Rules</h3>
                <p>Each challenge has a time limit. Speed and accuracy earn points!</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Players ({players.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 p-2 bg-secondary rounded-lg"
                >
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                    {player.playerName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{player.playerName}</span>
                  {player.isHost && <Badge variant="secondary">Host</Badge>}
                </div>
              ))}
            </div>
          </Card>

          {currentPlayer.isHost && (
            <div className="text-center">
              <Button onClick={startGame} size="lg" className="text-xl px-8 py-4">
                <Zap className="mr-2 h-5 w-5" />
                Start Puzzz Panic!
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gamePhase === "challenge") {
    return (
      <div className="min-h-screen gradient-bg p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Challenge {currentChallenge + 1}/10</Badge>
              <h2 className="text-2xl font-bold">{challenge.name}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className="text-2xl font-bold text-primary">{timeLeft}s</span>
            </div>
          </div>

          {/* Progress */}
          <Progress value={(currentChallenge / 10) * 100} className="mb-6" />

          {/* Instructions */}
          <Card className="p-4 mb-6">
            <p className="text-center text-lg font-medium">{challenge.instructions}</p>
          </Card>

          {/* Challenge */}
          <Card className="p-8">
            {renderChallenge()}
          </Card>

          {/* Response Status */}
          {hasResponded && (
            <div className="text-center mt-6">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                Response Submitted! Waiting for others...
              </Badge>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gamePhase === "finished") {
    const sortedPlayers = players
      .map(player => ({
        ...player,
        score: scores[player.id] || 0
      }))
      .sort((a, b) => b.score - a.score);

    return (
      <div className="min-h-screen gradient-bg p-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
            <h1 className="text-4xl font-bold mb-2">Puzzz Panic Complete!</h1>
            <p className="text-lg text-muted-foreground">
              🎉 {sortedPlayers[0]?.playerName} wins with {sortedPlayers[0]?.score} points!
            </p>
          </div>

          <Card className="p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4">Final Leaderboard</h2>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index === 0 ? "bg-yellow-100 border-2 border-yellow-300" :
                    index === 1 ? "bg-gray-100 border-2 border-gray-300" :
                    index === 2 ? "bg-orange-100 border-2 border-orange-300" :
                    "bg-secondary"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold">#{index + 1}</span>
                    <span className="font-medium">{player.playerName}</span>
                  </div>
                  <span className="text-xl font-bold">{player.score} pts</span>
                </div>
              ))}
            </div>
          </Card>

          {currentPlayer.isHost && (
            <Button onClick={resetGame} size="lg" className="text-xl px-8 py-4">
              <Zap className="mr-2 h-5 w-5" />
              Play Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return null;
};