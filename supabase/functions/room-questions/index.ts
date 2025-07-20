import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.51.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { roomCode, customization, crazynessLevel } = await req.json();
    
    if (!roomCode) {
      throw new Error('Room code is required');
    }

    console.log('Generating room questions for:', { roomCode, customization, crazynessLevel });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Clear existing questions for this room
    await supabase
      .from('room_questions')
      .delete()
      .eq('room_id', roomCode);

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
    
    Generate 25 Would You Rather questions and 20 Paranoia questions.
    
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
    
    You MUST return ONLY valid JSON with this exact structure (no markdown, no code blocks, no explanations):
    {
      "would_you_rather": [
        {"option_a": "...", "option_b": "..."}
      ],
      "paranoia": [
        {"question": "Who is most likely to..."}
      ]
    }
    
    Make sure ALL questions are HEAVILY themed around the customization AND match the specified craziness level. Return ONLY the JSON object, nothing else.`;
    
    const userPrompt = `Generate 25 Would You Rather questions and 20 Paranoia questions that are HEAVILY themed around: ${customization}. Every single question must incorporate elements from this theme. Craziness level: ${crazynessLevel}%. Do NOT include "Would you rather" in the options - just provide the choice content.`;

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

    // Parse the generated questions
    const questions = JSON.parse(generatedText);

    // Store Would You Rather questions
    if (questions.would_you_rather && Array.isArray(questions.would_you_rather)) {
      const wourQuestions = questions.would_you_rather.map((q: any) => ({
        room_id: roomCode,
        game_type: 'would_you_rather',
        question_data: q
      }));

      const { error: wourError } = await supabase
        .from('room_questions')
        .insert(wourQuestions);

      if (wourError) {
        console.error('Error storing would you rather questions:', wourError);
        throw wourError;
      }
    }

    // Store Paranoia questions
    if (questions.paranoia && Array.isArray(questions.paranoia)) {
      const paranoiaQuestions = questions.paranoia.map((q: any) => ({
        room_id: roomCode,
        game_type: 'paranoia',
        question_data: q
      }));

      const { error: paranoiaError } = await supabase
        .from('room_questions')
        .insert(paranoiaQuestions);

      if (paranoiaError) {
        console.error('Error storing paranoia questions:', paranoiaError);
        throw paranoiaError;
      }
    }

    console.log(`Successfully stored ${questions.would_you_rather?.length || 0} Would You Rather and ${questions.paranoia?.length || 0} Paranoia questions for room ${roomCode}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Generated ${questions.would_you_rather?.length || 0} Would You Rather and ${questions.paranoia?.length || 0} Paranoia questions for your room!`,
      counts: {
        would_you_rather: questions.would_you_rather?.length || 0,
        paranoia: questions.paranoia?.length || 0
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