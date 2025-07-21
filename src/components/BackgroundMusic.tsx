
import React from 'react';
import { Volume2, VolumeX } from 'lucide-react';
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
  showControls = true 
}) => {
  const { isPlaying, isMuted, togglePlay, toggleMute } = useBackgroundMusic(audioSrc, volume);

  if (!showControls) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 z-40">
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
