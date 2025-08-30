import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import { BackgroundMusic } from './components/BackgroundMusic';
import { DirectJoin } from './pages/DirectJoin';
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import { Room } from './pages/Room';
import { AnalyticsProvider } from './providers/AnalyticsProvider';

import { Toaster as Sonner } from '@/components/ui/sonner';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AnalyticsProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/join" element={<Index />} />
            <Route path="/join/:roomCode" element={<DirectJoin />} />
            <Route path="/room/:roomCode" element={<Room />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>

          <BackgroundMusic
            audioSrc={'/puzzz-music.mp3'} 
            volume={0.2}
            showControls={true}
          />
        </AnalyticsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
