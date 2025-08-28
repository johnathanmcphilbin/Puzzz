import { Volume2, VolumeX, Play, Pause } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { useBackgroundMusic } from '@/hooks/useBackgroundMusic';

interface BackgroundMusicProps {
  audioSrc: string;
  volume?: number;
  showControls?: boolean;
}

export const BackgroundMusic: React.FC<BackgroundMusicProps> = ({
  audioSrc,
  volume = 0.3,
  showControls = true,
}) => {
  const { isPlaying, isMuted, togglePlay, toggleMute } = useBackgroundMusic(
    audioSrc,
    volume
  );

  if (!showControls) {
    return null;
  }

  return (
    <div className="fixed left-4 top-4 z-40 flex gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={togglePlay}
        className="bg-background/80 backdrop-blur-sm"
        title={isPlaying ? 'Pause music' : 'Play music'}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={toggleMute}
        className="bg-background/80 backdrop-blur-sm"
        title={isMuted ? 'Unmute music' : 'Mute music'}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};
