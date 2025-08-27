import { useParams, useNavigate } from 'react-router-dom';
import { useRoom } from '@/hooks/useRoom';
import { RoomLobby } from '@/components/RoomLobby';
import { WouldYouRatherGame } from '@/components/WouldYouRatherGame';
import { ParanoiaGameV2 } from '@/components/ParanoiaGameV2';
import { OddOneOutGame } from '@/components/OddOneOutGame';
import { DemoDayGame } from '@/components/DemoDayGame';
import { NewFormsGame } from '@/components/NewFormsGame';
import { DramamatchingGame } from '@/components/DramamatchingGame';
import { FEATURES } from '@/config/featureFlags';

import { SayItOrPayItGame } from '@/components/SayItOrPayItGame';
import { PuzzzPanicGame } from '@/components/PuzzzPanicGame';
import CoupGame from '@/components/CoupGame';
import AIChatbot from '@/components/AIChatbot';
import { Loader2 } from 'lucide-react';
import type { Room as LegacyRoom, Player as LegacyPlayer } from '@/types/room';

export const Room = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();

  // Redirect if no room code
  if (!roomCode) {
    navigate('/');
    return null;
  }

  const { room, players, currentPlayer, loading, error, updateRoom, reload } =
    useRoom(roomCode);

  if (loading) {
    return (
      <div className="gradient-bg flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error || !room || !currentPlayer) {
    return (
      <div className="gradient-bg flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-bold text-destructive">
            {error || 'Room not found'}
          </h2>
          <p className="mb-4 text-muted-foreground">
            Unable to access this room. Please check the room code or try again.
          </p>
          <button
            onClick={() => navigate('/')}
            className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const gamePhase = room.gameState?.phase || 'lobby';
  const currentGame = room.currentGame || 'would_you_rather';

  return (
    <div className="gradient-bg min-h-screen">
      {gamePhase === 'lobby' ? (
        <RoomLobby
          room={room as any}
          players={players as any}
          currentPlayer={currentPlayer as any}
          onUpdateRoom={updateRoom}
        />
      ) : currentGame === 'paranoia' ? (
        <ParanoiaGameV2
          room={room as any}
          players={players as any}
          currentPlayer={currentPlayer as any}
          onUpdateRoom={updateRoom}
        />
      ) : currentGame === 'odd_one_out' || currentGame === 'odd-one-out' ? (
        <OddOneOutGame
          room={room as any}
          players={players as any}
          currentPlayer={currentPlayer as any}
          onUpdateRoom={updateRoom}
        />
      ) : currentGame === 'dogpatch' ? (
        <DemoDayGame
          room={room as any}
          players={players as any}
          currentPlayer={currentPlayer as any}
          onUpdateRoom={updateRoom}
        />
      ) : currentGame === 'dramamatching' && FEATURES.dramamatching ? (
        <DramamatchingGame
          room={room as any}
          players={players as any}
          currentPlayer={currentPlayer as any}
          onUpdateRoom={updateRoom}
        />
      ) : currentGame === 'forms' ? (
        <NewFormsGame
          room={room as any}
          players={players as any}
          currentPlayer={currentPlayer as any}
          onUpdateRoom={updateRoom}
        />
      ) : currentGame === 'say_it_or_pay_it' ? (
        <SayItOrPayItGame
          room={room as any}
          players={players as any}
          currentPlayer={currentPlayer as any}
          onUpdateRoom={updateRoom}
        />
      ) : currentGame === 'coup' ? (
        <CoupGame
          room={room as any}
          players={players as any}
          currentPlayer={currentPlayer as any}
          onUpdateRoom={updateRoom}
        />
      ) : currentGame === 'puzzz_panic' ? (
        <PuzzzPanicGame
          room={room as any}
          players={players as any}
          currentPlayer={currentPlayer as any}
          onUpdateRoom={updateRoom}
        />
      ) : (
        <WouldYouRatherGame
          room={room as any}
          players={players as any}
          currentPlayer={currentPlayer as any}
          onUpdateRoom={updateRoom}
        />
      )}
    </div>
  );
};
