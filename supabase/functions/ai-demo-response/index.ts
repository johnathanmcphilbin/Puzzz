import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const { prompt, playerName } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log(`Generating AI response for player: ${playerName}, prompt: ${prompt}`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are Tim, a friendly team member in a Demo Day presentation game. You've just been correctly identified in a photo quiz. Respond to the player's prompt in a fun, engaging way. Keep responses under 100 words and maintain a positive, energetic tone fitting for a team demo day event.`
          },
          {
            role: 'user',
            content: `Player ${playerName} said: "${prompt}". Respond as Tim who was just identified correctly in the photo.`
          }
        ],
        max_tokens: 150,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'Failed to generate AI response');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log(`AI response generated: ${aiResponse}`);

    return new Response(JSON.stringify({ 
      success: true, 
      response: aiResponse,
      playerName,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-demo-response function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});