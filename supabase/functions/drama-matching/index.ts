import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { player1, player2 } = await req.json();

    console.log(
      'Drama matching request for:',
      player1.name,
      'and',
      player2.name
    );

    // Call OpenAI GPT-4o to analyze the selfies and generate drama scores
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are the AI Drama Engine, a theatrical matchmaking AI that analyzes selfies to predict dramatic relationship potential. You must respond with ONLY a valid JSON object containing:
            {
              "romance": (number 1-100),
              "friendship": (number 1-100), 
              "enemies": (number 1-100),
              "commentary": "(a dramatic, over-the-top commentary in 1-2 sentences about their potential dynamic)"
            }
            
            Make the percentages somewhat random but influenced by visual cues. The commentary should be dramatic, playful, and suitable for a party game. Think reality TV drama meets fortune telling.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze the drama potential between ${player1.name} and ${player2.name}. Look at their selfies and predict their romantic chemistry, friendship compatibility, and enemy rivalry potential. Give me dramatic percentages and commentary!`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: player1.selfie,
                },
              },
              {
                type: 'image_url',
                image_url: {
                  url: player2.selfie,
                },
              },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status, response.statusText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', data);

    const aiResponse = data.choices[0].message.content;
    console.log('AI response content:', aiResponse);

    // Parse the JSON response from OpenAI
    let dramaResult;
    try {
      dramaResult = JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', aiResponse);
      // Fallback to random values if AI doesn't return proper JSON
      dramaResult = {
        romance: Math.floor(Math.random() * 100) + 1,
        friendship: Math.floor(Math.random() * 100) + 1,
        enemies: Math.floor(Math.random() * 100) + 1,
        commentary: `${player1.name} and ${player2.name} are an enigmatic pair - the stars suggest intense chemistry and explosive potential!`,
      };
    }

    // Add player data to the result
    const result = {
      player1: {
        name: player1.name,
        selfie: player1.selfie,
      },
      player2: {
        name: player2.name,
        selfie: player2.selfie,
      },
      romance: dramaResult.romance,
      friendship: dramaResult.friendship,
      enemies: dramaResult.enemies,
      commentary: dramaResult.commentary,
    };

    console.log('Final drama result:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in drama-matching function:', error);
    return new Response(
      JSON.stringify({
        error: 'Drama engine malfunction! The cosmic forces are misaligned.',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
