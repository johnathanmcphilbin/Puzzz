import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Copy, Play, Users, Crown, LogOut, QrCode, UserX, Cat } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { CharacterSelection } from "./CharacterSelection";
import { getCatImageUrl } from "@/assets/catImages";
import GameCustomizer from "./GameCustomizer";
import { FUNCTIONS_BASE_URL, SUPABASE_ANON_KEY } from '@/utils/functions';
import { supabase } from '@/integrations/supabase/client';
import { FEATURES } from "@/config/featureFlags";

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

interface RoomLobbyProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (room: Room) => void;
}

export const RoomLobby = ({ room, players, currentPlayer, onUpdateRoom }: RoomLobbyProps) => {
  const [isStarting, setIsStarting] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>(room.current_game || "would_you_rather");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showCharacterSelection, setShowCharacterSelection] = useState(false);
  const [characterData, setCharacterData] = useState<{[key: string]: any}>({});
  
  const { toast } = useToast();
  const navigate = useNavigate();

  // Remove the duplicate subscription since useRoom already handles all real-time updates
  // The RoomLobby should only react to props changes from useRoom

  const generateQRCode = async () => {
    try {
      const joinUrl = `${window.location.origin}/join/${room.room_code}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  useEffect(() => {
    generateQRCode();
  }, [room.room_code]);

  // Load character data whenever players change
  useEffect(() => {
    loadCharacterData();
  }, [players]);

  const loadCharacterData = async () => {
    const characterIds = players.map(p => p.selected_character_id).filter((id): id is string => Boolean(id));
    
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

      const characterMap = data?.reduce((acc, char) => {
        acc[char.id] = char;
        return acc;
      }, {} as any) || {};

      setCharacterData(characterMap);
    } catch (error) {
      console.error('Error loading character data:', error);
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.room_code);
    toast({
      title: "Copied!",
      description: "Room code copied to clipboard",
      className: "bg-success text-success-foreground",
    });
  };

  const kickPlayer = async (playerToKick: Player) => {
    if (!currentPlayer.is_host || playerToKick.is_host) return;
    
    try {
      // Use Redis rooms-service to kick player instead of direct Supabase calls
      const response = await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'apikey': SUPABASE_ANON_KEY, 
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}` 
        },
        body: JSON.stringify({ 
          action: 'kick', 
          roomCode: room.room_code, 
          targetPlayerId: playerToKick.player_id, 
          hostId: currentPlayer.player_id 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to kick player');
      }

      toast({
        title: "Player Kicked",
        description: `${playerToKick.player_name} has been removed from the room`,
        className: "bg-warning text-warning-foreground",
      });
    } catch (error) {
      console.error("Error kicking player:", error);
      toast({
        title: "Error",
        description: "Failed to kick player",
        variant: "destructive",
      });
    }
  };

   const startGame = async () => {
     if (!currentPlayer.is_host) return;

     // Check minimum players for games that require them
     if ((selectedGame === "paranoia" || selectedGame === "odd_one_out" || selectedGame === "odd-one-out") && players.length < 3) {
       const gameTitle = selectedGame === "paranoia" ? "Paranoia" : "Odd One Out";
       toast({
         title: "Not Enough Players",
         description: `${gameTitle} requires at least 3 players to start`,
         variant: "destructive",
       });
       return;
     }

     setIsStarting(true);
     try {
        const gameState = selectedGame === "paranoia" ? {
          phase: "waiting",
          currentTurnIndex: 0,
          playerOrder: [],
          currentRound: 1,
          currentQuestion: null,
          currentAnswer: null,
          targetPlayerId: null,
          usedAskers: [],
          lastRevealResult: null,
          isFlipping: false
        } : selectedGame === "coup" ? {
          phase: "waiting",
          currentPlayerIndex: 0,
          players: [],
          pendingAction: null,
          actionQueue: []
        } : selectedGame === "puzzz_panic" ? {
          phase: "waiting",
          currentChallenge: 0,
          scores: players.reduce((acc, p) => ({ ...acc, [p.player_id]: 0 }), {}),
          challengeOrder: [],
          playerResponses: {}
        } : {
          phase: (selectedGame === "odd_one_out" || selectedGame === "odd-one-out") ? "setup" : "playing",
          currentQuestion: null,
          questionIndex: 0,
          votes: {},
          showResults: false
        };

      // Update room state via Redis-based rooms-service
      const response = await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ 
          action: 'update', 
          roomCode: room.room_code, 
          updates: { 
            currentGame: selectedGame,
            gameState: gameState
          } 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to start game');
      }

      const gameTitle = selectedGame === "paranoia" ? "Paranoia" : (selectedGame === "odd_one_out" || selectedGame === "odd-one-out") ? "Odd One Out" : selectedGame === "dogpatch" ? "Demo Day" : selectedGame === "dramamatching" ? "Dramamatching" : selectedGame === "forms" ? "Forms Game" : selectedGame === "say_it_or_pay_it" ? "Say it or pay it" : selectedGame === "coup" ? "Cat Conspiracy" : selectedGame === "puzzz_panic" ? "Puzzz Panic" : "Would You Rather";
      
      toast({
        title: "Game Started!",
        description: `${gameTitle} is now beginning`,
        className: "bg-success text-success-foreground",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start game",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const leaveRoom = async () => {
    try {
      // Remove player from room via Redis
      const updatedPlayers = players.filter(p => p.player_id !== currentPlayer.player_id);

      const response = await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ 
          action: 'update', 
          roomCode: room.room_code, 
          updates: { players: updatedPlayers } 
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to leave room");
      }

      // Clear local storage
      localStorage.removeItem("puzzz_player_id");
      localStorage.removeItem("puzzz_player_name");

      toast({
        title: "Left Room",
        description: "You have left the room",
      });

      navigate("/");
    } catch (error) {
      console.error("Error leaving room:", error);
      toast({
        title: "Error",
        description: "Failed to leave room",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">{room.name}</h1>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="room-code">{room.room_code}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyRoomCode}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Code
            </Button>
          </div>
          <p className="text-muted-foreground">
            Share the room code with friends to let them join
          </p>
        </div>

        {/* QR Code and AI Customizer Section */}
        <div className="flex justify-center mb-8">
          <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl">
            {/* QR Code */}
            <Card className="w-full">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <QrCode className="h-5 w-5" />
                  <h3 className="font-semibold">Quick Join</h3>
                </div>
                {qrCodeUrl ? (
                  <div className="space-y-3">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code to join room" 
                      className="mx-auto rounded-lg border"
                    />
                    <p className="text-sm text-muted-foreground">
                      Scan to join the room instantly
                    </p>
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] bg-muted rounded-lg flex items-center justify-center mx-auto">
                    <div className="text-muted-foreground">Generating QR code...</div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Game Customizer */}
            <GameCustomizer 
              roomCode={room.room_code}
              roomId={room.id}
              isHost={currentPlayer.is_host}
              selectedGame={selectedGame}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Players List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Players ({players.length})
              </CardTitle>
               <CardDescription>
                 {players.length < 2 ? "Waiting for more players to join..." : "Ready to start!"}
               </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {players.map((player) => {
                  const playerCharacter = player.selected_character_id ? characterData[player.selected_character_id] : null;
                  
                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {playerCharacter ? (
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-white">
                            <img
                              src={getCatImageUrl(playerCharacter.icon_url)}
                              alt={playerCharacter.name}
                              className="w-full h-full object-contain p-0.5"
                              loading="eager"
                            />
                          </div>
                        ) : (
                          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                            {player.player_name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium">{player.player_name}</div>
                          {playerCharacter && (
                            <div className="text-xs text-muted-foreground">{playerCharacter.name}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {player.player_id === currentPlayer.player_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowCharacterSelection(true)}
                            className="gap-1"
                          >
                            <Cat className="h-3 w-3" />
                            {player.selected_character_id ? 'Change Cat' : 'Pick Cat'}
                          </Button>
                        )}
                        {player.is_host && (
                          <Badge variant="secondary" className="gap-1">
                            <Crown className="h-3 w-3" />
                            Host
                          </Badge>
                        )}
                        {currentPlayer.is_host && !player.is_host && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => kickPlayer(player)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <UserX className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Game Selection */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentPlayer.is_host ? "Select Game" : "Current Game"}
              </CardTitle>
              <CardDescription>
                {currentPlayer.is_host 
                  ? "Choose which game to play with your friends"
                  : "Waiting for host to start the game"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Game Options */}
              <div className="space-y-3">
                {/* Would You Rather Game */}
                <div 
                  className={`relative p-4 border rounded-lg transition-all ${
                    currentPlayer.is_host
                      ? `cursor-pointer ${selectedGame === "would_you_rather" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`
                      : "border-muted"
                  }`}
                  onClick={() => currentPlayer.is_host && setSelectedGame("would_you_rather")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Would You Rather</h4>
                      <p className="text-sm text-muted-foreground">Choose between two scenarios</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-6 h-6 game-option-a rounded text-xs flex items-center justify-center text-white font-bold">A</div>
                        <div className="w-6 h-6 game-option-b rounded text-xs flex items-center justify-center text-white font-bold">B</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paranoia Game */}
                <div 
                  className={`relative p-4 border rounded-lg transition-all ${
                    currentPlayer.is_host
                      ? `cursor-pointer ${selectedGame === "paranoia" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`
                      : "border-muted"
                  }`}
                  onClick={() => currentPlayer.is_host && setSelectedGame("paranoia")}
                >
                  <div className="flex items-center justify-between">
                     <div>
                       <h4 className="font-semibold">Paranoia</h4>
                       <p className="text-sm text-muted-foreground">Whisper questions and guess answers (3+ players)</p>
                     </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-paranoia-primary rounded text-xs flex items-center justify-center text-white font-bold">🤫</div>
                    </div>
                  </div>
                 </div>

                  {/* Odd One Out Game */}
                  <div 
                    className={`relative p-4 border rounded-lg transition-all ${
                      currentPlayer.is_host
                        ? `cursor-pointer ${selectedGame === "odd-one-out" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`
                        : "border-muted"
                    }`}
                    onClick={() => currentPlayer.is_host && setSelectedGame("odd-one-out")}
                  >
                     <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">Odd One Out</h4>
                          <p className="text-sm text-muted-foreground">Find the imposter (3+ players)</p>
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="w-6 h-6 bg-amber-500 rounded text-xs flex items-center justify-center text-white font-bold">🎭</div>
                      </div>
                    </div>
                   </div>

                   {/* Dramamatching Game (feature-flagged) */}
                   {FEATURES.dramamatching && (
                     <div 
                       className={`relative p-4 border rounded-lg transition-all ${
                         currentPlayer.is_host
                           ? `cursor-pointer ${selectedGame === "dramamatching" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`
                           : "border-muted"
                       }`}
                       onClick={() => currentPlayer.is_host && setSelectedGame("dramamatching")}
                     >
                       <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">🎭 Dramamatching</h4>
                            <p className="text-sm text-muted-foreground">AI selfie drama analysis</p>
                         </div>
                         <div className="flex items-center gap-2">
                           <div className="w-6 h-6 bg-pink-500 rounded text-xs flex items-center justify-center text-white font-bold">💕</div>
                        </div>
                      </div>
                     </div>
                   )}


                   {/* Forms Game */}
                   <div 
                     className={`relative p-4 border rounded-lg transition-all ${
                       currentPlayer.is_host
                         ? `cursor-pointer ${selectedGame === "forms" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`
                         : "border-muted"
                     }`}
                     onClick={() => currentPlayer.is_host && setSelectedGame("forms")}
                   >
                     <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">📋 Forms Game</h4>
                          <p className="text-sm text-muted-foreground">Vote on AI questions, then answer polls</p>
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="w-6 h-6 bg-indigo-500 rounded text-xs flex items-center justify-center text-white font-bold">📝</div>
                      </div>
                    </div>
                   </div>

                   {/* Say it or pay it Game */}
                   <div 
                     className={`relative p-4 border rounded-lg transition-all ${
                       currentPlayer.is_host
                         ? `cursor-pointer ${selectedGame === "say_it_or_pay_it" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`
                         : "border-muted"
                     }`}
                     onClick={() => currentPlayer.is_host && setSelectedGame("say_it_or_pay_it")}
                   >
                     <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">🔥 Say it or pay it</h4>
                          <p className="text-sm text-muted-foreground">Truth or forfeit challenge</p>
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="w-6 h-6 bg-red-500 rounded text-xs flex items-center justify-center text-white font-bold">💬</div>
                      </div>
                    </div>
                   </div>

                   {/* Cat Conspiracy Game */}
                   <div 
                     className={`relative p-4 border rounded-lg transition-all ${
                       currentPlayer.is_host
                         ? `cursor-pointer ${selectedGame === "coup" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`
                         : "border-muted"
                     }`}
                     onClick={() => currentPlayer.is_host && setSelectedGame("coup")}
                   >
                     <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold">👑 Cat Conspiracy</h4>
                          <p className="text-sm text-muted-foreground">Bluffing & strategy with cats (2-10 players)</p>
                       </div>
                       <div className="flex items-center gap-2">
                         <div className="w-6 h-6 bg-purple-500 rounded text-xs flex items-center justify-center text-white font-bold">👑</div>
                      </div>
                    </div>
                    </div>

                    {/* Puzzz Panic Game */}
                    <div 
                      className={`relative p-4 border rounded-lg transition-all ${
                        currentPlayer.is_host
                          ? `cursor-pointer ${selectedGame === "puzzz_panic" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`
                          : "border-muted"
                      }`}
                      onClick={() => currentPlayer.is_host && setSelectedGame("puzzz_panic")}
                    >
                      <div className="flex items-center justify-between">
                         <div>
                           <h4 className="font-semibold">⚡ Puzzz Panic</h4>
                           <p className="text-sm text-muted-foreground">Fast-paced 15 mini-challenges (1-250 players)</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-red-500 rounded text-xs flex items-center justify-center text-white font-bold">⚡</div>
                       </div>
                     </div>
                    </div>

                   {/* Demo Day Game */}
                  <div 
                    className={`relative p-4 border rounded-lg transition-all ${
                      currentPlayer.is_host
                        ? `cursor-pointer ${selectedGame === "dogpatch" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`
                        : "border-muted"
                    }`}
                    onClick={() => currentPlayer.is_host && setSelectedGame("dogpatch")}
                  >
                    <div className="flex items-center justify-between">
                       <div>
                         <h4 className="font-semibold">Demo Day</h4>
                         <p className="text-sm text-muted-foreground">Guess Who-style photo game</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-500 rounded text-xs flex items-center justify-center text-white font-bold">❓</div>
                     </div>
                   </div>
                 </div>
                </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                {currentPlayer.is_host ? (
                   <Button 
                     onClick={startGame} 
                     disabled={isStarting || (selectedGame !== "dogpatch" && players.length < 2) || ((selectedGame === "paranoia" || selectedGame === "odd_one_out" || selectedGame === "odd-one-out") && players.length < 3)}
                     className="flex-1 gap-2"
                   >
                    {isStarting ? (
                      "Starting..."
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Start Game
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex-1 text-center text-muted-foreground text-sm py-2">
                    Waiting for host to start the game...
                  </div>
                )}
                
                
                <Button 
                  variant="outline" 
                  onClick={leaveRoom}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Leave
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Character Selection Modal */}
      <CharacterSelection
        isOpen={showCharacterSelection}
        onClose={() => setShowCharacterSelection(false)}
        playerId={currentPlayer.player_id}
        roomCode={room.room_code}
        players={players}
        currentPlayer={currentPlayer}
        onUpdateRoom={onUpdateRoom}
        room={room}
      />
    </div>
  );
};