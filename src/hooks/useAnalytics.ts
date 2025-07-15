import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Extend window to include Matomo _paq
declare global {
  interface Window {
    _paq?: any[];
  }
}

// Generate a unique session ID
const generateSessionId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Get or create session ID from sessionStorage
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

export const useAnalytics = () => {
  const location = useLocation();
  const sessionId = useRef(getSessionId());
  const lastPageRef = useRef<string>('');

  // Track page views
  useEffect(() => {
    const currentPath = location.pathname;
    
    // Don't track the same page twice in a row
    if (lastPageRef.current === currentPath) return;
    
    lastPageRef.current = currentPath;

    const trackPageView = async () => {
      try {
        // Use Matomo for page tracking
        if (typeof window !== 'undefined' && window._paq) {
          window._paq.push(['setCustomUrl', currentPath]);
          window._paq.push(['trackPageView']);
        }
        
        console.log('Page view tracked:', currentPath);
      } catch (error) {
        console.error('Analytics tracking error:', error);
      }
    };

    trackPageView();
  }, [location.pathname]);

  // Track custom events
  const trackEvent = async (
    eventType: string, 
    metadata: Record<string, any> = {},
    roomCode?: string,
    gameType?: string
  ) => {
    try {
      // Use Matomo for event tracking
      if (typeof window !== 'undefined' && window._paq) {
        const eventData = {
          type: eventType,
          page: location.pathname,
          session: sessionId.current,
          room: roomCode,
          game: gameType,
          ...metadata
        };
        
        window._paq.push(['trackEvent', 'Custom', eventType, JSON.stringify(eventData)]);
      }
      
      console.log('Event tracked:', eventType, { metadata, roomCode, gameType });
    } catch (error) {
      console.error('Event tracking error:', error);
    }
  };

  // Track game events specifically
  const trackGameEvent = (
    eventType: 'game_start' | 'game_end' | 'player_join' | 'player_leave' | 'question_answered' | 'round_complete',
    gameType: string,
    roomCode: string,
    metadata: Record<string, any> = {}
  ) => {
    return trackEvent(eventType, metadata, roomCode, gameType);
  };

  // Track user interactions
  const trackInteraction = (
    interactionType: 'button_click' | 'form_submit' | 'navigation' | 'error',
    details: Record<string, any> = {}
  ) => {
    return trackEvent(`user_${interactionType}`, details);
  };

  return {
    trackEvent,
    trackGameEvent,
    trackInteraction,
    sessionId: sessionId.current
  };
};