import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';

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
        // Update or create session
        await supabase
          .from('analytics_sessions')
          .upsert({
            session_id: sessionId.current,
            user_agent: navigator.userAgent,
            last_activity: new Date().toISOString(),
          }, {
            onConflict: 'session_id'
          });

        // Track page view event
        await supabase
          .from('analytics_events')
          .insert({
            event_type: 'page_view',
            page_path: currentPath,
            session_id: sessionId.current,
            metadata: {
              referrer: document.referrer,
              timestamp: new Date().toISOString()
            }
          });
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
      await supabase
        .from('analytics_events')
        .insert({
          event_type: eventType,
          page_path: location.pathname,
          session_id: sessionId.current,
          room_code: roomCode,
          game_type: gameType,
          metadata: {
            ...metadata,
            timestamp: new Date().toISOString()
          }
        });

      // Update session activity
      await supabase
        .from('analytics_sessions')
        .update({
          last_activity: new Date().toISOString()
        })
        .eq('session_id', sessionId.current);
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