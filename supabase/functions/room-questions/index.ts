// @ts-nocheck
// This is a Deno Edge Function - TypeScript errors for Deno imports are expected in Node.js environment
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const functionsUrl = Deno.env.get('SUPABASE_URL')?.replace('https://', 'https://') + '/functions/v1';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Environment check:', { 
      hasOpenAIKey: !!openAIApiKey, 
      functionsUrl, 
      hasSupabaseKey: !!supabaseAnonKey 
    });
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment variables');
      throw new Error('OpenAI API key not configured. Please contact the administrator.');
    }

    const { roomCode, customization, crazynessLevel } = await req.json();
    
    if (!roomCode) {
      throw new Error('Room code is required');
    }

    console.log('Generating room questions for:', { roomCode, customization, crazynessLevel });

    // Verify room exists in Redis first
    const roomCheckResponse = await fetch(`${functionsUrl}/rooms-service?roomCode=${roomCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey!,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!roomCheckResponse.ok) {
      throw new Error(`Room not found for code: ${roomCode}`);
    }

    const crazynessDescription = crazynessLevel <= 20 ? "very mild and safe" :
                                crazynessLevel <= 40 ? "mild with some fun edge" :
                                crazynessLevel <= 60 ? "moderately spicy and entertaining" :
                                crazynessLevel <= 80 ? "quite dramatic and bold" :
                                "extremely wild, dramatic, and outrageous";

const systemPrompt = `Generate questions for party games based HEAVILY on the customization theme: "${customization}". 
    
    CRITICAL: ALL questions must be directly related to and inspired by the theme/interests mentioned. If they mention "Star Wars", include Star Wars elements throughout. If they mention "nerdy", include nerdy/geeky scenarios. The theme should be evident in EVERY question.
    
    CRAZINESS LEVEL: ${crazynessLevel}% (${crazynessDescription})
    
    Adjust the intensity and dramatization of questions based on the craziness level:
    - 0-20%: Keep questions very mild, safe, and family-friendly
    - 21-40%: Add some fun elements but stay mostly tame
    - 41-60%: Make questions more entertaining with moderate spice
    - 61-80%: Create dramatic, bold questions that push boundaries
    - 81-100%: Go wild with outrageous, extreme, and highly dramatic scenarios
    
    Generate 25 Would You Rather questions, 20 Paranoia questions, and 15 Odd One Out questions.
    
    CRITICAL: DO NOT include "Would you rather" in the options themselves. Only provide the choice content.
    
    Format the options as simple choices without "Would you rather" prefix.
    
    Example format:
    Good: {"option_a": "have superpowers", "option_b": "have unlimited money"}
    Bad: {"option_a": "Would you rather have superpowers", "option_b": "Would you rather have unlimited money"}
    
    CRITICAL FOR PARANOIA QUESTIONS: ALL Paranoia questions must be formatted to ask about selecting other people in the room. The player will select another player's name as their answer. Use formats like:
    - "Who is most likely to..."
    - "Who would be the first to..."
    - "Who in the group would..."
    - "Which person here would..."
    
    The questions should be designed so that answering with someone's name makes sense.
    
    FOR ODD ONE OUT QUESTIONS: Create prompts where most players get one type of prompt and one "imposter" gets a different but related prompt. Format as:
    - normal_prompt: What the majority of players see
    - imposter_prompt: What the secret imposter sees (should be similar enough to not be obvious)
    
    Example Odd One Out:
    {"normal_prompt": "Name a type of fruit", "imposter_prompt": "Name a type of vegetable", "category": "food"}
    
    You MUST return ONLY valid JSON with this exact structure (no markdown, no code blocks, no explanations):
    {
      "would_you_rather": [
        {"option_a": "...", "option_b": "..."}
      ],
      "paranoia": [
        {"question": "Who is most likely to..."}
      ],
      "odd_one_out": [
        {"normal_prompt": "...", "imposter_prompt": "...", "category": "..."}
      ]
    }
    
`;
    
    const userPrompt = `Generate 25 Would You Rather questions, 20 Paranoia questions, and 15 Odd One Out questions that are HEAVILY themed around: ${customization}. Every single question must incorporate elements from this theme. Craziness level: ${crazynessLevel}%. Do NOT include "Would you rather" in the options - just provide the choice content.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.9,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;
    
    console.log('OpenAI response:', generatedText);

    // Clean and parse the generated questions
    let questions;
    try {
      // Remove any markdown code blocks or extra text
      const cleanedText = generatedText.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
      questions = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw response:', generatedText);
      throw new Error('AI response was not valid JSON. Please try again.');
    }

    // Store the generated questions in Redis via rooms-service
    const updateResponse = await fetch(`${functionsUrl}/rooms-service`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey!,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        action: 'update',
        roomCode: roomCode,
        updates: {
          gameState: {
            aiCustomization: customization,
            customQuestions: {
              would_you_rather: questions.would_you_rather || [],
              paranoia: questions.paranoia || [],
              odd_one_out: questions.odd_one_out || []
            },
            questionsGenerated: true
          }
        }
      }),
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json().catch(() => ({}));
      throw new Error(`Failed to store questions in Redis: ${errorData.error || 'Unknown error'}`);
    }

    console.log(`Successfully stored ${questions.would_you_rather?.length || 0} Would You Rather, ${questions.paranoia?.length || 0} Paranoia, and ${questions.odd_one_out?.length || 0} Odd One Out questions for room ${roomCode}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Generated ${questions.would_you_rather?.length || 0} Would You Rather, ${questions.paranoia?.length || 0} Paranoia, and ${questions.odd_one_out?.length || 0} Odd One Out questions for your room!`,
      counts: {
        would_you_rather: questions.would_you_rather?.length || 0,
        paranoia: questions.paranoia?.length || 0,
        odd_one_out: questions.odd_one_out?.length || 0
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in room-questions function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});