
import { useEffect, useRef, useState } from 'react';

export const useBackgroundMusic = (audioSrc: string, volume: number = 0.3) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio(audioSrc);
    audioRef.current.loop = true;
    audioRef.current.volume = volume;
    
    // Auto-play when component mounts (with user interaction)
    const playAudio = async () => {
      try {
        await audioRef.current?.play();
        setIsPlaying(true);
      } catch (error) {
        console.log('Auto-play prevented by browser policy:', error);
      }
    };

    // Add event listener for user interaction to start audio
    const handleUserInteraction = () => {
      playAudio();
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
    };
  }, [audioSrc, volume]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;

    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const setVolume = (newVolume: number) => {
    if (!audioRef.current) return;
    
    audioRef.current.volume = Math.max(0, Math.min(1, newVolume));
  };

  return {
    isPlaying,
    isMuted,
    togglePlay,
    toggleMute,
    setVolume
  };
};
