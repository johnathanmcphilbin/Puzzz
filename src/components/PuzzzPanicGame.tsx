import React, { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Clock, Zap, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface Challenge {
  id: string;
  name: string;
  type: string;
  instructions: string;
  timeLimit: number;
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
    challengeOrder?: number[];
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

const EMOJIS = ["🐱", "🐶", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐸", "🐵", "🐔", "🐧", "🦆"];
const SHAPES = ["⭐", "🔴", "🔵", "🟢", "🟡", "🟣", "⚫", "⚪", "🔶", "🔷"];
const ARROW_DIRECTIONS = [
  { name: "up", icon: ArrowUp, swipe: "up" },
  { name: "down", icon: ArrowDown, swipe: "down" },
  { name: "left", icon: ArrowLeft, swipe: "left" },
  { name: "right", icon: ArrowRight, swipe: "right" }
];

export const PuzzzPanicGame: React.FC<PuzzzPanicGameProps> = ({
  room,
  players,
  currentPlayer,
  onUpdateRoom
}) => {
  const [gamePhase, setGamePhase] = useState(room.gameState?.phase || "waiting");
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(room.gameState?.currentChallenge || 0);
  const [scores, setScores] = useState(room.gameState?.scores || {});
  const [timeLeft, setTimeLeft] = useState(0);
  const [challengeStartTime, setChallengeStartTime] = useState(0);
  const [hasResponded, setHasResponded] = useState(false);
  const [challengeOrder] = useState(room.gameState?.challengeOrder || []);
  
  // Challenge-specific state
  const [tapCount, setTapCount] = useState(0);
  const [colorWords, setColorWords] = useState<{word: string, color: string, options: string[]}>();
  const [isGreen, setIsGreen] = useState(false);
  const [greenStartTime, setGreenStartTime] = useState(0);
  const [swipeSequence, setSwipeSequence] = useState<string[]>([]);
  const [userSwipes, setUserSwipes] = useState<string[]>([]);
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0);
  const [pattern, setPattern] = useState<{shapes: string[], nextOptions: string[]}>({shapes: [], nextOptions: []});
  const [emojiMemory, setEmojiMemory] = useState<{shown: string[], missing: string, options: string[]}>({shown: [], missing: "", options: []});
  const [showEmojiMemory, setShowEmojiMemory] = useState(true);
  const [sequenceMatch, setSequenceMatch] = useState<{seq1: string[], seq2: string[], match: boolean}>({seq1: [], seq2: [], match: false});
  const [showSequences, setShowSequences] = useState(true);
  const [mathProblem, setMathProblem] = useState<{question: string, answer: number, options: number[]}>({question: "", answer: 0, options: []});
  const [colorShapes, setColorShapes] = useState<{shapes: {emoji: string, color: string, id: number}[], tapped: Set<number>}>({shapes: [], tapped: new Set()});
  const [movingIcons, setMovingIcons] = useState<{icons: {emoji: string, speed: number, id: number}[], fastest: number}>({icons: [], fastest: 0});
  const [gridMemory, setGridMemory] = useState<{grid: string[][], target: string, targetPos: {row: number, col: number}}>({grid: [], target: "", targetPos: {row: 0, col: 0}});
  const [showGrid, setShowGrid] = useState(true);
  const [barPosition, setBarPosition] = useState(0);
  const [targetZone, setTargetZone] = useState({start: 40, end: 60});
  const [arrowDirection, setArrowDirection] = useState<typeof ARROW_DIRECTIONS[0]>();
  const [countingEmojis, setCountingEmojis] = useState<{emojis: string[], catCount: number}>({emojis: [], catCount: 0});
  const [showCountingEmojis, setShowCountingEmojis] = useState(true);
  const [holdStartTime, setHoldStartTime] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [holdDuration, setHoldDuration] = useState(0);
  
  const timerRef = useRef<NodeJS.Timeout>();
  const animationRef = useRef<number>();
  const greenTimeoutRef = useRef<NodeJS.Timeout>();
  const emojiTimeoutRef = useRef<NodeJS.Timeout>();
  const sequenceTimeoutRef = useRef<NodeJS.Timeout>();
  const gridTimeoutRef = useRef<NodeJS.Timeout>();
  const countingTimeoutRef = useRef<NodeJS.Timeout>();
  const holdIntervalRef = useRef<NodeJS.Timeout>();

  const challengeIndex = challengeOrder[currentChallengeIndex] ?? currentChallengeIndex;
  const challenge = CHALLENGES[challengeIndex % CHALLENGES.length];
  
  if (!challenge) {
    return <div>Loading challenge...</div>;
  }

  // Determine if current player is host
  const isHost = currentPlayer?.isHost || false;
  
  // Host view logic - host doesn't participate but can see leaderboard
  const showHostView = isHost && gamePhase === "challenge";
  
  // Get player responses for real-time updates
  const playerResponses = room.gameState?.playerResponses || {};

  // Sync with room state
  useEffect(() => {
    if (room.gameState) {
      setGamePhase(room.gameState.phase || "waiting");
      setCurrentChallengeIndex(room.gameState.currentChallenge || 0);
      setScores(room.gameState.scores || {});
    }
  }, [room.gameState]);

  // Timer effect
  useEffect(() => {
    if (gamePhase === "challenge" && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gamePhase === "challenge" && !hasResponded) {
      submitResponse(null, Date.now() - challengeStartTime);
    }
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, gamePhase, hasResponded]);

  // Initialize challenge when it starts
  useEffect(() => {
    if (gamePhase === "challenge" && !hasResponded) {
      initializeChallenge();
      setTimeLeft(challenge.timeLimit);
      setChallengeStartTime(Date.now());
    }
  }, [gamePhase, currentChallengeIndex]);

  const initializeChallenge = () => {
    setHasResponded(false);
    setTapCount(0);
    setIsGreen(false);
    setUserSwipes([]);
    setCurrentSwipeIndex(0);
    setHoldStartTime(0);
    setIsHolding(false);
    setHoldDuration(0);

    switch (challenge.type) {
      case "color_word":
        const words = ["RED", "BLUE", "GREEN", "YELLOW"];
        const colors = ["text-red-500", "text-blue-500", "text-green-500", "text-yellow-500"];
        const word = words[Math.floor(Math.random() * words.length)] || "RED";
        const color = colors[Math.floor(Math.random() * colors.length)] || "text-red-500";
        setColorWords({word, color, options: words});
        break;

      case "reaction_time":
        setIsGreen(false);
        const delay = Math.random() * 4000 + 2000; // 2-6 seconds
        greenTimeoutRef.current = setTimeout(() => {
          setIsGreen(true);
          setGreenStartTime(Date.now());
        }, delay);
        break;

      case "swipe_sequence":
        const directions = ["up", "down", "left", "right"];
        const sequence = Array.from({length: 3}, () => {
          const dir = directions[Math.floor(Math.random() * directions.length)];
          return dir || "up";
        });
        setSwipeSequence(sequence);
        break;

      case "pattern":
        const patternShapes = Array.from({length: 4}, () => {
          const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
          return shape || "⭐";
        });
        const nextShape = SHAPES[Math.floor(Math.random() * SHAPES.length)] || "⭐";
        const wrongOptions = SHAPES.filter(s => s !== nextShape).slice(0, 2);
        const patternOptions = [nextShape, ...wrongOptions].sort(() => Math.random() - 0.5);
        setPattern({shapes: patternShapes, nextOptions: patternOptions});
        break;

      case "emoji_memory":
        const allEmojis = [...EMOJIS];
        const shownEmojis = allEmojis.splice(0, 3);
        const missingEmoji = allEmojis[Math.floor(Math.random() * allEmojis.length)] || "🐱";
        const wrongEmojis = allEmojis.filter(e => e !== missingEmoji).slice(0, 2);
        const emojiOptions = [missingEmoji, ...wrongEmojis].sort(() => Math.random() - 0.5);
        setEmojiMemory({shown: shownEmojis, missing: missingEmoji, options: emojiOptions});
        setShowEmojiMemory(true);
        emojiTimeoutRef.current = setTimeout(() => setShowEmojiMemory(false), 2000);
        break;

      case "sequence_match":
        const seq1 = Array.from({length: 3}, () => {
          const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
          return emoji || "🐱";
        });
        const isMatch = Math.random() > 0.5;
        const seq2 = isMatch ? [...seq1] : Array.from({length: 3}, () => {
          const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
          return emoji || "🐶";
        });
        setSequenceMatch({seq1, seq2, match: isMatch});
        setShowSequences(true);
        sequenceTimeoutRef.current = setTimeout(() => setShowSequences(false), 3000);
        break;

      case "math":
        const a = Math.floor(Math.random() * 9) + 1;
        const b = Math.floor(Math.random() * 9) + 1;
        const c = Math.floor(Math.random() * 4) + 1;
        const answer = a + b * c;
        const wrongAnswers = [answer + 1, answer - 1, answer + Math.floor(Math.random() * 5) + 2];
        const mathOptions = [answer, ...wrongAnswers.slice(0, 2)].sort(() => Math.random() - 0.5);
        setMathProblem({question: `${a} + ${b} × ${c}`, answer, options: mathOptions});
        break;

      case "color_tap":
        const colorShapesArray = Array.from({length: 8}, (_, i) => ({
          emoji: SHAPES[Math.floor(Math.random() * SHAPES.length)] || "⭐",
          color: Math.random() > 0.4 ? "text-blue-500" : (["text-red-500", "text-green-500", "text-yellow-500"][Math.floor(Math.random() * 3)] || "text-red-500"),
          id: i
        }));
        setColorShapes({shapes: colorShapesArray, tapped: new Set()});
        break;

      case "speed_tap":
        const iconArray = Array.from({length: 4}, (_, i) => ({
          emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)] || "🐱",
          speed: Math.random() * 2 + 1,
          id: i
        }));
        const fastestIconId = iconArray.reduce((fastest, icon, idx) => (iconArray[fastest]?.speed || 0) < icon.speed ? idx : fastest, 0);
        setMovingIcons({icons: iconArray, fastest: fastestIconId});
        break;

      case "grid_memory":
        const memoryGrid = Array.from({length: 3}, () => 
          Array.from({length: 3}, () => Math.random() > 0.7 ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] || "🐱" : "")
        );
        const nonEmptyPositions: {row: number, col: number, emoji: string}[] = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            if (memoryGrid[r] && memoryGrid[r]![c]) {
              nonEmptyPositions.push({row: r, col: c, emoji: memoryGrid[r]![c]!});
            }
          }
        }
         if (nonEmptyPositions.length > 0) {
           const targetPosition = nonEmptyPositions[Math.floor(Math.random() * nonEmptyPositions.length)];
           if (targetPosition) {
             setGridMemory({grid: memoryGrid, target: targetPosition.emoji, targetPos: {row: targetPosition.row, col: targetPosition.col}});
           } else {
             setGridMemory({grid: memoryGrid, target: "🐱", targetPos: {row: 1, col: 1}});
           }
        } else {
          // Fallback if no emojis generated
          setGridMemory({grid: memoryGrid, target: "🐱", targetPos: {row: 1, col: 1}});
        }
        setShowGrid(true);
        gridTimeoutRef.current = setTimeout(() => setShowGrid(false), 2500);
        break;

      case "timing":
        setBarPosition(0);
        setTargetZone({start: Math.random() * 40 + 20, end: Math.random() * 20 + 60});
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = (elapsed / 4000) * 100;
          setBarPosition(progress);
          if (progress < 100 && !hasResponded) {
            animationRef.current = requestAnimationFrame(animate);
          }
        };
        animationRef.current = requestAnimationFrame(animate);
        break;

      case "direction_swipe":
        setArrowDirection(ARROW_DIRECTIONS[Math.floor(Math.random() * ARROW_DIRECTIONS.length)]);
        break;

      case "counting":
        const totalEmojis = Math.floor(Math.random() * 15) + 10;
        const catCount = Math.floor(Math.random() * 6) + 2;
        const catEmojis = Array(catCount).fill("🐱");
        const otherEmojis = Array(totalEmojis - catCount).fill(null).map(() => {
          const nonCatEmojis = EMOJIS.filter(e => e !== "🐱");
          return nonCatEmojis[Math.floor(Math.random() * nonCatEmojis.length)] || "🐶";
        });
        const allCountingEmojis = [...catEmojis, ...otherEmojis].sort(() => Math.random() - 0.5);
        setCountingEmojis({emojis: allCountingEmojis, catCount});
        setShowCountingEmojis(true);
        countingTimeoutRef.current = setTimeout(() => setShowCountingEmojis(false), 3000);
        break;
    }
  };

  const submitResponse = (response: any, responseTime: number) => {
    if (hasResponded) return;
    
    setHasResponded(true);
    const score = calculateScore(response, responseTime);
    
    // Clear any running timeouts/animations
    if (greenTimeoutRef.current) clearTimeout(greenTimeoutRef.current);
    if (emojiTimeoutRef.current) clearTimeout(emojiTimeoutRef.current);
    if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current);
    if (gridTimeoutRef.current) clearTimeout(gridTimeoutRef.current);
    if (countingTimeoutRef.current) clearTimeout(countingTimeoutRef.current);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    
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
        baseScore = response === 10 ? 1000 : Math.max(0, 1000 - Math.abs(response - 10) * 100);
        break;
      case "color_word":
        baseScore = response === colorWords?.word ? 1000 : 0;
        break;
      case "reaction_time":
        baseScore = response && isGreen ? Math.max(200, 1000 - (responseTime - greenStartTime) / 2) : 0;
        break;
      case "swipe_sequence":
        baseScore = JSON.stringify(response) === JSON.stringify(swipeSequence) ? 1000 : 0;
        break;
      case "pattern":
        baseScore = response === pattern.nextOptions[0] ? 1000 : 0;
        break;
      case "emoji_memory":
        baseScore = response === emojiMemory.missing ? 1000 : 0;
        break;
      case "sequence_match":
        baseScore = response === sequenceMatch.match ? 1000 : 0;
        break;
      case "math":
        baseScore = response === mathProblem.answer ? 1000 : 0;
        break;
      case "color_tap":
        const blueShapes = colorShapes.shapes.filter(s => s.color === "text-blue-500").length;
        const correctTaps = response || 0;
        baseScore = correctTaps === blueShapes ? 1000 : Math.max(0, 1000 - Math.abs(correctTaps - blueShapes) * 200);
        break;
      case "speed_tap":
        baseScore = response === movingIcons.fastest ? 1000 : 0;
        break;
      case "grid_memory":
        const correctPos = gridMemory.targetPos;
        baseScore = response && response.row === correctPos.row && response.col === correctPos.col ? 1000 : 0;
        break;
      case "timing":
        if (response >= targetZone.start && response <= targetZone.end) {
          const centerTarget = (targetZone.start + targetZone.end) / 2;
          const distance = Math.abs(response - centerTarget);
          baseScore = Math.max(600, 1000 - distance * 20);
        }
        break;
      case "direction_swipe":
        baseScore = response === arrowDirection?.swipe ? 1000 : 0;
        break;
      case "counting":
        baseScore = response === countingEmojis.catCount ? 1000 : Math.max(0, 1000 - Math.abs(response - countingEmojis.catCount) * 150);
        break;
      case "hold_timing":
        const timeDiff = Math.abs(response - 3000);
        baseScore = timeDiff < 200 ? 1000 : Math.max(0, 1000 - timeDiff / 5);
        break;
      default:
        baseScore = 500;
    }
    
    return Math.round(baseScore + timeBonus);
  };

  const startGame = () => {
    if (!currentPlayer.isHost) return;
    
    const shuffledChallenges = Array.from({length: 10}, () => Math.floor(Math.random() * CHALLENGES.length));
    
    const activePlayers = players.filter(p => !p.isHost); // Only include non-host players in scoring
    
    onUpdateRoom({
      gameState: {
        phase: "challenge",
        currentChallenge: 0,
        scores: activePlayers.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}),
        challengeOrder: shuffledChallenges,
        playerResponses: {}
      }
    });
  };

  const nextChallenge = () => {
    if (!currentPlayer.isHost) return;
    
    // Calculate scores
    const playerResponses = room.gameState?.playerResponses || {};
    const newScores = { ...scores };
    
    Object.entries(playerResponses).forEach(([playerId, data]: [string, any]) => {
      newScores[playerId] = (newScores[playerId] || 0) + (data.score || 0);
    });
    
    const nextIndex = currentChallengeIndex + 1;
    if (nextIndex >= 10) {
      onUpdateRoom({
        gameState: {
          ...room.gameState,
          phase: "finished",
          scores: newScores
        }
      });
    } else {
      onUpdateRoom({
        gameState: {
          ...room.gameState,
          currentChallenge: nextIndex,
          scores: newScores,
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
        playerResponses: {},
        challengeOrder: []
      }
    });
  };

  // Touch/gesture handlers
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, action?: string) => {
    e.preventDefault();
    if (hasResponded) return;

    if (challenge.type === "hold_timing") {
      setIsHolding(true);
      setHoldStartTime(Date.now());
      holdIntervalRef.current = setInterval(() => {
        setHoldDuration(Date.now() - holdStartTime);
      }, 50);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (hasResponded) return;

    if (challenge.type === "hold_timing" && isHolding) {
      setIsHolding(false);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      const duration = Date.now() - holdStartTime;
      submitResponse(duration, Date.now() - challengeStartTime);
    }
  };

  const handleSwipe = (direction: string) => {
    if (hasResponded) return;

    if (challenge.type === "swipe_sequence") {
      const newSwipes = [...userSwipes, direction];
      setUserSwipes(newSwipes);
      setCurrentSwipeIndex(newSwipes.length);
      
      if (newSwipes.length === swipeSequence.length) {
        submitResponse(newSwipes, Date.now() - challengeStartTime);
      }
    } else if (challenge.type === "direction_swipe") {
      submitResponse(direction, Date.now() - challengeStartTime);
    }
  };

  const handleColorShapeTap = (shapeId: number) => {
    if (hasResponded) return;
    
    const shape = colorShapes.shapes.find(s => s.id === shapeId);
    if (shape?.color === "text-blue-500") {
      const newTapped = new Set([...colorShapes.tapped, shapeId]);
      setColorShapes(prev => ({...prev, tapped: newTapped}));
      
      const blueShapes = colorShapes.shapes.filter(s => s.color === "text-blue-500");
      if (newTapped.size === blueShapes.length) {
        submitResponse(newTapped.size, Date.now() - challengeStartTime);
      }
    }
  };

  // Check if all players have responded
  useEffect(() => {
    if (gamePhase === "challenge" && currentPlayer.isHost) {
      const playerResponses = room.gameState?.playerResponses || {};
      const responseCount = Object.keys(playerResponses).length;
      const activePlayers = players.filter(p => !p.isHost); // Exclude host from response count
      
      if (responseCount === activePlayers.length) {
        // Wait a moment then move to next challenge
        setTimeout(() => nextChallenge(), 2000);
      }
    }
  }, [room.gameState?.playerResponses, gamePhase, currentPlayer.isHost, players.length]);

  const renderChallenge = () => {
    if (!challenge) return null;

    switch (challenge.type) {
      case "tap_counter":
        return (
          <div className="text-center space-y-6">
            <div className="text-8xl font-bold text-primary">{tapCount}/10</div>
            <Button
              size="lg"
              className="w-64 h-32 text-3xl"
              onClick={() => {
                if (!hasResponded) {
                  const newCount = tapCount + 1;
                  setTapCount(newCount);
                  if (newCount === 10) {
                    submitResponse(10, Date.now() - challengeStartTime);
                  }
                }
              }}
              disabled={hasResponded}
            >
              TAP!
            </Button>
          </div>
        );

      case "color_word":
        return (
          <div className="text-center space-y-8">
            <div className={`text-8xl font-bold ${colorWords?.color || 'text-red-500'}`}>
              {colorWords?.word || 'Loading...'}
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              {(colorWords?.options || []).map(word => (
                <Button
                  key={word}
                  size="lg"
                  onClick={() => submitResponse(word, Date.now() - challengeStartTime)}
                  disabled={hasResponded}
                  className="text-xl h-16"
                >
                  {word}
                </Button>
              ))}
            </div>
          </div>
        );

      case "reaction_time":
        return (
          <div className="text-center space-y-8">
            <div 
              className={`w-64 h-64 mx-auto rounded-full transition-all duration-500 ${
                isGreen ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <Button
              size="lg"
              className="w-48 h-16 text-xl"
              onClick={() => {
                if (isGreen && !hasResponded) {
                  submitResponse(true, Date.now() - challengeStartTime);
                }
              }}
              disabled={hasResponded || !isGreen}
            >
              {isGreen ? "TAP NOW!" : "WAIT..."}
            </Button>
          </div>
        );

      case "swipe_sequence":
        return (
          <div className="text-center space-y-8">
            <div className="text-2xl mb-4">Swipe in order:</div>
            <div className="flex justify-center gap-4 mb-8">
              {swipeSequence.map((direction, idx) => {
                const Icon = ARROW_DIRECTIONS.find(d => d.swipe === direction)?.icon || ArrowUp;
                return (
                  <div 
                    key={idx} 
                    className={`p-4 rounded-lg border-2 ${
                      idx < currentSwipeIndex ? "bg-green-200 border-green-500" : "bg-gray-100 border-gray-300"
                    }`}
                  >
                    <Icon className="h-8 w-8" />
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              {ARROW_DIRECTIONS.map(direction => {
                const Icon = direction.icon;
                return (
                  <Button
                    key={direction.swipe}
                    size="lg"
                    onClick={() => handleSwipe(direction.swipe)}
                    disabled={hasResponded}
                    className="h-16"
                  >
                    <Icon className="h-6 w-6" />
                  </Button>
                );
              })}
            </div>
          </div>
        );

      case "pattern":
        return (
          <div className="text-center space-y-8">
            <div className="text-xl mb-4">What comes next?</div>
            <div className="flex justify-center gap-4 mb-8">
              {pattern.shapes.map((shape, idx) => (
                <div key={idx} className="text-6xl p-2 bg-gray-100 rounded-lg">
                  {shape}
                </div>
              ))}
              <div className="text-6xl p-2 bg-gray-300 rounded-lg">?</div>
            </div>
            <div className="flex justify-center gap-4">
              {pattern.nextOptions.map(option => (
                <Button
                  key={option}
                  size="lg"
                  onClick={() => submitResponse(option, Date.now() - challengeStartTime)}
                  disabled={hasResponded}
                  className="text-4xl h-16 w-16"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        );

      case "emoji_memory":
        return (
          <div className="text-center space-y-8">
            {showEmojiMemory ? (
              <div>
                <div className="text-xl mb-6">Remember these emojis:</div>
                <div className="flex justify-center gap-4">
                  {emojiMemory.shown.map((emoji, idx) => (
                    <div key={idx} className="text-6xl p-4 bg-gray-100 rounded-lg">
                      {emoji}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xl mb-6">Which emoji was missing?</div>
                <div className="flex justify-center gap-4">
                  {emojiMemory.options.map(option => (
                    <Button
                      key={option}
                      size="lg"
                      onClick={() => submitResponse(option, Date.now() - challengeStartTime)}
                      disabled={hasResponded}
                      className="text-4xl h-16 w-16"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "sequence_match":
        return (
          <div className="text-center space-y-8">
            {showSequences ? (
              <div>
                <div className="text-xl mb-6">Do these sequences match?</div>
                <div className="space-y-4">
                  <div className="flex justify-center gap-2">
                    {sequenceMatch.seq1.map((emoji, idx) => (
                      <div key={idx} className="text-4xl p-2 bg-blue-100 rounded-lg">
                        {emoji}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-2">
                    {sequenceMatch.seq2.map((emoji, idx) => (
                      <div key={idx} className="text-4xl p-2 bg-green-100 rounded-lg">
                        {emoji}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xl mb-6">Did they match?</div>
                <div className="flex justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => submitResponse(true, Date.now() - challengeStartTime)}
                    disabled={hasResponded}
                    className="text-xl h-16 px-8"
                  >
                    YES
                  </Button>
                  <Button
                    size="lg"
                    onClick={() => submitResponse(false, Date.now() - challengeStartTime)}
                    disabled={hasResponded}
                    className="text-xl h-16 px-8"
                  >
                    NO
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case "math":
        return (
          <div className="text-center space-y-8">
            <div className="text-6xl font-bold mb-8">{mathProblem.question} = ?</div>
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              {mathProblem.options.map(option => (
                <Button
                  key={option}
                  size="lg"
                  onClick={() => submitResponse(option, Date.now() - challengeStartTime)}
                  disabled={hasResponded}
                  className="text-2xl h-16"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        );

      case "color_tap":
        return (
          <div className="text-center space-y-8">
            <div className="text-xl mb-4">Tap all the BLUE shapes!</div>
            <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
              {colorShapes.shapes.map(shape => (
                <Button
                  key={shape.id}
                  size="lg"
                  onClick={() => handleColorShapeTap(shape.id)}
                  disabled={hasResponded || colorShapes.tapped.has(shape.id)}
                  className={`text-4xl h-16 ${colorShapes.tapped.has(shape.id) ? 'opacity-50' : ''}`}
                  variant={colorShapes.tapped.has(shape.id) ? "secondary" : "outline"}
                >
                  <span className={shape.color}>{shape.emoji}</span>
                </Button>
              ))}
            </div>
          </div>
        );

      case "speed_tap":
        return (
          <div className="text-center space-y-8">
            <div className="text-xl mb-4">Tap the FASTEST moving icon!</div>
            <div className="flex justify-center gap-8">
              {movingIcons.icons.map(icon => (
                <Button
                  key={icon.id}
                  size="lg"
                  onClick={() => submitResponse(icon.id, Date.now() - challengeStartTime)}
                  disabled={hasResponded}
                  className="text-4xl h-16 w-16 relative overflow-hidden"
                >
                  <div 
                    className="absolute inset-0 flex items-center justify-center animate-bounce"
                    style={{
                      animationDuration: `${2 / icon.speed}s`,
                      animationTimingFunction: 'ease-in-out'
                    }}
                  >
                    {icon.emoji}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        );

      case "grid_memory":
        return (
          <div className="text-center space-y-8">
            {showGrid ? (
              <div>
                <div className="text-xl mb-6">Remember where the {gridMemory.target} is!</div>
                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                  {gridMemory.grid.map((row, rowIdx) =>
                    row.map((cell, colIdx) => (
                      <div
                        key={`${rowIdx}-${colIdx}`}
                        className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl"
                      >
                        {cell}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xl mb-6">Where was the {gridMemory.target}?</div>
                <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
                  {Array.from({length: 9}).map((_, idx) => {
                    const row = Math.floor(idx / 3);
                    const col = idx % 3;
                    return (
                      <Button
                        key={idx}
                        size="lg"
                        onClick={() => submitResponse({row, col}, Date.now() - challengeStartTime)}
                        disabled={hasResponded}
                        className="w-16 h-16 text-xl"
                      >
                        ?
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case "timing":
        return (
          <div className="text-center space-y-8">
            <div className="text-xl mb-4">Stop the bar in the GREEN zone!</div>
            <div className="relative w-full max-w-lg mx-auto h-12 bg-gray-200 rounded-lg overflow-hidden">
              <div 
                className="absolute top-0 h-full bg-green-500 opacity-40"
                style={{ 
                  left: `${targetZone.start}%`, 
                  width: `${targetZone.end - targetZone.start}%`
                }}
              />
              <div 
                className="absolute top-0 w-3 h-full bg-blue-600 transition-all duration-75"
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
                  submitResponse(barPosition, Date.now() - challengeStartTime);
                }
              }}
              disabled={hasResponded}
            >
              STOP!
            </Button>
          </div>
        );

      case "direction_swipe":
        const DirectionIcon = arrowDirection?.icon || ArrowUp;
        return (
          <div className="text-center space-y-8">
            <div className="text-xl mb-4">Swipe in this direction!</div>
            <div className="flex justify-center mb-8">
              <div className="p-8 bg-gray-100 rounded-full">
                <DirectionIcon className="h-16 w-16 text-primary" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
              {ARROW_DIRECTIONS.map(direction => {
                const Icon = direction.icon;
                return (
                  <Button
                    key={direction.swipe}
                    size="lg"
                    onClick={() => handleSwipe(direction.swipe)}
                    disabled={hasResponded}
                    className="h-16"
                  >
                    <Icon className="h-6 w-6" />
                  </Button>
                );
              })}
            </div>
          </div>
        );

      case "counting":
        return (
          <div className="text-center space-y-8">
            {showCountingEmojis ? (
              <div>
                <div className="text-xl mb-6">Count the cats! 🐱</div>
                <div className="grid grid-cols-6 gap-2 max-w-lg mx-auto">
                  {countingEmojis.emojis.map((emoji, idx) => (
                    <div key={idx} className="text-3xl p-2">
                      {emoji}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-xl mb-6">How many cats did you see?</div>
                <div className="grid grid-cols-5 gap-3 max-w-md mx-auto">
                  {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                    <Button
                      key={num}
                      size="lg"
                      onClick={() => submitResponse(num, Date.now() - challengeStartTime)}
                      disabled={hasResponded}
                      className="text-xl h-12"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "hold_timing":
        return (
          <div className="text-center space-y-8">
            <div className="text-xl mb-4">Hold for exactly 3 seconds!</div>
            <div className="text-4xl mb-6">
              {isHolding ? `${(holdDuration / 1000).toFixed(1)}s` : "0.0s"}
            </div>
            <Button
              size="lg"
              className="w-64 h-32 text-2xl"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseUp={handleTouchEnd}
              disabled={hasResponded}
            >
              {isHolding ? "HOLDING..." : "HOLD ME!"}
            </Button>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <p className="text-lg text-muted-foreground">Challenge loading...</p>
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
              Fast-paced challenges for {players.length} players!
            </p>
          </div>

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
                  {player.isHost && <Badge variant="secondary">Host (Spectator)</Badge>}
                </div>
              ))}
            </div>
            {currentPlayer.isHost && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Host Info:</strong> You'll see the live leaderboard and player progress, but won't participate in challenges.
                </p>
              </div>
            )}
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

  // Host View - Special screen for host during challenges
  if (gamePhase === "challenge" && showHostView) {
    const sortedPlayers = players
      .filter(p => !p.isHost) // Exclude host from participating
      .map(player => ({
        ...player,
        score: scores[player.id] || 0,
        hasResponded: playerResponses[player.id] !== undefined
      }))
      .sort((a, b) => b.score - a.score);

    return (
      <div 
        className="min-h-screen relative"
        style={{
          background: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url('/lovable-uploads/de24dc2c-7e3c-4f05-9e34-a18dc7d1e29c.png') repeat center center`,
          backgroundSize: 'auto'
        }}
      >
        <div className="flex h-screen">
          {/* Main Challenge Area */}
          <div className="flex-1 p-6 flex flex-col">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-4 flex items-center justify-center gap-2">
                🎮 Host Dashboard
              </h1>
              <div className="flex justify-center items-center gap-4 mb-4">
                <div className="bg-white/10 px-4 py-2 rounded-lg text-white">
                  Challenge {currentChallengeIndex + 1}/15
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-lg text-white font-bold text-xl">
                  {timeLeft}s
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-green-400 to-blue-400 h-3 rounded-full transition-all duration-1000"
                  style={{width: `${(timeLeft / 20) * 100}%`}}
                />
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-8 backdrop-blur-sm flex-1">
              <h2 className="text-3xl font-bold text-white mb-4">{challenge.name}</h2>
              <p className="text-white/80 text-xl mb-6">{challenge.instructions}</p>
              <p className="text-yellow-400 text-lg">Players are currently solving this challenge...</p>
              
              {/* Response Status */}
              <div className="mt-8">
                <h3 className="text-xl font-bold text-white mb-4">Response Status</h3>
                <div className="flex flex-wrap gap-3">
                  {sortedPlayers.map(player => (
                    <div 
                      key={player.id}
                      className={`px-4 py-2 rounded-full text-sm font-medium ${
                        player.hasResponded 
                          ? "bg-green-500 text-white" 
                          : "bg-yellow-500 text-black"
                      }`}
                    >
                      {player.playerName} {player.hasResponded ? "✅" : "⏳"}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Leaderboard */}
          <div className="w-80 bg-black/20 backdrop-blur-sm p-6 border-l border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">🏆 Live Leaderboard</h2>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                    index === 0 ? "bg-yellow-500/20 border border-yellow-400" :
                    index === 1 ? "bg-gray-300/20 border border-gray-400" :
                    index === 2 ? "bg-orange-400/20 border border-orange-400" :
                    "bg-white/10"
                  } ${player.hasResponded ? "opacity-100" : "opacity-70"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-white">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                    </span>
                    <div>
                      <div className="text-white font-medium">{player.playerName}</div>
                      {player.hasResponded && (
                        <div className="text-green-400 text-xs">Responded</div>
                      )}
                    </div>
                  </div>
                  <span className="text-white text-xl font-bold">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === "challenge") {
    const sortedPlayers = players
      .filter(p => !p.isHost)
      .map(player => ({
        ...player,
        score: scores[player.id] || 0,
        hasResponded: playerResponses[player.id] !== undefined
      }))
      .sort((a, b) => b.score - a.score);

    return (
      <div 
        className="min-h-screen relative"
        style={{
          background: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url('/lovable-uploads/de24dc2c-7e3c-4f05-9e34-a18dc7d1e29c.png') repeat center center`,
          backgroundSize: 'auto'
        }}
      >
        <div className="flex h-screen">
          {/* Main Challenge Area */}
          <div className="flex-1 p-6 flex flex-col">
            <div className="text-center mb-6">
              <div className="flex justify-center items-center gap-4 mb-4">
                <div className="bg-white/10 px-4 py-2 rounded-lg text-white">
                  Challenge {currentChallengeIndex + 1}/15
                </div>
                <div className="bg-white/10 px-4 py-2 rounded-lg text-white font-bold text-xl">
                  {timeLeft}s
                </div>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-green-400 to-blue-400 h-3 rounded-full transition-all duration-1000"
                  style={{width: `${(timeLeft / 20) * 100}%`}}
                />
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-8 backdrop-blur-sm flex-1">
              <h2 className="text-3xl font-bold text-white mb-4 text-center">{challenge.name}</h2>
              <p className="text-white/80 text-lg mb-8 text-center">{challenge.instructions}</p>
              
              <div className="flex justify-center">
                {renderChallenge()}
              </div>

              {hasResponded && (
                <div className="text-center mt-8">
                  <div className="bg-green-500/20 border border-green-400 rounded-lg px-6 py-3 inline-block">
                    <span className="text-green-400 font-medium">✅ Response Submitted! Waiting for others...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Leaderboard */}
          <div className="w-80 bg-black/20 backdrop-blur-sm p-6 border-l border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">🏆 Leaderboard</h2>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                    index === 0 ? "bg-yellow-500/20 border border-yellow-400" :
                    index === 1 ? "bg-gray-300/20 border border-gray-400" :
                    index === 2 ? "bg-orange-400/20 border border-orange-400" :
                    "bg-white/10"
                  } ${player.hasResponded ? "opacity-100" : "opacity-70"}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-white">
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                    </span>
                    <div>
                      <div className="text-white font-medium">{player.playerName}</div>
                      {player.hasResponded && (
                        <div className="text-green-400 text-xs">✅ Done</div>
                      )}
                      {!player.hasResponded && (
                        <div className="text-yellow-400 text-xs">⏳ Playing...</div>
                      )}
                    </div>
                  </div>
                  <span className="text-white text-xl font-bold">{player.score}</span>
                </div>
              ))}
            </div>
          </div>
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
      <div 
        className="min-h-screen relative p-6"
        style={{
          background: `linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.9)), url('/lovable-uploads/de24dc2c-7e3c-4f05-9e34-a18dc7d1e29c.png') repeat center center`,
          backgroundSize: 'auto'
        }}
      >
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