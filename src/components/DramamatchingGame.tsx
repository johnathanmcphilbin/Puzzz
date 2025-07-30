import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Heart, Users, Zap, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DramamatchingGameProps {
  room: any;
  players: any[];
  currentPlayer: any;
  onUpdateRoom: (updates: any) => Promise<void>;
}

interface DramamatchResult {
  player1: {
    name: string;
    selfie: string;
  };
  player2: {
    name: string;
    selfie: string;
  };
  romance: number;
  friendship: number;
  enemies: number;
  commentary: string;
}

export const DramamatchingGame: React.FC<DramamatchingGameProps> = ({
  room,
  players,
  currentPlayer,
  onUpdateRoom
}) => {
  const [selfie, setSelfie] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [matchResult, setMatchResult] = useState<DramamatchResult | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Could not access camera');
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const takeSelfie = async () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context?.drawImage(video, 0, 0);
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setSelfie(imageData);
      stopCamera();
      
      // Immediately store the selfie so other players can see the progress
      try {
        const currentSelfies = room.gameState?.selfies || {};
        await onUpdateRoom({
          gameState: {
            ...room.gameState,
            selfies: {
              ...currentSelfies,
              [currentPlayer.playerId]: {
                name: currentPlayer.playerName,
                selfie: imageData
              }
            }
          }
        });
        toast.success('Selfie captured and shared!');
      } catch (error) {
        console.error('Error storing selfie:', error);
        toast.success('Selfie captured!');
      }
    }
  };

  const retakeSelfie = () => {
    setSelfie(null);
    startCamera();
  };

  const performMatching = async () => {
    if (!selfie) {
      toast.error('Please take a selfie first!');
      return;
    }

    setIsMatching(true);
    try {
      // First store current player's selfie
      const currentSelfies = room.gameState?.selfies || {};
      const updatedSelfies = {
        ...currentSelfies,
        [currentPlayer.playerId]: {
          name: currentPlayer.playerName,
          selfie: selfie
        }
      };

      // Get all other players with selfies (excluding current player)
      const otherPlayersWithSelfies = Object.keys(updatedSelfies).filter(id => id !== currentPlayer.playerId);
      
      if (otherPlayersWithSelfies.length === 0) {
        toast.error('No other players have selfies yet! Wait for others to take their photos.');
        setIsMatching(false);
        return;
      }

      // Select random player for matching
      const randomPlayerId = otherPlayersWithSelfies[Math.floor(Math.random() * otherPlayersWithSelfies.length)];
      const matchedPlayer = randomPlayerId ? updatedSelfies[randomPlayerId] : null;
      
      if (!matchedPlayer) {
        toast.error('Selected player data not found!');
        setIsMatching(false);
        return;
      }

      // Call AI drama engine
      const { data, error } = await supabase.functions.invoke('drama-matching', {
        body: {
          player1: {
            name: currentPlayer.playerName,
            selfie: selfie
          },
          player2: matchedPlayer
        }
      });

      if (error) throw error;

      // Create a unique match ID and store the result in room state
      const matchId = `${currentPlayer.playerId}-${randomPlayerId}-${Date.now()}`;
      const matchResult = {
        ...data,
        matchId,
        timestamp: Date.now()
      };

      // Store the match result in room state so all players see the same result
      const existingMatches = room.gameState?.matches || [];
      await onUpdateRoom({
        gameState: {
          ...room.gameState,
          selfies: updatedSelfies,
          matches: [...existingMatches, matchResult],
          latestMatchId: matchId
        }
      });

      setMatchResult(matchResult);
      toast.success('Drama match complete! 🎭');
    } catch (error) {
      console.error('Matching error:', error);
      toast.error('Drama engine failed! Try again.');
    } finally {
      setIsMatching(false);
    }
  };

  const resetGame = () => {
    setSelfie(null);
    setMatchResult(null);
    stopCamera();
  };

  // Calculate selfie progress
  const currentSelfies = room.gameState?.selfies || {};
  const playersWithSelfies = Object.keys(currentSelfies).length;
  const totalPlayers = players.length;
  const currentPlayerHasSelfie = currentSelfies[currentPlayer.playerId] !== undefined;

  // Check if there's a recent match involving this player
  React.useEffect(() => {
    const matches = room.gameState?.matches || [];
    const latestMatch = matches.find((match: any) => 
      match.player1.name === currentPlayer.playerName || 
      match.player2.name === currentPlayer.playerName
    );
    
    if (latestMatch && !matchResult) {
      setMatchResult(latestMatch);
    }
  }, [room.gameState?.matches, currentPlayer.playerName, matchResult]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-800 to-red-900 p-4">
      <div className="max-w-4xl mx-auto">
        <Card className="bg-black/20 border-pink-500/30 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400">
              🎭 Dramamatching
            </CardTitle>
            <p className="text-pink-200 text-lg">
              Snap a selfie and let our AI Drama Engine reveal your destined connections!
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Progress Counter */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Badge variant="secondary" className="bg-pink-500/20 text-pink-300 border-pink-400 px-4 py-2">
                  📸 {playersWithSelfies}/{totalPlayers} players have selfies
                </Badge>
                {currentPlayerHasSelfie && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-400">
                    ✅ You're ready!
                  </Badge>
                )}
              </div>
              {currentPlayerHasSelfie && playersWithSelfies < totalPlayers && (
                <p className="text-pink-300 text-sm mb-4">
                  Waiting for other players to take their selfies...
                </p>
              )}
            </div>

            {!matchResult ? (
              <>
                {/* Selfie Capture Section */}
                <div className="text-center space-y-4">
                  {!selfie && !isCapturing && (
                    <Button
                      onClick={startCamera}
                      className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-3 px-6 rounded-full"
                    >
                      <Camera className="mr-2 h-5 w-5" />
                      Take Your Selfie
                    </Button>
                  )}

                  {isCapturing && (
                    <div className="space-y-4">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-64 h-64 mx-auto rounded-full border-4 border-pink-500 object-cover"
                      />
                      <div className="flex gap-2 justify-center">
                        <Button onClick={takeSelfie} className="bg-pink-500 hover:bg-pink-600">
                          📸 Capture
                        </Button>
                        <Button onClick={stopCamera} variant="outline">
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {selfie && (
                    <div className="space-y-4">
                      <img
                        src={selfie}
                        alt="Your selfie"
                        className="w-64 h-64 mx-auto rounded-full border-4 border-pink-500 object-cover"
                      />
                      <div className="flex gap-2 justify-center">
                        <Button onClick={retakeSelfie} variant="outline">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Retake
                        </Button>
                        <Button
                          onClick={performMatching}
                          disabled={isMatching}
                          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                        >
                          {isMatching ? '🔮 Analyzing Drama...' : '🎭 Find My Dramamatch!'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <canvas ref={canvasRef} className="hidden" />
              </>
            ) : (
              /* Match Result Display */
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-pink-300 mb-4">🤯 AI DRAMA ENGINE RESULTS</h3>
                </div>

                {/* Player Comparison Layout */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                  {/* Player 1 */}
                  <div className="text-center">
                    <img
                      src={matchResult.player1.selfie}
                      alt={matchResult.player1.name}
                      className="w-32 h-32 mx-auto rounded-full border-4 border-pink-500 object-cover mb-2"
                    />
                    <p className="text-pink-200 font-semibold">🧍‍♂️ {matchResult.player1.name}</p>
                  </div>

                  {/* Drama Scores */}
                  <div className="text-center space-y-3">
                    <div className="flex justify-center items-center gap-2">
                      <Heart className="h-5 w-5 text-red-400" />
                      <Badge variant="secondary" className="bg-red-500/20 text-red-300 border-red-400">
                        Romance: {matchResult.romance}%
                      </Badge>
                    </div>
                    <div className="flex justify-center items-center gap-2">
                      <Users className="h-5 w-5 text-blue-400" />
                      <Badge variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-400">
                        Friends: {matchResult.friendship}%
                      </Badge>
                    </div>
                    <div className="flex justify-center items-center gap-2">
                      <Zap className="h-5 w-5 text-yellow-400" />
                      <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-300 border-yellow-400">
                        Enemies: {matchResult.enemies}%
                      </Badge>
                    </div>
                  </div>

                  {/* Player 2 */}
                  <div className="text-center">
                    <img
                      src={matchResult.player2.selfie}
                      alt={matchResult.player2.name}
                      className="w-32 h-32 mx-auto rounded-full border-4 border-purple-500 object-cover mb-2"
                    />
                    <p className="text-purple-200 font-semibold">🧍‍♀️ {matchResult.player2.name}</p>
                  </div>
                </div>

                {/* AI Commentary */}
                <div className="bg-black/30 rounded-lg p-4 border border-pink-500/30">
                  <p className="text-pink-200 text-center italic text-lg">
                    🔊 "{matchResult.commentary}"
                  </p>
                </div>

                {/* Reset Button */}
                <div className="text-center">
                  <Button
                    onClick={resetGame}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Create New Drama
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};