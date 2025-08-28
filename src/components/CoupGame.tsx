import React, { useState, useEffect, useCallback } from 'react';

import { getCatImageUrl } from '@/assets/catImages';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Room, Player } from '@/types/room';

interface CoupGameProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (room: Room) => void;
}

type CoupRole =
  | 'ballet-cat'
  | 'dino-cat'
  | 'aura-cat'
  | 'chill-cat'
  | 'princess-cat';
type ActionType =
  | 'income'
  | 'foreign-aid'
  | 'tax'
  | 'steal'
  | 'exchange'
  | 'assassinate'
  | 'coup';

interface CoupCard {
  id: string;
  role: CoupRole;
  revealed: boolean;
}

interface CoupPlayer {
  id: string;
  name: string;
  coins: number;
  influences: CoupCard[];
  eliminated: boolean;
}

interface GameAction {
  type: ActionType;
  playerId: string;
  targetId?: string | undefined;
  role?: CoupRole | undefined;
}

interface GameState {
  phase:
    | 'waiting'
    | 'playing'
    | 'action-pending'
    | 'challenge-pending'
    | 'block-pending'
    | 'game-over';
  currentTurnPlayer: string;
  players: CoupPlayer[];
  deck: CoupRole[];
  treasury: number;
  pendingAction?: GameAction;
  challengeTimer?: number;
  blockTimer?: number;
  winner?: string;
  actionLog: string[];
}

const COUP_ROLES = {
  'ballet-cat': {
    name: 'Ballet Cat',
    icon: 'ballet-cat.jpg',
    description: 'Can collect 3 coins (Tax) and block Foreign Aid',
    actions: ['tax'] as ActionType[],
    blocks: ['foreign-aid'] as ActionType[],
  },
  'dino-cat': {
    name: 'Dino Cat',
    icon: 'dino-cat.jpg',
    description: 'Can pay 3 coins to eliminate an influence',
    actions: ['assassinate'] as ActionType[],
    blocks: [] as ActionType[],
  },
  'aura-cat': {
    name: 'Aura Cat',
    icon: 'auracat.png',
    description: 'Can steal 2 coins from another player',
    actions: ['steal'] as ActionType[],
    blocks: ['steal'] as ActionType[],
  },
  'chill-cat': {
    name: 'Chill Cat',
    icon: 'chill-cat.jpg',
    description: 'Can exchange cards and block stealing',
    actions: ['exchange'] as ActionType[],
    blocks: ['steal'] as ActionType[],
  },
  'princess-cat': {
    name: 'Princess Cat',
    icon: 'king-cat.jpg', // Using king-cat as princess
    description: 'Can block assassination attempts',
    actions: [] as ActionType[],
    blocks: ['assassinate'] as ActionType[],
  },
};

export default function CoupGame({
  room,
  players,
  currentPlayer,
  onUpdateRoom,
}: CoupGameProps) {
  const { toast } = useToast();
  const [gameState, setGameState] = useState<GameState>(() => ({
    phase: 'waiting',
    currentTurnPlayer: '',
    players: [],
    deck: [],
    treasury: 50,
    actionLog: [],
  }));

  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showCardSelection, setShowCardSelection] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [cardsToSelect, setCardsToSelect] = useState<CoupCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);

  const initializeGame = useCallback(() => {
    // Create deck with 3 of each role
    const deck: CoupRole[] = [];
    Object.keys(COUP_ROLES).forEach(role => {
      for (let i = 0; i < 3; i++) {
        deck.push(role as CoupRole);
      }
    });

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = deck[i]!;
      deck[i] = deck[j]!;
      deck[j] = temp;
    }

    // Deal 2 cards to each player
    const gamePlayers: CoupPlayer[] = players.map(player => {
      const influences: CoupCard[] = [];
      for (let i = 0; i < 2; i++) {
        const role = deck.pop()!;
        influences.push({
          id: `${player.id}-${i}`,
          role,
          revealed: false,
        });
      }
      return {
        id: player.id,
        name: player.playerName,
        coins: 2,
        influences,
        eliminated: false,
      };
    });

    const newGameState: GameState = {
      phase: 'playing',
      currentTurnPlayer: players[0]?.id || '',
      players: gamePlayers,
      deck,
      treasury: 50 - players.length * 2,
      actionLog: [
        'Game started! Each player starts with 2 coins and 2 influence cards.',
      ],
    };

    setGameState(newGameState);
    updateRoomGameState(newGameState);
  }, [players]);

  const updateRoomGameState = (newState: GameState) => {
    const updatedRoom = {
      ...room,
      gameState: newState,
    };
    onUpdateRoom(updatedRoom);
  };

  const getCurrentGamePlayer = () => {
    return (gameState.players || []).find(p => p.id === currentPlayer.id);
  };

  const isCurrentPlayerTurn = () => {
    return gameState.currentTurnPlayer === currentPlayer.id;
  };

  const canPerformAction = (action: ActionType): boolean => {
    const player = getCurrentGamePlayer();
    if (!player || !isCurrentPlayerTurn()) return false;

    if (action === 'coup' && player.coins < 7) return false;
    if (action === 'assassinate' && player.coins < 3) return false;

    return true;
  };

  const performAction = (
    action: ActionType,
    targetId?: string,
    role?: CoupRole
  ) => {
    const pendingAction: GameAction = {
      type: action,
      playerId: currentPlayer.id,
      targetId,
      role,
    };

    // Check if action can be challenged or blocked
    const challengeable = ['tax', 'steal', 'exchange', 'assassinate'];
    const blockable = ['foreign-aid', 'steal', 'assassinate'];

    if (challengeable.includes(action)) {
      setGameState(prev => {
        const newState = {
          ...prev,
          phase: 'challenge-pending' as const,
          pendingAction,
          challengeTimer: 10,
        };
        updateRoomGameState(newState);
        return newState;
      });

      // Auto-resolve if no challenge after timer
      setTimeout(() => {
        setGameState(prev => {
          if (prev.phase === 'challenge-pending') {
            // Check if action can be blocked
            if (blockable.includes(action)) {
              const newState = {
                ...prev,
                phase: 'block-pending' as const,
                blockTimer: 10,
              };
              updateRoomGameState(newState);
              return newState;
            } else {
              const newState = resolveAction(prev);
              updateRoomGameState(newState);
              return newState;
            }
          }
          return prev;
        });
      }, 10000);
    } else if (blockable.includes(action)) {
      // Actions that can be blocked but not challenged
      setGameState(prev => {
        const newState = {
          ...prev,
          phase: 'block-pending' as const,
          pendingAction,
          blockTimer: 10,
        };
        updateRoomGameState(newState);
        return newState;
      });

      setTimeout(() => {
        setGameState(prev => {
          if (prev.phase === 'block-pending') {
            const newState = resolveAction(prev);
            updateRoomGameState(newState);
            return newState;
          }
          return prev;
        });
      }, 10000);
    } else {
      // Actions that can't be challenged or blocked
      setGameState(currentState => {
        const newState = resolveAction({ ...currentState, pendingAction });
        updateRoomGameState(newState);
        return newState;
      });
    }
  };

  const resolveAction = (state: GameState): GameState => {
    if (!state.pendingAction) return state;

    const action = state.pendingAction;
    const player = state.players.find(p => p.id === action.playerId)!;
    const target = action.targetId
      ? state.players.find(p => p.id === action.targetId)
      : null;

    const newState = { ...state };
    let logMessage = '';

    switch (action.type) {
      case 'income':
        player.coins += 1;
        newState.treasury -= 1;
        logMessage = `${player.name} took 1 coin (Income)`;
        break;

      case 'foreign-aid':
        player.coins += 2;
        newState.treasury -= 2;
        logMessage = `${player.name} took 2 coins (Foreign Aid)`;
        break;

      case 'tax':
        player.coins += 3;
        newState.treasury -= 3;
        logMessage = `${player.name} used Ballet Cat to collect 3 coins (Tax)`;
        break;

      case 'steal':
        if (target) {
          const stolen = Math.min(2, target.coins);
          target.coins -= stolen;
          player.coins += stolen;
          logMessage = `${player.name} used Aura Cat to steal ${stolen} coins from ${target.name}`;
        }
        break;

      case 'assassinate':
        player.coins -= 3;
        newState.treasury += 3;
        if (target) {
          // Target must lose an influence
          logMessage = `${player.name} used Dino Cat to assassinate ${target.name}`;
          // This would trigger influence loss dialog for target
        }
        break;

      case 'coup':
        player.coins -= 7;
        newState.treasury += 7;
        if (target) {
          logMessage = `${player.name} launched a Coup against ${target.name}`;
          // This would trigger influence loss for target
        }
        break;

      case 'exchange':
        // Draw 2 cards from deck, choose 2 to keep
        logMessage = `${player.name} used Chill Cat to exchange cards`;
        break;
    }

    // Move to next player
    const currentIndex = state.players.findIndex(
      p => p.id === state.currentTurnPlayer
    );
    const nextIndex = (currentIndex + 1) % state.players.length;
    newState.currentTurnPlayer = state.players[nextIndex]?.id || '';

    newState.actionLog.push(logMessage);
    newState.phase = 'playing';
    delete newState.pendingAction;

    return newState;
  };

  const challengeAction = () => {
    if (!gameState.pendingAction) return;

    const action = gameState.pendingAction;
    const challenger = getCurrentGamePlayer()!;
    const actor = gameState.players.find(p => p.id === action.playerId)!;

    // Check if actor has the required role
    const requiredRole = getRequiredRole(action.type);
    const hasRole = actor.influences.some(
      inf => !inf.revealed && inf.role === requiredRole
    );

    if (hasRole) {
      // Challenge failed - challenger loses influence
      toast({
        title: 'Challenge Failed!',
        description: `${actor.name} revealed ${COUP_ROLES[requiredRole].name}. You lose an influence.`,
        variant: 'destructive',
      });
      // Trigger influence loss for challenger
    } else {
      // Challenge succeeded - actor loses influence
      toast({
        title: 'Challenge Succeeded!',
        description: `${actor.name} was bluffing! They lose an influence.`,
      });
      // Trigger influence loss for actor
    }
  };

  const blockAction = (blockingRole: CoupRole) => {
    if (!gameState.pendingAction) return;

    const action = gameState.pendingAction;
    const blocker = getCurrentGamePlayer()!;

    // Check if the role can block this action
    const canBlock = COUP_ROLES[blockingRole].blocks.includes(
      action.type as any
    );

    if (canBlock) {
      setGameState(prev => {
        const newState = {
          ...prev,
          phase: 'challenge-pending' as const, // Block can be challenged
          actionLog: [
            ...prev.actionLog,
            `${blocker.name} attempts to block with ${COUP_ROLES[blockingRole].name}`,
          ],
          pendingAction: {
            ...prev.pendingAction!,
            role: blockingRole, // Store which role was claimed for blocking
          },
        };
        updateRoomGameState(newState);
        return newState;
      });
    }
  };

  const getRequiredRole = (action: ActionType): CoupRole => {
    const roleMap: Record<ActionType, CoupRole> = {
      income: 'ballet-cat', // Default
      'foreign-aid': 'ballet-cat',
      tax: 'ballet-cat',
      steal: 'aura-cat',
      exchange: 'chill-cat',
      assassinate: 'dino-cat',
      coup: 'ballet-cat',
    };
    return roleMap[action];
  };

  const getAvailableTargets = () => {
    return (gameState.players || []).filter(
      p => p.id !== currentPlayer.id && !p.eliminated
    );
  };

  const renderPlayerCard = (player: CoupPlayer) => {
    const isCurrentTurn = player.id === gameState.currentTurnPlayer;
    const isCurrentPlayer = player.id === currentPlayer.id;

    return (
      <Card
        key={player.id}
        className={`${isCurrentTurn ? 'ring-2 ring-primary' : ''} ${player.eliminated ? 'opacity-50' : ''}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">{player.name}</CardTitle>
            <Badge variant={isCurrentPlayer ? 'default' : 'secondary'}>
              {player.coins} coins
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-2 flex gap-2">
            {(player.influences || []).map((influence, index) => (
              <div
                key={influence.id}
                className={`h-16 w-12 rounded border-2 ${influence.revealed ? 'border-destructive' : 'border-primary'} flex items-center justify-center bg-card`}
              >
                {influence.revealed ? (
                  <img
                    src={getCatImageUrl(COUP_ROLES[influence.role].icon)}
                    alt={COUP_ROLES[influence.role].name}
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : isCurrentPlayer ? (
                  // Only show actual cards to current player
                  <img
                    src={getCatImageUrl(COUP_ROLES[influence.role].icon)}
                    alt={COUP_ROLES[influence.role].name}
                    className="h-8 w-8 rounded object-cover"
                  />
                ) : (
                  // Show card back to other players
                  <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs">
                    ?
                  </div>
                )}
              </div>
            ))}
          </div>
          {isCurrentTurn && (
            <Badge variant="default" className="text-xs">
              Current Turn
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderActionButtons = () => {
    if (!isCurrentPlayerTurn() || gameState.phase !== 'playing') return null;

    const player = getCurrentGamePlayer()!;
    const mustCoup = player.coins >= 10;

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Choose Your Action</h3>
        <div className="grid grid-cols-2 gap-2">
          {!mustCoup && (
            <>
              <Button onClick={() => performAction('income')} variant="outline">
                Income (+1 coin)
              </Button>
              <Button
                onClick={() => performAction('foreign-aid')}
                variant="outline"
              >
                Foreign Aid (+2 coins)
              </Button>
              <Button onClick={() => performAction('tax')} variant="outline">
                Tax - Ballet Cat (+3 coins)
              </Button>
              <Button
                onClick={() => setShowActionDialog(true)}
                variant="outline"
                disabled={!getAvailableTargets().length}
              >
                Steal - Aura Cat
              </Button>
              <Button
                onClick={() => performAction('exchange')}
                variant="outline"
              >
                Exchange - Chill Cat
              </Button>
              <Button
                onClick={() => setShowActionDialog(true)}
                variant="outline"
                disabled={player.coins < 3 || !getAvailableTargets().length}
              >
                Assassinate - Dino Cat
              </Button>
            </>
          )}
          <Button
            onClick={() => setShowActionDialog(true)}
            variant="destructive"
            disabled={player.coins < 7 || !getAvailableTargets().length}
            className={mustCoup ? 'col-span-2' : ''}
          >
            {mustCoup ? 'Coup (Required)' : 'Coup (-7 coins)'}
          </Button>
        </div>
      </div>
    );
  };

  const renderChallengeDialog = () => {
    if (gameState.phase !== 'challenge-pending' || !gameState.pendingAction)
      return null;

    const action = gameState.pendingAction;
    const actor = gameState.players.find(p => p.id === action.playerId)!;
    const canChallenge = currentPlayer.id !== action.playerId;

    return (
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Challenge Opportunity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              {actor.name} claims to use{' '}
              {COUP_ROLES[getRequiredRole(action.type)].name} for {action.type}
            </p>
            <p>Do you want to challenge this claim?</p>
            <div className="flex gap-2">
              {canChallenge && (
                <Button onClick={challengeAction} variant="destructive">
                  Challenge
                </Button>
              )}
              <Button
                onClick={() => {
                  setGameState(prev => {
                    // Check if action can be blocked after challenge phase
                    const blockable = ['foreign-aid', 'steal', 'assassinate'];
                    if (blockable.includes(prev.pendingAction!.type)) {
                      const newState = {
                        ...prev,
                        phase: 'block-pending' as const,
                        blockTimer: 10,
                      };
                      updateRoomGameState(newState);
                      return newState;
                    } else {
                      const newState = resolveAction(prev);
                      updateRoomGameState(newState);
                      return newState;
                    }
                  });
                }}
                variant="outline"
              >
                Allow
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderBlockDialog = () => {
    if (gameState.phase !== 'block-pending' || !gameState.pendingAction)
      return null;

    const action = gameState.pendingAction;
    const actor = gameState.players.find(p => p.id === action.playerId)!;
    const canBlock = currentPlayer.id !== action.playerId;
    const targetedPlayer = action.targetId === currentPlayer.id;

    // Get possible blocking roles for this action
    const blockingRoles = Object.entries(COUP_ROLES).filter(([role, data]) =>
      data.blocks.includes(action.type as any)
    );

    return (
      <Dialog open={true}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Opportunity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              {actor.name} is attempting to {action.type}
              {action.targetId
                ? ` against ${gameState.players.find(p => p.id === action.targetId)?.name}`
                : ''}
            </p>
            {targetedPlayer && (
              <p className="font-medium text-destructive">
                You are the target!
              </p>
            )}
            <p>Do you want to block this action?</p>
            <div className="flex flex-wrap gap-2">
              {canBlock &&
                blockingRoles.map(([role, data]) => (
                  <Button
                    key={role}
                    onClick={() => blockAction(role as CoupRole)}
                    variant="secondary"
                  >
                    Block with {data.name}
                  </Button>
                ))}
              <Button
                onClick={() => {
                  setGameState(prev => {
                    const newState = resolveAction(prev);
                    updateRoomGameState(newState);
                    return newState;
                  });
                }}
                variant="outline"
              >
                Allow Action
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  useEffect(() => {
    if (room.gameState && room.gameState.phase && room.gameState.players) {
      setGameState(room.gameState);
    }
  }, [room.gameState]);

  if (gameState.phase === 'waiting') {
    return (
      <div className="container mx-auto space-y-6 p-4">
        <div className="space-y-4 text-center">
          <h1 className="text-3xl font-bold">Cat Conspiracy</h1>
          <p className="text-muted-foreground">
            A game of deduction, deception, and cute cats! Each player gets 2
            influence cards and must be the last one standing.
          </p>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-5">
            {Object.entries(COUP_ROLES).map(([role, data]) => (
              <Card key={role}>
                <CardContent className="p-4 text-center">
                  <img
                    src={getCatImageUrl(data.icon)}
                    alt={data.name}
                    className="mx-auto mb-2 h-16 w-16 rounded object-cover"
                  />
                  <h3 className="text-sm font-semibold">{data.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {data.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {currentPlayer.isHost && (
            <Button onClick={initializeGame} className="mt-6">
              Start Game
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Cat Conspiracy</h1>
        <p className="text-muted-foreground">
          Treasury: {gameState.treasury} coins
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {(gameState.players || []).map(renderPlayerCard)}
      </div>

      {renderActionButtons()}
      {renderChallengeDialog()}
      {renderBlockDialog()}

      <div className="rounded-lg bg-muted p-4">
        <h3 className="mb-2 font-semibold">Action Log</h3>
        <div className="max-h-32 space-y-1 overflow-y-auto">
          {(gameState.actionLog || []).slice(-5).map((log, index) => (
            <p key={index} className="text-sm">
              {log}
            </p>
          ))}
        </div>
      </div>

      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Target</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedTarget} onValueChange={setSelectedTarget}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a target" />
              </SelectTrigger>
              <SelectContent>
                {getAvailableTargets().map(player => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name} ({player.coins} coins)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  performAction('steal', selectedTarget);
                  setShowActionDialog(false);
                  setSelectedTarget('');
                }}
                disabled={!selectedTarget}
              >
                Steal
              </Button>
              <Button
                onClick={() => {
                  performAction('assassinate', selectedTarget);
                  setShowActionDialog(false);
                  setSelectedTarget('');
                }}
                disabled={!selectedTarget}
                variant="destructive"
              >
                Assassinate
              </Button>
              <Button
                onClick={() => {
                  performAction('coup', selectedTarget);
                  setShowActionDialog(false);
                  setSelectedTarget('');
                }}
                disabled={!selectedTarget}
                variant="destructive"
              >
                Coup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
