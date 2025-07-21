import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StoryRequest {
  type: 'initial_story' | 'continue_story' | 'final_summary';
  teamDescription?: string;
  storyPlayers?: any[];
  storyHistory?: any[];
  playerAction?: string;
  catPerks?: string[];
  currentTurn?: number;
  maxTurns?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: StoryRequest = await req.json();

    let systemPrompt = "";
    let userPrompt = "";

    switch (requestData.type) {
      case 'initial_story':
        systemPrompt = `You are a fantasy storyteller creating an immersive adventure for a team of magical cats. Create engaging, family-friendly fantasy scenarios that are suitable for all ages. Focus on adventure, mystery, and teamwork. Always write in second person ("You find yourselves..."). Keep responses to 2-3 paragraphs maximum.`;
        
        const storyPlayersInfo = requestData.storyPlayers ? 
          requestData.storyPlayers.map((p: any) => `${p.player_name} (${p.cat_character?.name})`).join(', ') : 
          requestData.teamDescription || "A diverse group of magical cats";
        
        userPrompt = `Create the opening scene for a fantasy adventure featuring these magical cats: ${storyPlayersInfo}. 

Set up an engaging scenario that requires teamwork and adventure. Describe the initial setting and situation clearly. End with a specific action prompt for the first player to respond to. Include mystical elements like ancient ruins, magical artifacts, or mysterious creatures.

Important: End your response with a clear prompt like "What do you do?" or specify what action the cats should take first.`;
        break;

      case 'continue_story':
        systemPrompt = `You are a fantasy storyteller continuing an adventure for magical cats. Consider the cat's special abilities: ${requestData.catPerks?.join(', ') || 'various magical abilities'}. React to the player's action and advance the story meaningfully. Keep responses to 1-2 paragraphs. Always write in second person. Create consequences and new challenges based on their actions.`;
        
        const storyContext = requestData.storyHistory?.slice(-3).map((turn: any) => 
          `Previous: ${turn.ai_prompt}\nAction: ${turn.player_action}\nResult: ${turn.ai_response}`
        ).join('\n\n') || '';
        
        userPrompt = `Story context:\n${storyContext}\n\nThe player has taken this action: "${requestData.playerAction}"\n\nContinue the story by describing what happens as a result of this action. Create engaging consequences and set up the next challenge or decision point. Turn ${requestData.currentTurn}/${requestData.maxTurns}.`;
        break;

      case 'final_summary':
        systemPrompt = `You are a fantasy storyteller creating an epic conclusion. Summarize the entire adventure highlighting key moments, character growth, and the ultimate outcome. Make it feel like a complete, satisfying story conclusion. Write in a narrative style suitable for all ages.`;
        
        const fullStory = requestData.storyHistory?.map((turn: any) => 
          `${turn.ai_prompt}\n${turn.player_action}\n${turn.ai_response}`
        ).join('\n\n') || '';
        
        userPrompt = `Here is the complete adventure story:\n\n${fullStory}\n\nCreate an epic summary that captures the essence of this adventure, highlighting the most important moments and giving a satisfying conclusion to the tale.`;
        break;
    }

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
        temperature: 0.8,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in story-ai function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});