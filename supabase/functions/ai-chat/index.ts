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
      throw new Error('OpenAI API key not configured');
    }

    const { message, action, customization, gameType, players, roomCode } = await req.json();

    console.log('AI Chat request:', { message, action, customization, gameType, players, roomCode });

    let systemPrompt = '';
    let userPrompt = message;

    if (action === 'chat') {
      systemPrompt = `You are a helpful AI assistant for a party games app. You help users customize their gaming experience and provide fun suggestions. Keep responses conversational, friendly, and brief. If users mention preferences like "we are nerdy" or "we love sci-fi", remember these for future interactions.`;
    } else if (action === 'generate_all_questions') {
      systemPrompt = `Generate questions for ALL three party games based on the customization: "${customization}". 
      
      You MUST return ONLY valid JSON with this exact structure (no markdown, no code blocks, no explanations):
      {
        "would_you_rather": [
          {"option_a": "...", "option_b": "..."},
          {"option_a": "...", "option_b": "..."},
          {"option_a": "...", "option_b": "..."},
          {"option_a": "...", "option_b": "..."},
          {"option_a": "...", "option_b": "..."}
        ],
        "forms": [
          {"question": "..."},
          {"question": "..."},
          {"question": "..."},
          {"question": "..."},
          {"question": "..."},
          {"question": "..."},
          {"question": "..."},
          {"question": "..."}
        ],
        "paranoia": [
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."}
        ]
      }
      
      Make sure all questions match the theme/preferences mentioned in the customization. Return ONLY the JSON object, nothing else.`;
      userPrompt = `Generate questions for all three party games for a group that is: ${customization}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: action === 'chat' ? 0.8 : 0.9,
        max_tokens: action === 'chat' ? 200 : 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    console.log('OpenAI response:', generatedText);

    return new Response(JSON.stringify({ 
      response: generatedText,
      action: action 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});