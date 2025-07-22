
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import { Room } from "./pages/Room";
import { DirectJoin } from "./pages/DirectJoin";
import NotFound from "./pages/NotFound";
import { AnalyticsProvider } from "./providers/AnalyticsProvider";
import AIChatbot from "./components/AIChatbot";
import { BackgroundMusic } from "./components/BackgroundMusic";

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
          <AIChatbot />
          <BackgroundMusic 
            audioSrc="/puzzzz-music.mp3" 
            volume={0.2}
            showControls={true}
          />
        </AnalyticsProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
