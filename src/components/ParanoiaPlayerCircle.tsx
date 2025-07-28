import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

import { Coins } from 'lucide-react';

interface Player {
  id: string;
  player_name: string;
  player_id: string;
  is_host: boolean;
  selected_character_id?: string;
}

interface ParanoiaPlayerCircleProps {
  players: Player[];
  playerOrder: string[];
  currentTurnIndex: number;
  targetPlayerId: string | null;
  currentRound: number;
  phase: string;
  isFlipping: boolean;
  currentAnswer?: string | null;
}

export function ParanoiaPlayerCircle({
  players,
  playerOrder,
  currentTurnIndex,
  targetPlayerId,
  currentRound,
  phase,
  isFlipping,
  currentAnswer
}: ParanoiaPlayerCircleProps) {
  const [characterData, setCharacterData] = useState<{[key: string]: any}>({});

  // Load character data
  useEffect(() => {
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

    loadCharacterData();
  }, [players]);

  const getPlayerCirclePosition = (index: number, total: number) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
    const radius = 120;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  const answerPlayerIndex = currentAnswer ? playerOrder.findIndex(id => {
    const player = players.find(p => p.player_name === currentAnswer);
    return player?.player_id === id;
  }) : -1;

  return (
    <div className="relative w-80 h-80 mx-auto">
      <svg width="320" height="320" className="absolute inset-0">
        <circle
          cx="160"
          cy="160"
          r="120"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="2"
          strokeDasharray="5,5"
        />
        
        {playerOrder.map((playerId, index) => {
          const player = players.find(p => p.player_id === playerId);
          const playerCharacter = player?.selected_character_id ? characterData[player.selected_character_id] : null;
          const { x, y } = getPlayerCirclePosition(index, playerOrder.length);
          const isCurrentTurn = index === currentTurnIndex;
          const isTarget = playerId === targetPlayerId;
          const isAnswerTarget = index === answerPlayerIndex;
          
          return (
            <g key={playerId}>
              {/* Cat icon background circle */}
              <circle
                cx={160 + x}
                cy={160 + y}
                r="22"
                fill={isCurrentTurn ? "hsl(var(--primary))" : isTarget ? "hsl(var(--destructive))" : "hsl(var(--muted))"}
                stroke={isCurrentTurn || isTarget ? "hsl(var(--background))" : "hsl(var(--border))"}
                strokeWidth="3"
                className={`transition-all duration-500 ${isCurrentTurn ? 'animate-pulse' : ''}`}
              />
              
              {/* Cat icon */}
              {playerCharacter && (
                <image
                  x={160 + x - 18}
                  y={160 + y - 18}
                  width="36"
                  height="36"
                  href={playerCharacter.icon_url || '/placeholder.svg'}
                  className="rounded-full"
                  clipPath="circle(18px at 18px 18px)"
                />
              )}
              
              {/* Fallback initial if no character */}
              {!playerCharacter && (
                <text
                  x={160 + x}
                  y={160 + y + 6}
                  textAnchor="middle"
                  className="text-lg font-bold fill-background"
                >
                  {player?.player_name?.charAt(0)?.toUpperCase()}
                </text>
              )}
              
              <text
                x={160 + x}
                y={160 + y + 45}
                textAnchor="middle"
                className="text-xs font-medium fill-foreground"
              >
                {player?.player_name}
              </text>
             
             {isCurrentTurn && phase === "playing" && (
               <path
                 d={`M ${160 + x + 25} ${160 + y} L ${160 + x + 35} ${160 + y - 5} L ${160 + x + 35} ${160 + y + 5} Z`}
                 fill="hsl(var(--primary))"
                 className="animate-pulse"
               />
             )}

             {/* Speech bubble for question asker */}
             {isCurrentTurn && (phase === "answering" || phase === "waiting_for_flip" || phase === "coin_flip" || phase === "revealed" || phase === "not_revealed") && (
               <g className="animate-fade-in">
                 <rect
                   x={160 + x - 40}
                   y={160 + y - 55}
                   width="80"
                   height="25"
                   rx="12"
                   fill="hsl(var(--primary))"
                   stroke="hsl(var(--primary))"
                   strokeWidth="1"
                 />
                 <polygon
                   points={`${160 + x - 5},${160 + y - 30} ${160 + x + 5},${160 + y - 30} ${160 + x},${160 + y - 20}`}
                   fill="hsl(var(--primary))"
                 />
                 <text
                   x={160 + x}
                   y={160 + y - 38}
                   textAnchor="middle"
                   className="text-xs font-medium fill-primary-foreground"
                 >
                   Asked!
                 </text>
               </g>
             )}

             {/* Speech bubble for answer target */}
             {isAnswerTarget && (
               <g className="animate-fade-in">
                 <rect
                   x={160 + x - 40}
                   y={160 + y + 30}
                   width="80"
                   height="25"
                   rx="12"
                   fill="hsl(var(--destructive))"
                   stroke="hsl(var(--destructive))"
                   strokeWidth="1"
                 />
                 <polygon
                   points={`${160 + x - 5},${160 + y + 30} ${160 + x + 5},${160 + y + 30} ${160 + x},${160 + y + 20}`}
                   fill="hsl(var(--destructive))"
                 />
                 <text
                   x={160 + x}
                   y={160 + y + 47}
                   textAnchor="middle"
                   className="text-xs font-medium fill-destructive-foreground"
                 >
                   Chosen!
                 </text>
               </g>
             )}
           </g>
          );
        })}
      </svg>
      
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm font-medium text-muted-foreground">Round {currentRound}</div>
          {phase === "coin_flip" && (
            <div className="mt-2">
              <Coins className={`h-8 w-8 text-primary mx-auto ${isFlipping ? 'animate-spin' : ''}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}