import React, { createContext, useContext, ReactNode } from 'react';
import { useAnalytics } from '@/hooks/useAnalytics';

interface AnalyticsContextType {
  trackEvent: (
    eventType: string,
    metadata?: Record<string, any>,
    roomCode?: string,
    gameType?: string
  ) => Promise<void>;
  trackGameEvent: (
    eventType:
      | 'game_start'
      | 'game_end'
      | 'player_join'
      | 'player_leave'
      | 'question_answered'
      | 'round_complete',
    gameType: string,
    roomCode: string,
    metadata?: Record<string, any>
  ) => Promise<void>;
  trackInteraction: (
    interactionType: 'button_click' | 'form_submit' | 'navigation' | 'error',
    details?: Record<string, any>
  ) => Promise<void>;
  sessionId: string;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export const useAnalyticsContext = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    // Return no-op functions if analytics context is not available
    return {
      trackEvent: async () => {},
      trackGameEvent: async () => {},
      trackInteraction: async () => {},
      sessionId: '',
    };
  }
  return context;
};

interface AnalyticsProviderProps {
  children: ReactNode;
}

export const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
}) => {
  const analytics = useAnalytics();

  return (
    <AnalyticsContext.Provider value={analytics}>
      {children}
    </AnalyticsContext.Provider>
  );
};
