import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Play, Users, Crown, LogOut, QrCode, UserX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";

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
  
  const { toast } = useToast();
  const navigate = useNavigate();

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
      await supabase
        .from("players")
        .delete()
        .eq("player_id", playerToKick.player_id);

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

     // Check minimum players for Paranoia
     if (selectedGame === "paranoia" && players.length < 3) {
       toast({
         title: "Not Enough Players",
         description: "Paranoia requires at least 3 players to start",
         variant: "destructive",
       });
       return;
     }

     setIsStarting(true);
    try {
      const { error } = await supabase
        .from("rooms")
        .update({
          current_game: selectedGame,
          game_state: {
            phase: "playing",
            currentQuestion: null,
            questionIndex: 0,
            votes: {},
            showResults: false
          }
        })
        .eq("id", room.id);

      if (error) throw error;

      const gameTitle = selectedGame === "paranoia" ? "Paranoia" : "Would You Rather";
      
      toast({
        title: "Game Started!",
        description: `${gameTitle} is now beginning`,
        className: "bg-success text-success-foreground",
      });
    } catch (error) {
      console.error("Error starting game:", error);
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
      // Remove player from room
      await supabase
        .from("players")
        .delete()
        .eq("player_id", currentPlayer.player_id);

      // Check if this was the last player
      const { data: remainingPlayers } = await supabase
        .from("players")
        .select("id")
        .eq("room_id", room.id);

      // If no players remain, delete the room completely
      if (!remainingPlayers || remainingPlayers.length === 0) {
        await supabase
          .from("rooms")
          .delete()
          .eq("id", room.id);
      } else if (currentPlayer.is_host) {
        // If host is leaving but players remain, mark room as inactive
        await supabase
          .from("rooms")
          .update({ is_active: false })
          .eq("id", room.id);
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

        {/* QR Code Section */}
        <div className="flex justify-center mb-8">
          <Card className="w-fit">
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
                <div className="w-[200px] h-[200px] bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-muted-foreground">Generating QR code...</div>
                </div>
              )}
            </CardContent>
          </Card>
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
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                         {player.player_name.charAt(0).toUpperCase()}
                       </div>
                       <span className="font-medium">{player.player_name}</span>
                     </div>
                     <div className="flex items-center gap-2">
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
                ))}
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
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                {currentPlayer.is_host ? (
                   <Button 
                     onClick={startGame} 
                     disabled={isStarting || players.length < 2 || (selectedGame === "paranoia" && players.length < 3)}
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
    </div>
  );
};