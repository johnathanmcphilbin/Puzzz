import {
  Trophy,
  Zap,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import { STATIC_CATS, getCatImageUrl } from '@/assets/catImages';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

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
  selectedCharacterId?: string;
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
    challengeStartTime?: number;
    countdownStart?: number;
    breakStart?: number;
  };
}

interface PuzzzPanicGameProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (updates: any) => void;
}

const CHALLENGES: Challenge[] = [
  {
    id: 'tap_to_ten',
    name: 'Tap to Ten',
    type: 'tap_counter',
    instructions: 'Tap the screen exactly 10 times as fast as you can!',
    timeLimit: 15,
  },
  {
    id: 'color_flash',
    name: 'Color Flash',
    type: 'color_word',
    instructions:
      "Tap the word that matches its text (not the color it's shown in)!",
    timeLimit: 10,
  },
  {
    id: 'tap_green',
    name: 'Tap When Green',
    type: 'reaction_time',
    instructions:
      'Wait for the screen to turn green, then tap as fast as possible!',
    timeLimit: 15,
  },
  {
    id: 'swipe_order',
    name: 'Swipe Order',
    type: 'swipe_sequence',
    instructions: 'Swipe in the exact order shown!',
    timeLimit: 10,
  },
  {
    id: 'pattern_match',
    name: 'Pattern Match',
    type: 'pattern',
    instructions: 'A pattern of shapes will flash. Tap the correct next shape!',
    timeLimit: 12,
  },
  {
    id: 'emoji_recall',
    name: 'Emoji Recall',
    type: 'emoji_memory',
    instructions:
      'Four emojis will appear briefly. Pick the one that was missing!',
    timeLimit: 15,
  },
  {
    id: 'spot_match',
    name: 'Spot the Match',
    type: 'sequence_match',
    instructions: 'Two emoji sequences will flash. Tap if they match!',
    timeLimit: 10,
  },
  {
    id: 'quick_math',
    name: 'Quick Math',
    type: 'math',
    instructions: 'Solve the equation as fast as possible!',
    timeLimit: 12,
  },
  {
    id: 'color_tap_race',
    name: 'Color Tap Race',
    type: 'color_tap',
    instructions: 'Tap all the blue shapes as fast as possible!',
    timeLimit: 15,
  },
  {
    id: 'tap_fastest',
    name: 'Tap the Fast One',
    type: 'speed_tap',
    instructions: 'One icon moves faster than the rest. Tap the fastest one!',
    timeLimit: 10,
  },
  {
    id: 'memory_flip',
    name: 'Memory Flip',
    type: 'grid_memory',
    instructions: 'A 3x3 grid will flash. Pick where the specific emoji was!',
    timeLimit: 15,
  },
  {
    id: 'stop_target',
    name: 'Stop at Target',
    type: 'timing',
    instructions: 'Tap to stop the bar in the green zone!',
    timeLimit: 10,
  },
  {
    id: 'shape_swipe',
    name: 'Shape Swipe',
    type: 'direction_swipe',
    instructions: 'Swipe in the direction the arrow is pointing!',
    timeLimit: 8,
  },
  {
    id: 'count_cats',
    name: 'Count the Cats',
    type: 'counting',
    instructions: 'Count how many cats you see!',
    timeLimit: 12,
  },
  {
    id: 'hold_release',
    name: 'Hold and Release',
    type: 'hold_timing',
    instructions: 'Hold the screen down and release exactly at 3 seconds!',
    timeLimit: 8,
  },
];

const EMOJIS = [
  '🐱',
  '🐶',
  '🐭',
  '🐹',
  '🐰',
  '🦊',
  '🐻',
  '🐼',
  '🐨',
  '🐯',
  '🦁',
  '🐸',
  '🐵',
  '🐔',
  '🐧',
  '🦆',
];
const SHAPES = ['⭐', '🔴', '🔵', '🟢', '🟡', '🟣', '⚫', '⚪', '🔶', '🔷'];

// Get random cat images for games
const getRandomCats = (count: number) => {
  const shuffled = [...STATIC_CATS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

const ARROW_DIRECTIONS = [
  { name: 'up', icon: ArrowUp, swipe: 'up' },
  { name: 'down', icon: ArrowDown, swipe: 'down' },
  { name: 'left', icon: ArrowLeft, swipe: 'left' },
  { name: 'right', icon: ArrowRight, swipe: 'right' },
];

export const PuzzzPanicGame: React.FC<PuzzzPanicGameProps> = ({
  room,
  players,
  currentPlayer,
  onUpdateRoom,
}) => {
  const [gamePhase, setGamePhase] = useState(
    room.gameState?.phase || 'waiting'
  );
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(
    room.gameState?.currentChallenge || 0
  );
  const [scores, setScores] = useState(room.gameState?.scores || {});
  const [timeLeft, setTimeLeft] = useState(0);
  const [challengeStartTime, setChallengeStartTime] = useState(0);
  const [hasResponded, setHasResponded] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [challengeOrder] = useState(room.gameState?.challengeOrder || []);
  const [characterData, setCharacterData] = useState<{ [key: string]: any }>(
    {}
  );
  const [currentBreakRoast, setCurrentBreakRoast] = useState<string | null>(
    null
  );

  // Challenge-specific state
  const [tapCount, setTapCount] = useState(0);
  const [colorWords, setColorWords] = useState<{
    word: string;
    color: string;
    options: string[];
    correctAnswer: string;
  }>();
  const [isGreen, setIsGreen] = useState(false);
  const [greenStartTime, setGreenStartTime] = useState(0);
  const [swipeSequence, setSwipeSequence] = useState<string[]>([]);
  const [userSwipes, setUserSwipes] = useState<string[]>([]);
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0);
  const [showSwipeSequence, setShowSwipeSequence] = useState(true);
  const [pattern, setPattern] = useState<{
    shapes: string[];
    nextOptions: string[];
  }>({ shapes: [], nextOptions: [] });
  const [emojiMemory, setEmojiMemory] = useState<{
    shown: string[];
    missing: string;
    options: string[];
  }>({ shown: [], missing: '', options: [] });
  const [showEmojiMemory, setShowEmojiMemory] = useState(true);
  const [sequenceMatch, setSequenceMatch] = useState<{
    seq1: string[];
    seq2: string[];
    match: boolean;
  }>({ seq1: [], seq2: [], match: false });
  const [showSequences, setShowSequences] = useState(true);
  const [mathProblem, setMathProblem] = useState<{
    question: string;
    answer: number;
    options: number[];
  }>({ question: '', answer: 0, options: [] });
  const [colorShapes, setColorShapes] = useState<{
    shapes: {
      cat?: { id: string; name: string; icon_url: string } | undefined;
      color: string;
      id: number;
    }[];
    tapped: Set<number>;
  }>({ shapes: [], tapped: new Set() });
  const [movingIcons, setMovingIcons] = useState<{
    icons: {
      cat?: { id: string; name: string; icon_url: string } | undefined;
      speed: number;
      id: number;
    }[];
    fastest: number;
  }>({ icons: [], fastest: 0 });
  const [gridMemory, setGridMemory] = useState<{
    grid: any[][];
    target: any;
    targetPos: { row: number; col: number };
  }>({ grid: [], target: null, targetPos: { row: 0, col: 0 } });
  const [showGrid, setShowGrid] = useState(true);
  const [barPosition, setBarPosition] = useState(0);
  const [targetZone, setTargetZone] = useState({ start: 40, end: 60 });
  const [arrowDirection, setArrowDirection] =
    useState<(typeof ARROW_DIRECTIONS)[0]>();
  const [countingEmojis, setCountingEmojis] = useState<{
    emojis: any[];
    catCount: number;
  }>({ emojis: [], catCount: 0 });
  const [showCountingEmojis, setShowCountingEmojis] = useState(true);
  const [holdStartTime, setHoldStartTime] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [holdDuration, setHoldDuration] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [breakTime, setBreakTime] = useState(5);

  const timerRef = useRef<NodeJS.Timeout>();
  const animationRef = useRef<number>();
  const greenTimeoutRef = useRef<NodeJS.Timeout>();
  const emojiTimeoutRef = useRef<NodeJS.Timeout>();
  const sequenceTimeoutRef = useRef<NodeJS.Timeout>();
  const gridTimeoutRef = useRef<NodeJS.Timeout>();
  const countingTimeoutRef = useRef<NodeJS.Timeout>();
  const holdIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current as any);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (greenTimeoutRef.current) clearTimeout(greenTimeoutRef.current);
      if (emojiTimeoutRef.current) clearTimeout(emojiTimeoutRef.current);
      if (sequenceTimeoutRef.current) clearTimeout(sequenceTimeoutRef.current);
      if (gridTimeoutRef.current) clearTimeout(gridTimeoutRef.current);
      if (countingTimeoutRef.current) clearTimeout(countingTimeoutRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  const challengeIndex =
    challengeOrder[currentChallengeIndex] ?? currentChallengeIndex;
  const challenge = CHALLENGES[challengeIndex % CHALLENGES.length];

  // Determine if current player is host
  const isHost = currentPlayer?.isHost || false;

  // Host view logic - host doesn't participate but can see leaderboard
  const showHostView = isHost && gamePhase === 'challenge';

  // Get player responses for real-time updates
  const playerResponses = room.gameState?.playerResponses || {};

  // Load character data whenever players change
  useEffect(() => {
    loadCharacterData();
  }, [players]);

  const loadCharacterData = async () => {
    const characterIds = players
      .map(p => p.selectedCharacterId)
      .filter((id): id is string => Boolean(id));

    if (characterIds.length === 0) {
      return;
    }

    try {
      // Load characters from database
      const { data, error } = await supabase
        .from('cat_characters')
        .select('id, name, icon_url')
        .in('id', characterIds);

      if (error) {
        console.error('Error loading character data:', error);
        return;
      }

      const characterMap =
        data?.reduce(
          (acc, char) => {
            acc[char.id] = char;
            return acc;
          },
          {} as { [key: string]: any }
        ) || {};

      setCharacterData(characterMap);
    } catch (error) {
      console.error('Error loading character data:', error);
    }
  };

  // Sync with room state
  useEffect(() => {
    if (room.gameState) {
      const newPhase = room.gameState.phase || 'waiting';
      const oldPhase = gamePhase;
      if (newPhase !== oldPhase) {
        console.log('[PuzzzPanic] Phase change:', oldPhase, '->', newPhase);
      }

      setGamePhase(newPhase);
      setCurrentChallengeIndex(room.gameState.currentChallenge || 0);
      setScores(room.gameState.scores || {});

      // Reset roast when entering a new break phase
      if (newPhase === 'break' && oldPhase !== 'break') {
        setCurrentBreakRoast(null);
      }

      // Reset timer flags when phase changes
      if (newPhase !== 'challenge') {
        setIsTimerRunning(false);
        setHasResponded(false);
      }
    }
  }, [room.gameState]);

  // Timer effect - sync across all devices using room data
  useEffect(() => {
    if (gamePhase === 'challenge' && timeLeft > 0) {
      setIsTimerRunning(true);
      timerRef.current = setTimeout(() => {
        const newTime = timeLeft - 1;
        setTimeLeft(newTime);

        // Only trigger nextChallenge and submit null response when timer naturally reaches 0
        if (newTime === 0) {
          if (currentPlayer.isHost) {
            setTimeout(() => nextChallenge(), 1000);
          }
          // Submit null response if player hasn't responded
          if (!hasResponded) {
            submitResponse(null, Date.now() - challengeStartTime);
          }
        }
      }, 1000);
    } else if (gamePhase !== 'challenge') {
      setIsTimerRunning(false);
    }

    // Only submit null response if timer naturally reaches 0 (not from sync)
    // We track this by checking if the timer was actually running before reaching 0

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeLeft, gamePhase, hasResponded, currentPlayer.isHost]);

  // Global timer sync - get timer start from room data
  useEffect(() => {
    if (gamePhase === 'challenge' && room.gameState?.challengeStartTime) {
      const serverStartTime = room.gameState.challengeStartTime;
      const now = Date.now();
      const elapsed = Math.floor((now - serverStartTime) / 1000);
      const newTimeLeft = Math.max(0, challenge.timeLimit - elapsed);

      if (Math.abs(timeLeft - newTimeLeft) > 1) {
        // Only sync if difference is significant
        setTimeLeft(newTimeLeft);
        setChallengeStartTime(serverStartTime);
      }
    }
  }, [room.gameState?.challengeStartTime, gamePhase]);

  // Countdown timer effect
  useEffect(() => {
    if (gamePhase === 'countdown' && room.gameState?.countdownStart) {
      const startTime = room.gameState.countdownStart;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const timeLeft = Math.max(0, 3 - elapsed);
      setCountdown(timeLeft);

      if (timeLeft > 0) {
        const timer = setTimeout(() => {
          setCountdown(timeLeft - 1);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [room.gameState?.countdownStart, countdown, gamePhase]);

  // Break timer effect
  useEffect(() => {
    if (gamePhase === 'break' && room.gameState?.breakStart) {
      const startTime = room.gameState.breakStart;
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const timeLeft = Math.max(0, 5 - elapsed);
      setBreakTime(timeLeft);

      if (timeLeft > 0) {
        const timer = setTimeout(() => {
          setBreakTime(timeLeft - 1);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [room.gameState?.breakStart, breakTime, gamePhase]);

  // Early return for invalid challenge
  if (!challenge) {
    return <div>Loading challenge...</div>;
  }

  // Initialize challenge when it starts
  useEffect(() => {
    if (gamePhase === 'challenge' && !hasResponded) {
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
    setShowSwipeSequence(true);
    setHoldStartTime(0);
    setIsHolding(false);
    setHoldDuration(0);

    switch (challenge.type) {
      case 'color_word':
        const words = ['RED', 'BLUE', 'GREEN', 'YELLOW'];
        const colors = [
          'text-red-500',
          'text-blue-500',
          'text-green-500',
          'text-yellow-500',
        ];
        const colorNames = ['RED', 'BLUE', 'GREEN', 'YELLOW'];

        // Ensure word and color are DIFFERENT to avoid confusion
        const word = words[Math.floor(Math.random() * words.length)] || 'RED';
        let availableColors = colors.filter(color => {
          if (word === 'RED' && color.includes('red')) return false;
          if (word === 'BLUE' && color.includes('blue')) return false;
          if (word === 'GREEN' && color.includes('green')) return false;
          if (word === 'YELLOW' && color.includes('yellow')) return false;
          return true;
        });

        // If no available colors (shouldn't happen), use any color
        if (availableColors.length === 0) availableColors = colors;

        const color =
          availableColors[Math.floor(Math.random() * availableColors.length)] ||
          'text-red-500';

        // Get the correct color name from the actual color class
        let correctColorName = 'RED';
        if (color.includes('red')) correctColorName = 'RED';
        else if (color.includes('blue')) correctColorName = 'BLUE';
        else if (color.includes('green')) correctColorName = 'GREEN';
        else if (color.includes('yellow')) correctColorName = 'YELLOW';

        setColorWords({
          word,
          color,
          options: colorNames,
          correctAnswer: correctColorName,
        });
        break;

      case 'reaction_time':
        setIsGreen(false);
        const delay = Math.random() * 4000 + 2000; // 2-6 seconds
        greenTimeoutRef.current = setTimeout(() => {
          setIsGreen(true);
          setGreenStartTime(Date.now());
        }, delay);
        break;

      case 'swipe_sequence':
        const directions = ['up', 'down', 'left', 'right'];
        const sequence = Array.from({ length: 3 }, () => {
          const dir = directions[Math.floor(Math.random() * directions.length)];
          return dir || 'up';
        });
        setSwipeSequence(sequence);
        setShowSwipeSequence(true);
        setCurrentSwipeIndex(0);
        setUserSwipes([]);
        // Show sequence for 3 seconds, then hide it for memory test
        setTimeout(() => {
          setShowSwipeSequence(false);
        }, 3000);
        break;

      case 'pattern':
        // Create actual patterns instead of random shapes
        const patternTypes = [
          // Simple repeating patterns
          () => ['⭐', '🔴', '⭐', '🔴'], // Star-Red repeating
          () => ['🔵', '🔵', '🟢', '🔵'], // Blue-Blue-Green repeating
          () => ['🟡', '🔶', '🟡', '🔶'], // Yellow-Orange repeating
          // Alternating size patterns
          () => ['⭐', '🔴', '🔵', '🟢'], // Rainbow sequence
          () => ['🔵', '🟢', '🟡', '🔴'], // Color wheel
          // Number-based patterns
          () => ['🔴', '🔴', '🔵', '🔴'], // 2-1-1 pattern
        ];

        const patternType =
          patternTypes[Math.floor(Math.random() * patternTypes.length)];
        const basePattern = patternType?.() || ['⭐', '🔴', '⭐', '🔴'];

        // Show first 3 elements, ask for 4th
        const patternShapes = basePattern.slice(0, 3);
        const correctNext = basePattern[3] || '⭐';

        // Create wrong options that don't match the pattern
        const wrongOptions = SHAPES.filter(s => s !== correctNext).slice(0, 2);
        const patternOptions = [correctNext, ...wrongOptions].sort(
          () => Math.random() - 0.5
        );

        setPattern({ shapes: patternShapes, nextOptions: patternOptions });
        break;

      case 'emoji_memory':
        const allEmojis = [...EMOJIS];
        const shownEmojis = allEmojis.splice(0, 3);
        const missingEmoji =
          allEmojis[Math.floor(Math.random() * allEmojis.length)] || '🐱';
        const wrongEmojis = allEmojis
          .filter(e => e !== missingEmoji)
          .slice(0, 2);
        const emojiOptions = [missingEmoji, ...wrongEmojis].sort(
          () => Math.random() - 0.5
        );
        setEmojiMemory({
          shown: shownEmojis,
          missing: missingEmoji,
          options: emojiOptions,
        });
        setShowEmojiMemory(true);
        emojiTimeoutRef.current = setTimeout(
          () => setShowEmojiMemory(false),
          2000
        );
        break;

      case 'sequence_match':
        const seq1 = Array.from({ length: 3 }, () => {
          const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
          return emoji || '🐱';
        });
        const isMatch = Math.random() > 0.5;
        const seq2 = isMatch
          ? [...seq1]
          : Array.from({ length: 3 }, () => {
              const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
              return emoji || '🐶';
            });
        setSequenceMatch({ seq1, seq2, match: isMatch });
        setShowSequences(true);
        sequenceTimeoutRef.current = setTimeout(
          () => setShowSequences(false),
          3000
        );
        break;

      case 'math':
        const a = Math.floor(Math.random() * 9) + 1;
        const b = Math.floor(Math.random() * 9) + 1;
        const c = Math.floor(Math.random() * 4) + 1;
        const answer = a + b * c;
        const wrongAnswers = [
          answer + 1,
          answer - 1,
          answer + Math.floor(Math.random() * 5) + 2,
        ];
        const mathOptions = [answer, ...wrongAnswers.slice(0, 2)].sort(
          () => Math.random() - 0.5
        );
        setMathProblem({
          question: `${a} + ${b} × ${c}`,
          answer,
          options: mathOptions,
        });
        break;

      case 'color_tap':
        const randomCats = getRandomCats(8);
        const colorCatsArray = Array.from({ length: 8 }, (_, i) => ({
          cat: randomCats[i] || STATIC_CATS[0],
          color:
            Math.random() > 0.4
              ? 'blue'
              : ['red', 'green', 'yellow'][Math.floor(Math.random() * 3)] ||
                'red',
          id: i,
        }));
        setColorShapes({ shapes: colorCatsArray, tapped: new Set() });
        break;

      case 'speed_tap':
        const randomCatsForSpeed = getRandomCats(4);
        const iconArray = Array.from({ length: 4 }, (_, i) => ({
          cat: randomCatsForSpeed[i] || STATIC_CATS[i],
          speed: Math.random() * 2 + 1,
          id: i,
        }));
        const fastestIconId = iconArray.reduce(
          (fastest, icon, idx) =>
            (iconArray[fastest]?.speed || 0) < icon.speed ? idx : fastest,
          0
        );
        setMovingIcons({ icons: iconArray, fastest: fastestIconId });
        break;

      case 'grid_memory':
        const memoryGrid = Array.from({ length: 3 }, () =>
          Array.from({ length: 3 }, () =>
            Math.random() > 0.7 ? getRandomCats(1)[0] || null : null
          )
        );
        const nonEmptyPositions: { row: number; col: number; cat: any }[] = [];
        for (let r = 0; r < 3; r++) {
          for (let c = 0; c < 3; c++) {
            if (memoryGrid[r] && memoryGrid[r]![c]) {
              nonEmptyPositions.push({
                row: r,
                col: c,
                cat: memoryGrid[r]![c]!,
              });
            }
          }
        }

        if (nonEmptyPositions.length > 0) {
          const targetPosition =
            nonEmptyPositions[
              Math.floor(Math.random() * nonEmptyPositions.length)
            ];
          const targetCat = targetPosition?.cat ?? null;
          setGridMemory({
            grid: memoryGrid,
            target: targetCat || (STATIC_CATS[0] ?? null),
            targetPos: {
              row: targetPosition?.row || 1,
              col: targetPosition?.col || 1,
            },
          });
        } else {
          // Fallback - ensure at least one cat exists
          memoryGrid[1]![1] = STATIC_CATS[0] ?? null;
          setGridMemory({
            grid: memoryGrid,
            target: STATIC_CATS[0] ?? null,
            targetPos: { row: 1, col: 1 },
          });
        }
        setShowGrid(true);
        gridTimeoutRef.current = setTimeout(() => setShowGrid(false), 2500);
        break;

      case 'timing':
        setBarPosition(0);
        const targetStart = Math.random() * 40 + 20;
        const targetWidth = Math.random() * 20 + 15; // Ensure reasonable target size
        setTargetZone({
          start: targetStart,
          end: Math.min(targetStart + targetWidth, 90),
        });
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = (elapsed / (challenge.timeLimit * 100)) * 100; // Adjust speed based on time limit
          setBarPosition(progress);
          if (progress < 100 && !hasResponded) {
            animationRef.current = requestAnimationFrame(animate);
          }
        };
        animationRef.current = requestAnimationFrame(animate);
        break;

      case 'direction_swipe':
        setArrowDirection(
          ARROW_DIRECTIONS[Math.floor(Math.random() * ARROW_DIRECTIONS.length)]
        );
        break;

      case 'counting':
        const totalCats = Math.floor(Math.random() * 15) + 10;
        const targetCatCount = Math.floor(Math.random() * 6) + 2;
        const targetCat = STATIC_CATS[0]; // Always use the first cat as the target
        const targetCatImages = Array(targetCatCount).fill(targetCat);
        const otherCats = Array(totalCats - targetCatCount)
          .fill(null)
          .map(() => {
            const otherCatOptions = STATIC_CATS.filter(
              c => c.id !== targetCat?.id
            );
            return (
              otherCatOptions[
                Math.floor(Math.random() * otherCatOptions.length)
              ] || STATIC_CATS[1]
            );
          });
        const allCountingCats = [...targetCatImages, ...otherCats].sort(
          () => Math.random() - 0.5
        );
        setCountingEmojis({
          emojis: allCountingCats,
          catCount: targetCatCount,
        });
        setShowCountingEmojis(true);
        countingTimeoutRef.current = setTimeout(
          () => setShowCountingEmojis(false),
          3000
        );
        break;
    }
  };

  const submitResponse = (response: any, responseTime: number) => {
    if (gamePhase !== 'challenge') return;
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
          [currentPlayer.id]: { response, score, time: responseTime },
        },
      },
    });
  };

  const calculateScore = (response: any, responseTime: number): number => {
    let baseScore = 0;
    const timeBonus = Math.max(
      0,
      (challenge.timeLimit * 1000 - responseTime) / 100
    );

    switch (challenge.type) {
      case 'tap_counter':
        baseScore =
          response === 10
            ? 1000
            : Math.max(0, 1000 - Math.abs(response - 10) * 100);
        break;
      case 'color_word':
        baseScore = response === colorWords?.correctAnswer ? 1000 : 0;
        break;
      case 'reaction_time':
        if (response && isGreen && greenStartTime > 0) {
          const reactionTime = Date.now() - greenStartTime;
          baseScore = Math.max(200, 1000 - reactionTime / 5);
        } else {
          baseScore = 0;
        }
        break;
      case 'swipe_sequence':
        baseScore =
          JSON.stringify(response) === JSON.stringify(swipeSequence) ? 1000 : 0;
        break;
      case 'pattern':
        baseScore = response === pattern.nextOptions[0] ? 1000 : 0;
        break;
      case 'emoji_memory':
        baseScore = response === emojiMemory.missing ? 1000 : 0;
        break;
      case 'sequence_match':
        baseScore = response === sequenceMatch.match ? 1000 : 0;
        break;
      case 'math':
        baseScore = response === mathProblem.answer ? 1000 : 0;
        break;
      case 'color_tap':
        const blueShapes = colorShapes.shapes.filter(
          s => s.color === 'blue'
        ).length;
        const correctTaps = response || 0;
        baseScore =
          correctTaps === blueShapes
            ? 1000
            : Math.max(0, 1000 - Math.abs(correctTaps - blueShapes) * 200);
        break;
      case 'speed_tap':
        baseScore = response === movingIcons.fastest ? 1000 : 0;
        break;
      case 'grid_memory':
        const correctPos = gridMemory.targetPos;
        baseScore =
          response &&
          response.row === correctPos.row &&
          response.col === correctPos.col
            ? 1000
            : 0;
        break;
      case 'timing':
        if (response >= targetZone.start && response <= targetZone.end) {
          const centerTarget = (targetZone.start + targetZone.end) / 2;
          const distance = Math.abs(response - centerTarget);
          baseScore = Math.max(600, 1000 - distance * 20);
        }
        break;
      case 'direction_swipe':
        baseScore = response === arrowDirection?.swipe ? 1000 : 0;
        break;
      case 'counting':
        baseScore =
          response === countingEmojis.catCount
            ? 1000
            : Math.max(
                0,
                1000 - Math.abs(response - countingEmojis.catCount) * 150
              );
        break;
      case 'hold_timing':
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

    // Create array of all challenge indices and shuffle them to ensure no repeats
    const allChallengeIndices = Array.from(
      { length: CHALLENGES.length },
      (_, i) => i
    );
    const shuffledChallenges = allChallengeIndices
      .sort(() => Math.random() - 0.5)
      .slice(0, 10); // Take first 10 from shuffled array

    const activePlayers = players.filter(p => !p.isHost); // Only include non-host players in scoring

    onUpdateRoom({
      gameState: {
        phase: 'countdown',
        currentChallenge: 0,
        scores: activePlayers.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}),
        challengeOrder: shuffledChallenges,
        playerResponses: {},
        countdownStart: Date.now(),
      },
    });

    // Start countdown then begin challenge
    setTimeout(() => {
      onUpdateRoom({
        gameState: {
          phase: 'challenge',
          currentChallenge: 0,
          scores: activePlayers.reduce((acc, p) => ({ ...acc, [p.id]: 0 }), {}),
          challengeOrder: shuffledChallenges,
          playerResponses: {},
          challengeStartTime: Date.now(),
        },
      });
    }, 3000); // 3 second countdown
  };

  const nextChallenge = () => {
    if (!currentPlayer.isHost) return;

    // Calculate scores
    const playerResponses = room.gameState?.playerResponses || {};
    const newScores = { ...scores };

    Object.entries(playerResponses).forEach(
      ([playerId, data]: [string, any]) => {
        newScores[playerId] = (newScores[playerId] || 0) + (data.score || 0);
      }
    );

    const nextIndex = currentChallengeIndex + 1;
    if (nextIndex >= 10) {
      onUpdateRoom({
        gameState: {
          ...room.gameState,
          phase: 'finished',
          scores: newScores,
        },
      });
    } else {
      // Add break phase before next challenge
      onUpdateRoom({
        gameState: {
          ...room.gameState,
          phase: 'break',
          currentChallenge: nextIndex,
          scores: newScores,
          playerResponses: {},
          breakStart: Date.now(),
        },
      });

      // Auto-start next challenge after 5 seconds
      setTimeout(() => {
        onUpdateRoom({
          gameState: {
            ...room.gameState,
            phase: 'countdown',
            currentChallenge: nextIndex,
            scores: newScores,
            playerResponses: {},
            countdownStart: Date.now(),
          },
        });

        // Then start the actual challenge after countdown
        setTimeout(() => {
          onUpdateRoom({
            gameState: {
              ...room.gameState,
              phase: 'challenge',
              currentChallenge: nextIndex,
              scores: newScores,
              playerResponses: {},
              challengeStartTime: Date.now(),
            },
          });
        }, 3000); // 3 second countdown
      }, 5000); // 5 second break
    }
  };

  const resetGame = () => {
    if (!currentPlayer.isHost) return;

    onUpdateRoom({
      gameState: {
        phase: 'waiting',
        currentChallenge: 0,
        scores: {},
        playerResponses: {},
        challengeOrder: [],
      },
    });
  };

  // Touch/gesture handlers
  const handleTouchStart = (
    e: React.TouchEvent | React.MouseEvent,
    action?: string
  ) => {
    e.preventDefault();
    if (hasResponded) return;

    if (challenge.type === 'hold_timing') {
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

    if (challenge.type === 'hold_timing' && isHolding) {
      setIsHolding(false);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
      const duration = Date.now() - holdStartTime;
      submitResponse(duration, Date.now() - challengeStartTime);
    }
  };

  const handleSwipe = (direction: string) => {
    if (hasResponded) return;

    if (challenge.type === 'swipe_sequence') {
      const newSwipes = [...userSwipes, direction];
      setUserSwipes(newSwipes);
      setCurrentSwipeIndex(newSwipes.length);

      if (newSwipes.length === swipeSequence.length) {
        submitResponse(newSwipes, Date.now() - challengeStartTime);
      }
    } else if (challenge.type === 'direction_swipe') {
      submitResponse(direction, Date.now() - challengeStartTime);
    }
  };

  const handleColorShapeTap = (shapeId: number) => {
    if (hasResponded) return;

    // Add debugging to see what's happening
    console.log('Color tap clicked:', shapeId, 'hasResponded:', hasResponded);

    const shape = colorShapes.shapes.find(s => s.id === shapeId);
    console.log('Found shape:', shape);

    if (shape?.color === 'blue') {
      const newTapped = new Set([...colorShapes.tapped, shapeId]);
      setColorShapes(prev => ({ ...prev, tapped: newTapped }));

      console.log('Tapped blue shape, new tapped count:', newTapped.size);

      const blueShapes = colorShapes.shapes.filter(s => s.color === 'blue');
      console.log('Total blue shapes:', blueShapes.length);

      if (newTapped.size === blueShapes.length) {
        console.log('All blue shapes tapped, submitting response');
        submitResponse(newTapped.size, Date.now() - challengeStartTime);
      }
    } else {
      console.log('Not a blue shape, color was:', shape?.color);
    }
  };

  // Check if all players have responded
  useEffect(() => {
    if (gamePhase === 'challenge' && currentPlayer.isHost) {
      const playerResponses = room.gameState?.playerResponses || {};
      const responseCount = Object.keys(playerResponses).length;
      const activePlayers = players.filter(p => !p.isHost); // Exclude host from response count

      if (responseCount === activePlayers.length) {
        // Wait a moment then move to next challenge
        setTimeout(() => nextChallenge(), 2000);
      }
    }
  }, [
    room.gameState?.playerResponses,
    gamePhase,
    currentPlayer.isHost,
    players.length,
  ]);

  const renderChallenge = () => {
    if (!challenge) return null;

    switch (challenge.type) {
      case 'tap_counter':
        return (
          <div className="space-y-6 px-4 text-center">
            <div className="text-6xl font-bold text-primary sm:text-8xl">
              {tapCount}/10
            </div>
            <Button
              size="lg"
              className="h-24 w-48 bg-black text-2xl text-white hover:bg-gray-800 sm:h-32 sm:w-64 sm:text-3xl"
              onClick={() => {
                if (!hasResponded && tapCount < 10) {
                  const newCount = tapCount + 1;
                  setTapCount(newCount);
                  if (newCount === 10) {
                    submitResponse(10, Date.now() - challengeStartTime);
                  }
                }
              }}
              disabled={hasResponded || tapCount >= 10}
            >
              {tapCount >= 10 ? 'DONE!' : 'TAP!'}
            </Button>
          </div>
        );

      case 'color_word':
        return (
          <div className="space-y-8 px-4 text-center">
            <div className="mb-4 text-lg text-white">
              What COLOR is this word displayed in?
            </div>
            <div
              className={`text-6xl font-bold md:text-8xl ${colorWords?.color || 'text-red-500'} mb-8`}
            >
              {colorWords?.word || 'Loading...'}
            </div>
            <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
              {(colorWords?.options || []).map(colorName => (
                <Button
                  key={colorName}
                  size="lg"
                  onClick={() =>
                    submitResponse(colorName, Date.now() - challengeStartTime)
                  }
                  disabled={hasResponded}
                  className="h-14 border border-white/20 bg-black text-lg text-white hover:bg-gray-800"
                >
                  {colorName}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'reaction_time':
        return (
          <div className="space-y-6 px-4 text-center">
            <div
              className={`mx-auto h-48 w-48 rounded-full transition-all duration-500 sm:h-64 sm:w-64 ${
                isGreen ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <Button
              size="lg"
              className="h-14 w-40 bg-black text-lg text-white hover:bg-gray-800 sm:h-16 sm:w-48 sm:text-xl"
              onClick={() => {
                if (isGreen && !hasResponded) {
                  submitResponse(true, Date.now() - challengeStartTime);
                } else if (!isGreen && !hasResponded) {
                  // Clicked too early - penalize
                  submitResponse(false, Date.now() - challengeStartTime);
                }
              }}
              disabled={hasResponded}
            >
              {hasResponded ? 'DONE!' : isGreen ? 'TAP NOW!' : 'WAIT...'}
            </Button>
          </div>
        );

      case 'swipe_sequence':
        return (
          <div className="space-y-4 px-4 text-center">
            {showSwipeSequence ? (
              <div>
                <div className="mb-4 text-lg sm:text-2xl">
                  Remember this sequence:
                </div>
                <div className="mb-6 flex justify-center gap-2 sm:gap-4">
                  {swipeSequence.map((direction, idx) => {
                    const Icon =
                      ARROW_DIRECTIONS.find(d => d.swipe === direction)?.icon ||
                      ArrowUp;
                    return (
                      <div
                        key={idx}
                        className="rounded-lg border-2 border-blue-500 bg-blue-100 p-3 sm:p-6"
                      >
                        <Icon className="h-8 w-8 text-blue-600 sm:h-12 sm:w-12" />
                      </div>
                    );
                  })}
                </div>
                <div className="text-sm text-yellow-600 sm:text-lg">
                  Memorize the sequence... You'll need to repeat it from memory!
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4 text-lg sm:text-2xl">
                  Swipe in the same order!
                </div>
                <div className="mb-4 text-sm text-muted-foreground">
                  Progress: {currentSwipeIndex}/{swipeSequence.length}
                </div>
                <div className="mx-auto grid max-w-sm grid-cols-2 gap-3">
                  {ARROW_DIRECTIONS.map(direction => {
                    const Icon = direction.icon;
                    return (
                      <Button
                        key={direction.swipe}
                        size="lg"
                        onClick={() => handleSwipe(direction.swipe)}
                        disabled={hasResponded}
                        className="h-14 bg-black text-white hover:bg-gray-800 sm:h-16"
                      >
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case 'pattern':
        return (
          <div className="space-y-4 px-4 text-center">
            <div className="mb-4 text-lg sm:text-xl">
              What comes next in this pattern?
            </div>
            <div className="mb-6 flex flex-wrap justify-center gap-2 sm:gap-4">
              {pattern.shapes.map((shape, idx) => (
                <div
                  key={idx}
                  className="rounded-lg bg-gray-100 p-2 text-4xl sm:p-3 sm:text-6xl"
                >
                  {shape}
                </div>
              ))}
              <div className="rounded-lg bg-gray-300 p-2 text-4xl sm:p-3 sm:text-6xl">
                ?
              </div>
            </div>
            <div className="mx-auto flex max-w-sm flex-wrap justify-center gap-3">
              {pattern.nextOptions.map(option => (
                <Button
                  key={option}
                  size="lg"
                  onClick={() =>
                    submitResponse(option, Date.now() - challengeStartTime)
                  }
                  disabled={hasResponded}
                  className="h-14 w-14 bg-black text-3xl text-white hover:bg-gray-800 sm:h-16 sm:w-16 sm:text-4xl"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'emoji_memory':
        return (
          <div className="space-y-4 px-4 text-center">
            {showEmojiMemory ? (
              <div>
                <div className="mb-4 text-lg sm:text-xl">
                  Remember these emojis:
                </div>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
                  {emojiMemory.shown.map((emoji, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg bg-gray-100 p-2 text-4xl sm:p-4 sm:text-6xl"
                    >
                      {emoji}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-4 text-lg sm:text-xl">
                  Which emoji was missing?
                </div>
                <div className="mx-auto flex max-w-sm flex-wrap justify-center gap-2 sm:gap-4">
                  {emojiMemory.options.map(option => (
                    <Button
                      key={option}
                      size="lg"
                      onClick={() =>
                        submitResponse(option, Date.now() - challengeStartTime)
                      }
                      disabled={hasResponded}
                      className="h-14 w-14 bg-black text-3xl text-white hover:bg-gray-800 sm:h-16 sm:w-16 sm:text-4xl"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'sequence_match':
        return (
          <div className="space-y-6 px-4 text-center">
            {showSequences ? (
              <div>
                <div className="mb-6 text-lg sm:text-xl">
                  Do these sequences match?
                </div>
                <div className="space-y-4">
                  <div className="flex justify-center gap-2">
                    {sequenceMatch.seq1.map((emoji, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border-2 border-blue-300 bg-blue-100 p-2 text-4xl"
                      >
                        {emoji}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-center gap-2">
                    {sequenceMatch.seq2.map((emoji, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border-2 border-green-300 bg-green-100 p-2 text-4xl"
                      >
                        {emoji}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6 text-lg sm:text-xl">Did they match?</div>
                <div className="flex justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={() =>
                      submitResponse(true, Date.now() - challengeStartTime)
                    }
                    disabled={hasResponded}
                    className="h-14 bg-black px-6 text-lg text-white hover:bg-gray-800 sm:h-16 sm:px-8 sm:text-xl"
                  >
                    YES
                  </Button>
                  <Button
                    size="lg"
                    onClick={() =>
                      submitResponse(false, Date.now() - challengeStartTime)
                    }
                    disabled={hasResponded}
                    className="h-14 bg-black px-6 text-lg text-white hover:bg-gray-800 sm:h-16 sm:px-8 sm:text-xl"
                  >
                    NO
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 'math':
        return (
          <div className="space-y-8 text-center">
            <div className="mb-8 text-6xl font-bold">
              {mathProblem.question} = ?
            </div>
            <div className="mx-auto grid max-w-md grid-cols-3 gap-4">
              {mathProblem.options.map(option => (
                <Button
                  key={option}
                  size="lg"
                  onClick={() =>
                    submitResponse(option, Date.now() - challengeStartTime)
                  }
                  disabled={hasResponded}
                  className="h-16 bg-black text-2xl text-white hover:bg-gray-800"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'color_tap':
        return (
          <div className="space-y-4 px-4 text-center">
            <div className="mb-4 text-lg sm:text-xl">
              Tap all the BLUE cats!
            </div>
            <div className="mx-auto grid max-w-md grid-cols-4 gap-2 sm:gap-4">
              {colorShapes.shapes.map(shape => (
                <Button
                  key={shape.id}
                  size="lg"
                  onClick={() => handleColorShapeTap(shape.id)}
                  disabled={hasResponded || colorShapes.tapped.has(shape.id)}
                  className={`relative h-16 bg-black p-1 text-white hover:bg-gray-800 sm:h-20 ${colorShapes.tapped.has(shape.id) ? 'opacity-50' : ''}`}
                  variant={
                    colorShapes.tapped.has(shape.id) ? 'secondary' : 'outline'
                  }
                >
                  <img
                    src={getCatImageUrl(shape.cat?.icon_url || null)}
                    alt={shape.cat?.name || 'Cat'}
                    className={`h-full w-full rounded object-cover ${
                      shape.color === 'blue'
                        ? 'hue-rotate-[240deg] saturate-150 filter'
                        : shape.color === 'red'
                          ? 'hue-rotate-[0deg] saturate-150 filter'
                          : shape.color === 'green'
                            ? 'hue-rotate-[120deg] saturate-150 filter'
                            : shape.color === 'yellow'
                              ? 'hue-rotate-[60deg] saturate-150 filter'
                              : ''
                    }`}
                  />
                </Button>
              ))}
            </div>
          </div>
        );

      case 'speed_tap':
        return (
          <div className="space-y-4 px-4 text-center">
            <div className="mb-4 text-lg sm:text-xl">
              Tap the FASTEST moving cat!
            </div>
            <div className="mx-auto flex max-w-lg flex-wrap justify-center gap-3 sm:gap-6">
              {movingIcons.icons.map(icon => (
                <Button
                  key={icon.id}
                  size="lg"
                  onClick={() =>
                    submitResponse(icon.id, Date.now() - challengeStartTime)
                  }
                  disabled={hasResponded}
                  className="relative h-14 w-14 overflow-hidden bg-black p-1 text-white hover:bg-gray-800 sm:h-16 sm:w-16"
                >
                  <div
                    className="absolute inset-1 flex animate-bounce items-center justify-center"
                    style={{
                      animationDuration: `${2 / icon.speed}s`,
                      animationTimingFunction: 'ease-in-out',
                    }}
                  >
                    <img
                      src={getCatImageUrl(icon.cat?.icon_url || null)}
                      alt={icon.cat?.name || 'Cat'}
                      className="h-full w-full rounded object-cover"
                    />
                  </div>
                </Button>
              ))}
            </div>
          </div>
        );

      case 'grid_memory':
        return (
          <div className="space-y-6 px-4 text-center">
            {showGrid ? (
              <div>
                <div className="mb-6 text-lg sm:text-xl">
                  Remember where this cat is!
                </div>
                <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
                  {gridMemory.grid.map((row, rowIdx) =>
                    row.map((cell, colIdx) => (
                      <div
                        key={`${rowIdx}-${colIdx}`}
                        className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 p-1 sm:h-16 sm:w-16"
                      >
                        {cell && (
                          <img
                            src={getCatImageUrl(cell?.icon_url)}
                            alt={cell?.name || 'Cat'}
                            className="h-full w-full rounded object-cover"
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6 text-lg sm:text-xl">
                  Where was this cat?
                </div>
                <div className="mb-4">
                  <div className="mx-auto h-12 w-12 rounded-lg bg-gray-100 p-1 sm:h-16 sm:w-16">
                    <img
                      src={getCatImageUrl(gridMemory.target?.icon_url)}
                      alt={gridMemory.target?.name || 'Target Cat'}
                      className="h-full w-full rounded object-cover"
                    />
                  </div>
                </div>
                <div className="mx-auto grid max-w-xs grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const row = Math.floor(idx / 3);
                    const col = idx % 3;
                    return (
                      <Button
                        key={idx}
                        size="lg"
                        onClick={() =>
                          submitResponse(
                            { row, col },
                            Date.now() - challengeStartTime
                          )
                        }
                        disabled={hasResponded}
                        className="h-12 w-12 bg-black text-lg text-white hover:bg-gray-800 sm:h-16 sm:w-16"
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

      case 'timing':
        return (
          <div className="space-y-8 text-center">
            <div className="mb-4 text-xl">Stop the bar in the GREEN zone!</div>
            <div className="relative mx-auto h-12 w-full max-w-lg overflow-hidden rounded-lg bg-gray-200">
              <div
                className="absolute top-0 h-full bg-green-500 opacity-40"
                style={{
                  left: `${targetZone.start}%`,
                  width: `${targetZone.end - targetZone.start}%`,
                }}
              />
              <div
                className="absolute top-0 h-full w-3 bg-blue-600 transition-all duration-75"
                style={{ left: `${barPosition}%` }}
              />
            </div>
            <Button
              size="lg"
              className="h-16 w-48 bg-black text-xl text-white hover:bg-gray-800"
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

      case 'direction_swipe':
        const DirectionIcon = arrowDirection?.icon || ArrowUp;
        return (
          <div className="space-y-8 text-center">
            <div className="mb-4 text-xl">Swipe in this direction!</div>
            <div className="mb-8 flex justify-center">
              <div className="rounded-full bg-gray-100 p-8">
                <DirectionIcon className="h-16 w-16 text-primary" />
              </div>
            </div>
            <div className="mx-auto grid max-w-sm grid-cols-2 gap-4">
              {ARROW_DIRECTIONS.map(direction => {
                const Icon = direction.icon;
                return (
                  <Button
                    key={direction.swipe}
                    size="lg"
                    onClick={() => handleSwipe(direction.swipe)}
                    disabled={hasResponded}
                    className="h-16 bg-black text-white hover:bg-gray-800"
                  >
                    <Icon className="h-6 w-6" />
                  </Button>
                );
              })}
            </div>
          </div>
        );

      case 'counting':
        return (
          <div className="space-y-6 px-4 text-center">
            {showCountingEmojis ? (
              <div>
                <div className="mb-6 text-lg sm:text-xl">
                  Count this specific cat!
                </div>
                <div className="mb-4">
                  <div className="mx-auto h-12 w-12 rounded-lg border-2 border-yellow-400 bg-gray-100 p-1 sm:h-16 sm:w-16">
                    <img
                      src={getCatImageUrl(STATIC_CATS[0]?.icon_url || null)}
                      alt={STATIC_CATS[0]?.name || 'Target Cat'}
                      className="h-full w-full rounded object-cover"
                    />
                  </div>
                </div>
                <div className="mx-auto grid max-w-lg grid-cols-6 gap-1 sm:gap-2">
                  {countingEmojis.emojis.map((cat, idx) => (
                    <div key={idx} className="h-8 w-8 p-1 sm:h-12 sm:w-12">
                      <img
                        src={getCatImageUrl(cat?.icon_url)}
                        alt={cat?.name || 'Cat'}
                        className="h-full w-full rounded object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6 text-lg sm:text-xl">
                  How many of this cat did you see?
                </div>
                <div className="mx-auto grid max-w-md grid-cols-5 gap-3">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                    <Button
                      key={num}
                      size="lg"
                      onClick={() =>
                        submitResponse(num, Date.now() - challengeStartTime)
                      }
                      disabled={hasResponded}
                      className="h-12 bg-black text-lg text-white hover:bg-gray-800 sm:h-14 sm:text-xl"
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'hold_timing':
        return (
          <div className="space-y-8 text-center">
            <div className="mb-4 text-xl">Hold for exactly 3 seconds!</div>
            <div className="mb-6 text-4xl">
              {isHolding ? `${(holdDuration / 1000).toFixed(1)}s` : '0.0s'}
            </div>
            <Button
              size="lg"
              className="h-32 w-64 bg-black text-2xl text-white hover:bg-gray-800"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleTouchStart}
              onMouseUp={handleTouchEnd}
              disabled={hasResponded}
            >
              {isHolding ? 'HOLDING...' : 'HOLD ME!'}
            </Button>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <p className="text-lg text-muted-foreground">
              Challenge loading...
            </p>
          </div>
        );
    }
  };

  // Countdown phase
  if (gamePhase === 'countdown') {
    return (
      <div className="gradient-bg flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="mb-8 text-6xl font-bold text-white">Get Ready!</h1>
          <div className="animate-pulse text-9xl font-bold text-white">
            {countdown || 'GO!'}
          </div>
          <p className="mt-4 text-xl text-white/80">Challenge starting...</p>
        </div>
      </div>
    );
  }

  // Name and shame function
  const getNameAndShameComment = () => {
    // Return cached roast if we're in the same break
    if (currentBreakRoast) {
      return currentBreakRoast;
    }

    // Only show for non-host players with scores
    const nonHostPlayers = players.filter(p => !p.isHost);
    if (nonHostPlayers.length === 0) return null;

    const playersWithScores = nonHostPlayers.map(player => ({
      ...player,
      score: scores[player.id] || 0,
    }));

    // Find the worst performing player (lowest score)
    const worstPlayer = playersWithScores.reduce((worst, current) =>
      current.score < worst.score ? current : worst
    );

    // Don't shame if there's no clear worst player or if all players have 0 score
    if (
      !worstPlayer ||
      playersWithScores.every(p => p.score === worstPlayer.score)
    ) {
      return null;
    }

    const roastComments = [
      `${worstPlayer.playerName} is an absolute disaster! Maybe try checkers next time! 🤡`,
      `${worstPlayer.playerName} makes a brick wall look smart! 🧱`,
      `${worstPlayer.playerName} is proof that participation trophies were a mistake! 🏆💸`,
      `${worstPlayer.playerName} couldn't find their way out of a paper bag with GPS! 🗺️`,
      `${worstPlayer.playerName} is the reason we can't have nice things! 💀`,
      `${worstPlayer.playerName} makes sloths look like speed demons! 🦥`,
      `${worstPlayer.playerName} is a walking advertisement for staying in school! 📚❌`,
      `${worstPlayer.playerName} couldn't win if they were the only player! 😤`,
      `${worstPlayer.playerName} is single-handedly ruining everyone's fun! 🚫`,
      `${worstPlayer.playerName} makes watching grass grow seem thrilling! 🌱💤`,
      `${worstPlayer.playerName} is the human equivalent of Internet Explorer! 🐌💻`,
      `${worstPlayer.playerName} should stick to breathing - that seems to be their only skill! 💨`,
      `${worstPlayer.playerName} is living proof that natural selection isn't working! 🧬❌`,
      `${worstPlayer.playerName} makes rocks jealous of their intelligence! 🪨🧠`,
      `${worstPlayer.playerName} couldn't pour water out of a boot with instructions on the heel! 👢💧`,
      `${worstPlayer.playerName} is the reason shampoo has instructions! 🧴📖`,
      `${worstPlayer.playerName} makes a broken clock look reliable! ⏰💥`,
      `${worstPlayer.playerName} is about as useful as a chocolate teapot! 🍫🫖`,
      `${worstPlayer.playerName} couldn't hit water if they fell out of a boat! 🚤💦`,
      `${worstPlayer.playerName} is the human embodiment of a participation trophy! 🏆😭`,
    ];

    const selectedRoast =
      roastComments[Math.floor(Math.random() * roastComments.length)] || null;

    // Cache the roast for this break
    setCurrentBreakRoast(selectedRoast);

    return selectedRoast;
  };

  // Break phase
  if (gamePhase === 'break') {
    // Show current leaderboard during break (excluding host)
    const sortedPlayers = players
      .filter(p => !p.isHost)
      .map(player => ({
        ...player,
        score: scores[player.id] || 0,
      }))
      .sort((a, b) => b.score - a.score);

    const nameAndShameComment = getNameAndShameComment();

    return (
      <div className="gradient-bg flex min-h-screen items-center justify-center px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-8 text-3xl font-bold text-white sm:text-4xl">
            Take a Break!
          </h1>
          <div className="mb-4 text-5xl font-bold text-white sm:text-6xl">
            {breakTime}s
          </div>
          <p className="mb-8 text-lg text-white/80 sm:text-xl">
            Next challenge starting soon...
          </p>

          {/* Name and Shame Section - shows throughout entire break */}
          {nameAndShameComment && (
            <div className="mx-auto mb-6 rounded-lg border-4 border-red-500 bg-white p-4 sm:p-6">
              <div className="mb-3 text-xl font-bold text-red-600 sm:text-2xl">
                🔥 ROAST OF THE ROUND 🔥
              </div>
              <div className="text-base font-semibold text-black sm:text-lg">
                {nameAndShameComment}
              </div>
            </div>
          )}

          {/* Mini leaderboard (excluding host) */}
          <div className="mx-auto max-w-md rounded-lg bg-white p-4 sm:p-6">
            <h3 className="mb-4 text-lg font-bold text-black sm:text-xl">
              Current Standings
            </h3>
            <div className="space-y-2">
              {sortedPlayers.slice(0, 3).map((player, index) => {
                const playerCharacter = player.selectedCharacterId
                  ? characterData[player.selectedCharacterId]
                  : null;
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-black">
                        {index + 1}.
                      </span>
                      {playerCharacter && (
                        <div className="h-6 w-6 overflow-hidden rounded-full bg-gray-100">
                          <img
                            src={getCatImageUrl(playerCharacter.icon_url)}
                            alt={playerCharacter.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      )}
                      <span className="font-medium text-black">
                        {player.playerName}
                      </span>
                    </div>
                    <span className="font-bold text-black">{player.score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'waiting') {
    return (
      <div className="gradient-bg min-h-screen p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <div className="mb-6">
              <img
                src="/src/assets/puzzle-panic.png"
                alt="Puzzz Panic Logo"
                className="mx-auto h-auto w-full max-w-md"
              />
            </div>
            <p className="text-lg text-muted-foreground">
              Fast-paced challenges for {players.length} players!
            </p>
          </div>

          <Card className="mb-6 p-6">
            <h3 className="mb-4 text-xl font-semibold">
              Players ({players.length})
            </h3>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {players.map(player => (
                <div
                  key={player.id}
                  className="flex items-center gap-2 rounded-lg bg-secondary p-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {player.playerName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">
                    {player.playerName}
                  </span>
                  {player.isHost && (
                    <Badge variant="secondary">Host (Spectator)</Badge>
                  )}
                </div>
              ))}
            </div>
            {currentPlayer.isHost && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm text-blue-800">
                  <strong>Host Info:</strong> You'll see the live leaderboard
                  and player progress, but won't participate in challenges.
                </p>
              </div>
            )}
          </Card>

          {currentPlayer.isHost && (
            <div className="text-center">
              <Button
                onClick={startGame}
                size="lg"
                className="bg-black px-8 py-4 text-xl text-white hover:bg-gray-800"
              >
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
  if (gamePhase === 'challenge' && showHostView) {
    const sortedPlayers = players
      .filter(p => !p.isHost) // Exclude host from participating
      .map(player => ({
        ...player,
        score: scores[player.id] || 0,
        hasResponded: playerResponses[player.id] !== undefined,
      }))
      .sort((a, b) => b.score - a.score);

    return (
      <div className="gradient-bg min-h-screen">
        <div className="flex h-screen">
          {/* Main Challenge Area */}
          <div className="flex flex-1 flex-col p-6">
            <div className="mb-8 text-center">
              <h1 className="mb-4 flex items-center justify-center gap-2 text-4xl font-bold text-white">
                🎮 Host Dashboard
              </h1>
              <div className="mb-4 flex items-center justify-center gap-4">
                <div className="rounded-lg border bg-white px-4 py-2 text-foreground shadow-sm">
                  Challenge {currentChallengeIndex + 1}/10
                </div>
                <div className="rounded-lg border bg-white px-4 py-2 text-xl font-bold text-foreground shadow-sm">
                  {timeLeft}s
                </div>
              </div>
              <div className="h-3 w-full rounded-full border bg-white shadow-sm">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-green-400 to-blue-400 transition-all duration-1000"
                  style={{
                    width: `${(timeLeft / challenge.timeLimit) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex-1 rounded-lg bg-white p-8 shadow-lg">
              <h2 className="mb-4 text-3xl font-bold text-foreground">
                {challenge.name}
              </h2>
              <p className="mb-6 text-xl text-foreground/80">
                {challenge.instructions}
              </p>
              <p className="text-lg text-yellow-600">
                Players are currently solving this challenge...
              </p>

              {/* Response Status */}
              <div className="mt-8">
                <h3 className="mb-4 text-xl font-bold text-foreground">
                  Response Status
                </h3>
                <div className="flex flex-wrap gap-3">
                  {sortedPlayers.map(player => (
                    <div
                      key={player.id}
                      className={`rounded-full px-4 py-2 text-sm font-medium ${
                        player.hasResponded
                          ? 'bg-green-500 text-white'
                          : 'bg-yellow-500 text-black'
                      }`}
                    >
                      {player.playerName} {player.hasResponded ? '✅' : '⏳'}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Leaderboard */}
          <div className="w-80 border-l border-gray-200 bg-white p-6 shadow-lg">
            <h2 className="mb-6 text-center text-2xl font-bold text-foreground">
              🏆 Live Leaderboard
            </h2>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between rounded-lg border p-4 transition-all ${
                    index === 0
                      ? 'border-yellow-400 bg-yellow-100'
                      : index === 1
                        ? 'border-gray-400 bg-gray-100'
                        : index === 2
                          ? 'border-orange-400 bg-orange-100'
                          : 'border-gray-200 bg-gray-50'
                  } ${player.hasResponded ? 'opacity-100' : 'opacity-70'}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-foreground">
                      {index === 0
                        ? '🥇'
                        : index === 1
                          ? '🥈'
                          : index === 2
                            ? '🥉'
                            : `#${index + 1}`}
                    </span>
                    <div>
                      <div className="font-medium text-foreground">
                        {player.playerName}
                      </div>
                      {player.hasResponded && (
                        <div className="text-xs text-green-600">Responded</div>
                      )}
                    </div>
                  </div>
                  <span className="text-xl font-bold text-foreground">
                    {player.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'challenge') {
    const sortedPlayers = players
      .filter(p => !p.isHost)
      .map(player => ({
        ...player,
        score: scores[player.id] || 0,
        hasResponded: playerResponses[player.id] !== undefined,
      }))
      .sort((a, b) => b.score - a.score);

    return (
      <div className="gradient-bg min-h-screen">
        <div className="flex h-screen">
          {/* Main Challenge Area */}
          <div className="flex flex-1 flex-col p-6">
            <div className="mb-6 text-center">
              <div className="mb-4 flex items-center justify-center gap-4">
                <div className="rounded-lg border bg-white px-4 py-2 text-foreground shadow-sm">
                  Challenge {currentChallengeIndex + 1}/10
                </div>
                <div className="rounded-lg border bg-white px-4 py-2 text-xl font-bold text-foreground shadow-sm">
                  {timeLeft}s
                </div>
              </div>
              <div className="mb-4 h-3 w-full rounded-full border bg-white shadow-sm">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-green-400 to-blue-400 transition-all duration-1000"
                  style={{
                    width: `${(timeLeft / challenge.timeLimit) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div className="flex-1 rounded-lg bg-white p-8 shadow-lg">
              <h2 className="mb-4 text-center text-3xl font-bold text-foreground">
                {challenge.name}
              </h2>
              <p className="mb-8 text-center text-lg text-foreground/80">
                {challenge.instructions}
              </p>

              <div className="flex justify-center">{renderChallenge()}</div>

              {hasResponded && (
                <div className="mt-8 text-center">
                  <div className="inline-block rounded-lg border border-green-400 bg-green-500/20 px-6 py-3">
                    <span className="font-medium text-green-600">
                      ✅ Response Submitted! Waiting for others...
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Leaderboard - Only show for host */}
          {currentPlayer.isHost && (
            <div className="w-80 border-l border-gray-200 bg-white p-6 shadow-lg">
              <h2 className="mb-6 text-center text-2xl font-bold text-foreground">
                🏆 Leaderboard
              </h2>
              <div className="space-y-3">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between rounded-lg border p-4 transition-all ${
                      index === 0
                        ? 'border-yellow-400 bg-yellow-100'
                        : index === 1
                          ? 'border-gray-400 bg-gray-100'
                          : index === 2
                            ? 'border-orange-400 bg-orange-100'
                            : 'border-gray-200 bg-gray-50'
                    } ${player.hasResponded ? 'opacity-100' : 'opacity-70'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-foreground">
                        {index === 0
                          ? '🥇'
                          : index === 1
                            ? '🥈'
                            : index === 2
                              ? '🥉'
                              : `#${index + 1}`}
                      </span>
                      {player.selectedCharacterId && (
                        <img
                          src={getCatImageUrl(player.selectedCharacterId)}
                          alt="Player cat"
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <div className="font-medium text-foreground">
                          {player.playerName}
                        </div>
                        {player.hasResponded && (
                          <div className="text-xs text-green-600">✅ Done</div>
                        )}
                        {!player.hasResponded && (
                          <div className="text-xs text-yellow-600">
                            ⏳ Playing...
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xl font-bold text-foreground">
                      {player.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gamePhase === 'finished') {
    const sortedPlayers = players
      .filter(p => !p.isHost) // Exclude host from final results
      .map(player => ({
        ...player,
        score: scores[player.id] || 0,
      }))
      .sort((a, b) => b.score - a.score);

    const nameAndShameComment = getNameAndShameComment();

    return (
      <div className="gradient-bg min-h-screen p-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8">
            <Trophy className="mx-auto mb-4 h-16 w-16 text-yellow-500" />
            <h1 className="mb-2 text-4xl font-bold">Puzzz Panic Complete!</h1>
            <p className="text-lg text-muted-foreground">
              🎉 {sortedPlayers[0]?.playerName} wins with{' '}
              {sortedPlayers[0]?.score} points!
            </p>
          </div>

          {/* Final Name and Shame Section */}
          {nameAndShameComment && (
            <div className="mx-auto mb-6 max-w-2xl rounded-lg border-4 border-red-500 bg-white p-4 sm:p-6">
              <div className="mb-3 text-xl font-bold text-red-600 sm:text-2xl">
                🔥 FINAL ROAST 🔥
              </div>
              <div className="text-base font-semibold text-black sm:text-lg">
                {nameAndShameComment}
              </div>
            </div>
          )}

          <Card className="mb-6 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Final Leaderboard</h2>
            <div className="space-y-3">
              {sortedPlayers.map((player, index) => {
                const playerCharacter = player.selectedCharacterId
                  ? characterData[player.selectedCharacterId]
                  : null;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between rounded-lg p-3 ${
                      index === 0
                        ? 'border-2 border-yellow-300 bg-yellow-100'
                        : index === 1
                          ? 'border-2 border-gray-300 bg-gray-100'
                          : index === 2
                            ? 'border-2 border-orange-300 bg-orange-100'
                            : 'bg-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold">#{index + 1}</span>
                      {playerCharacter && (
                        <div className="h-8 w-8 overflow-hidden rounded-full bg-white">
                          <img
                            src={getCatImageUrl(playerCharacter.icon_url)}
                            alt={playerCharacter.name}
                            className="h-full w-full object-cover p-0.5"
                          />
                        </div>
                      )}
                      <span className="font-medium">{player.playerName}</span>
                    </div>
                    <span className="text-xl font-bold">
                      {player.score} pts
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>

          {currentPlayer.isHost && (
            <Button
              onClick={resetGame}
              size="lg"
              className="bg-black px-8 py-4 text-xl text-white hover:bg-gray-800"
            >
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
