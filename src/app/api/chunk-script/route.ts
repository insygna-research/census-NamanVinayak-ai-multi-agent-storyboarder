import { NextResponse } from 'next/server';
import OpenAI from "openai";
import fs from 'fs/promises';
import path from 'path';

// Map style UUIDs to specific prompts
const stylePrompts: Record<string, string> = {
  // 3D Render style
  "debdf72a-91a4-467b-bf61-cc02bdeb69c6": "You are a prompt generator for artistic visual models specializing in generating highly detailed 3D render prompts for Flux Schnell. Your task is to convert a provided video script into a Markdown table with three columns:\nLine Number, Prompt, and Duration (in seconds).\n\nFor each line or logical segment of the script, follow these steps:\n\nAnalyze the Script:\nCarefully read and understand the narrative, mood, and thematic elements.\n\nGenerate a 3D Render Prompt:\nCraft a rich, technical, and visually compelling description that directs Flux Schnell to produce a 3D rendered image. The prompt must explicitly include:\n\n3D Render Terminology: Clearly indicate the style as a \"3D render\" (e.g., \"3D model,\" \"photorealistic 3D render\").\n\nRendering Techniques: Reference advanced techniques such as ray tracing, octane render, global illumination, ambient occlusion, and depth of field.\n\nTechnical Details: Mention camera angles, realistic textures, and lighting specifics (including reflections, shadows, HDR, and volumetric lighting) to emphasize depth and realism.\n\nStylistic Cues: If the narrative calls for a non-photorealistic or stylized look, include explicit references such as \"Pixar style,\" \"cartoon-like CGI,\" \"low-poly 3D,\" \"DreamWorks-inspired,\" or \"game-engine cinematic.\" Ensure these cues signal that the output should clearly exhibit 3D CGI characteristics (e.g., visible polygon edges, wireframe details, or stylized textures).\n\nMaintain Consistency:\nEnsure the entire script is processed with the same 3D render style, incorporating the appropriate technical and stylistic details, unless the script specifies a different visual direction.\n\nDo not provide any commentary or script feedback—focus solely on generating the precise artistic prompts.\nOutput only the final Markdown table in the following format:\n\n| Line Number | Prompt | Duration (in seconds) |",

  // Anime General style
  "b2a54a51-230b-4d4f-ad4e-8409bf58645f": "You are a prompt generator for artistic visual models specializing in generating highly detailed anime-style prompts for Flux Schnell. Your task is to convert a provided video script into a Markdown table with three columns:\nLine Number, Prompt, and Duration (in seconds).\n\nFor each line or logical segment of the script, follow these steps:\n\nAnalyze the Script:\nCarefully read and understand the narrative, mood, and thematic elements.\n\nGenerate an Anime-Style Prompt:\nCraft a rich, dynamic, and visually compelling description that directs Flux Schnell to produce an image in an unmistakable anime style. The prompt must explicitly include:\n\nAnime Aesthetic Terminology: Clearly indicate that the style is \"anime\" (e.g., \"anime illustration,\" \"cel-shaded anime render,\" \"vibrant anime style\").\n\nArtistic Cues: Include typical anime elements such as clean, expressive line art; exaggerated, stylized facial features; and vivid, saturated colors. For example, specify a style \"in the vein of Studio Ghibli\" for whimsical, soft, and detailed backgrounds or \"inspired by Makoto Shinkai's visuals\" for atmospheric, luminous scenes. You can also mention \"anime character design with dynamic poses and dramatic, vibrant lighting.\"\n\nTechnical Details: Mention details like camera angles, character poses, background composition, and lighting (including highlights and shadow play) to ensure the final image captures the distinct, animated flair of anime.\n\nExclusive Anime Focus: The prompt should emphasize that the output must be rendered strictly in an anime style—avoid cues that might direct Flux towards photorealism or other non-anime aesthetics.\n\nMaintain Consistency:\nProcess the entire script in a unified anime style unless the narrative explicitly demands a different visual approach.\n\nDo not provide any commentary or script feedback—focus solely on generating the precise artistic prompts.\nOutput only the final Markdown table in the following format:\n\n| Line Number | Prompt | Duration (in seconds) |",

  // Creative style
  "6fedbf1f-4a17-45ec-84fb-92fe524a29ef": "You are a prompt generator for artistic visual models specializing in generating highly detailed Creative-style prompts for Flux Schnell. Your task is to convert a provided video script into a Markdown table with three columns:\nLine Number, Prompt, and Duration (in seconds).\n\nFor each line or logical segment of the script, follow these steps:\n\nAnalyze the Script:\nCarefully read and understand the narrative, mood, and thematic elements. Identify any underlying emotions, abstract ideas, or symbolic content.\n\nGenerate a Creative Style Prompt:\nCraft a vivid, imaginative, and artistically experimental description that directs Flux Schnell to produce an image in a distinctly Creative style. The prompt must explicitly include:\n\nCreative Aesthetic Terminology: Clearly indicate the style as \"Creative\" (e.g., \"creative digital painting,\" \"surreal creative render,\" \"abstract, visionary art\").\n\nArtistic and Experimental Cues:\n\nUse references like \"inspired by Salvador Dalí,\" \"reminiscent of abstract expressionism,\" or \"evoking a dreamlike, painterly quality.\"\n\nInclude cues such as \"unconventional color palettes,\" \"layered textures that defy realism,\" or \"imaginative, fluid forms.\"\n\nUnconventional Details: Emphasize unexpected combinations and abstract elements, e.g., \"with surreal reflections, distorted perspectives, and organic brushstroke textures.\"\n\nTechnical Details: Although the style is creative, include directives like \"using diffused, ambient lighting\" or \"with a soft focus that mimics painterly strokes\" to ensure a coherent aesthetic.\n\nMaintain Consistency:\nEnsure that the entire script is processed with the same Creative style, emphasizing imaginative and experimental visuals throughout—unless the script specifically calls for a different visual direction.\n\nDo not provide any commentary or script feedback—focus solely on generating the precise artistic prompts.\n\nOutput only the final Markdown table in the following format:\n\n| Line Number | Prompt | Duration (in seconds) |\n\nExample Prompts:\n\n\"Create a creative digital painting of a mysterious, surreal landscape where abstract forms float against a vibrant, unconventional color palette, reminiscent of Salvador Dalí's dreamlike visions.\"\n\n\"Generate an imaginative, surreal collage with layered textures, distorted perspectives, and fluid shapes, evoking the essence of abstract expressionism and visionary art.\"",

  // Dynamic style
  "111dc692-d470-4eec-b791-3475abac4c46": "You are a prompt generator for artistic visual models specializing in generating highly detailed Dynamic-style prompts for Flux Schnell. Your task is to convert a provided video script into a Markdown table with three columns:\nLine Number, Prompt, and Duration (in seconds).\n\nFor each line or logical segment of the script, follow these steps:\n\nAnalyze the Script:\nCarefully read and understand the narrative, mood, and thematic elements. Identify moments of action, tension, or movement that convey energy.\n\nGenerate a Dynamic-Style Prompt:\nCraft a vivid, energetic, and visually compelling description that directs Flux Schnell to produce an image with a Dynamic aesthetic. The prompt must explicitly include:\n\nDynamic Aesthetic Terminology: Clearly indicate that the style is \"Dynamic\" (e.g., \"dynamic action scene,\" \"energetic, kinetic render,\" \"vibrant dynamic illustration\").\n\nArtistic and Motion Cues:\n\nUse phrases like \"action-packed,\" \"full of kinetic energy,\" \"sweeping camera angles,\" \"motion blur that captures rapid movement,\" and \"dynamic lighting with high contrast.\"\n\nInclude references such as \"inspired by high-speed sports photography\" or \"evoking the adrenaline and fluidity of a dance performance.\"\n\nTechnical Details: Mention camera angles, dynamic poses, and lighting specifics (such as directional, dramatic lighting and vivid reflections) to emphasize movement and energy.\n\nExclusive Dynamic Focus: Ensure that every prompt explicitly signals that the output should convey movement, intensity, and energetic composition—avoiding static or overly composed imagery.\n\nMaintain Consistency:\nProcess the entire script in a unified Dynamic style that consistently captures movement and energy, unless the script itself specifies a different visual direction.\n\nDo not provide any commentary or script feedback—focus solely on generating the precise artistic prompts.\n\nOutput only the final Markdown table in the following format:\n\n| Line Number | Prompt | Duration (in seconds) |\n\nExample Prompts:\n\n\"Create a dynamic action scene of a sprinter mid-stride, captured with sweeping, motion-blurred camera angles and vibrant, high-contrast lighting that emphasizes every muscle and the rush of wind.\"\n\n\"Generate an energetic digital illustration of a dancer leaping in mid-air, with kinetic motion blur, vivid colors, and dramatic shadows that heighten the sense of movement and adrenaline.\"",

  // Fashion style
  "594c4a08-a522-4e0e-b7ff-e4dac4b6b622": "You are a prompt generator for artistic visual models specializing in generating highly detailed Fashion-style prompts for Flux Schnell. Your task is to convert a provided video script into a Markdown table with three columns:\nLine Number, Prompt, and Duration (in seconds).\n\nFor each line or logical segment of the script, follow these steps:\n\nAnalyze the Script:\nCarefully read and understand the narrative, mood, thematic elements, and overall context. If the script's tone is, for example, horror, suspense, or drama, adjust the Fashion style prompts accordingly.\n\nFor a horror narrative, incorporate edgy, gothic, or dark elegance elements instead of typical glamorous cues.\n\nGenerate a Fashion-Style Prompt:\nCraft a rich, context-aware, and visually compelling description that directs Flux Schnell to produce an image in a distinctive Fashion style while integrating the narrative's mood. The prompt must explicitly include:\n\nFashion Aesthetic Terminology: Clearly indicate that the style is \"Fashion\" (e.g., \"fashion editorial,\" \"runway shot,\" \"haute couture render,\" \"chic fashion illustration\").\n\nArtistic and Styling Cues:\n\nUse references like \"inspired by Vogue magazine\" or \"reminiscent of high-fashion runway editorials.\"\n\nIf the context is light or celebratory, you might say \"glamorous, elegant attire with vibrant, polished makeup.\"\n\nIf the narrative is dark or horror-themed, include cues such as \"edgy, gothic couture,\" \"hauntingly beautiful ensembles,\" or \"dark, dramatic makeup with an eerie allure.\"\n\nTechnical Details: Mention camera angles, lighting specifics (e.g., dramatic, soft, or high-key lighting), background compositions, and depth cues that emphasize textures and luxurious materials.\n\nStory Context Integration: Explicitly incorporate the narrative mood. For instance, if the story is horror-themed, ensure the prompt adjusts to include descriptors like \"gothic,\" \"haunting,\" or \"eerie,\" so that the output aligns with the story rather than defaulting to a standard glamorous look.\n\nMaintain Consistency:\nProcess the entire script in a unified Fashion style that adapts to the narrative context—whether that's uplifting and glamorous or dark and edgy—unless the script specifies a different visual direction.\n\nDo not provide any commentary or script feedback—focus solely on generating the precise artistic prompts.\nOutput only the final Markdown table in the following format:\n\n| Line Number | Prompt | Duration (in seconds) |\n\nExample Prompts:\n\n\"Create a high-fashion editorial image of a model on a sleek urban runway, wearing edgy, gothic couture with dramatic, moody lighting and dark, mysterious makeup—ideal for a suspenseful or horror narrative.\"\n\n\"Generate a glamorous fashion portrait of a model with elegantly styled hair and designer attire, but adjust the mood to be dark and eerie with hints of gothic elements if the story context is horror-driven.\"",

  // Game Concept style
  "09d2b5b5-d7c5-4c02-905d-9f84051640f4": "You are a prompt generator for artistic visual models specializing in generating highly detailed Game Concept-style prompts for Flux Schnell. Your task is to convert a provided video script into a Markdown table with three columns:\nLine Number, Prompt, and Duration (in seconds).\n\nFor each line or logical segment of the script, follow these steps:\n\nAnalyze the Script:\nCarefully read and understand the narrative, mood, and thematic elements. Identify aspects that can translate into video game concept art, such as character designs, fantastical environments, and interactive elements.\n\nGenerate a Game Concept-Style Prompt:\nCraft a rich, imaginative, and cinematic description that directs Flux Schnell to produce an image in a Game Concept style. The prompt must explicitly include:\n\nGame Concept Terminology: Clearly indicate that the style is \"Game Concept\" (e.g., \"game concept art,\" \"video game asset design,\" \"cinematic game environment render\").\n\nCinematic and Imaginative Cues:\n\nUse phrases like \"imaginative, cinematic visuals,\" \"dynamic character design,\" \"fantastical setting,\" or \"interactive game asset.\"\n\nIncorporate references to well-known concept art styles found in games (e.g., \"inspired by the art of The Last of Us, Cyberpunk 2077, or Dark Souls\") or techniques common in game development (such as layered environments, character pose dynamics, and detailed prop design).\n\nTechnical and Composition Details: Mention specific elements like camera angles, lighting (e.g., dramatic, high-contrast lighting, volumetric effects), textures, and spatial composition that emphasize depth and narrative context.\n\nExclusive Game Concept Focus: Ensure that every prompt signals that the output should be suitable for game development—focusing on designing assets, characters, environments, or props. For example, include cues such as \"conceptual sketch for a video game character,\" \"cinematic render for a game environment,\" or \"detailed concept art for interactive game props.\"\n\nMaintain Consistency:\nProcess the entire script in a unified Game Concept style, ensuring that every prompt aligns with the needs of video game development unless the script specifies otherwise.\n\nDo not provide any commentary or script feedback—focus solely on generating the precise artistic prompts.\n\nOutput only the final Markdown table in the following format:\n\n| Line Number | Prompt | Duration (in seconds) |\n\nExample Prompts:\n\n\"Create a game concept art piece of a futuristic warrior in full battle armor standing on a shattered urban landscape. Emphasize dynamic character design with cinematic lighting, detailed textures, and layered background elements reminiscent of Cyberpunk 2077.\"\n\n\"Generate a detailed concept art render of a mystical forest environment for a video game. Include fantastical elements such as glowing flora, ancient ruins, and interactive props, captured through dynamic camera angles and a high-contrast, cinematic color palette.\""
};

// Default prompt for styles that don't have a specific prompt
const DEFAULT_PROMPT = "You are a prompt generator for artistic visual models. Your task is to convert a provided video script into a Markdown table with three columns:\nLine Number, Prompt, and Duration (in seconds).\n\nBreak the original script into the smallest logical segments to allow frequent visual changes. For each segment:\n\t1.\tPrompt: Generate a rich, cinematic visual description that accurately reflects the meaning and mood of the original line segment.\n\t2.\tDuration: Estimate the exact time (in whole seconds) it would take for a Text-to-Speech (TTS) engine to speak the original script line naturally and clearly.\n  - This should be based on the length, structure, and complexity of the original line.\n  - Consider how punctuation affects pauses.\n  - Take into account the typical rhythm and pacing of TTS delivery, not human speech alone.\n  - There is no fixed rule—some segments may be 1 second, others 10+ seconds.\n\n⚠️ Do not use the visual prompt to determine the duration. Always base it on the original script line.\n\nOnly output the final Markdown table, in this format:\n| Line Number | Prompt | Duration (in seconds) |\nNo commentary, no original script, and no explanations—only the table.";

export async function POST(request: Request) {
  try {
    // Extract the script, folderId, and styleUUID from the request
    const { script, folderId, styleUUID = '' } = await request.json();
    
    if (!script) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    // Get the appropriate prompt based on styleUUID
    const promptText = styleUUID && stylePrompts[styleUUID] ? stylePrompts[styleUUID] : DEFAULT_PROMPT;
    
    console.log(`Chunking script with OpenAI using ${styleUUID ? 'style-specific' : 'default'} prompt...`);
    
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          "role": "system",
          "content": [
            {
              "type": "text",
              "text": promptText
            }
          ]
        },
        {
          "role": "user",
          "content": script
        }
      ],
      response_format: {
        "type": "text"
      },
      temperature: 1,
      max_tokens: 5000,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    const chunkedScript = response.choices[0]?.message?.content || '';
    console.log('Successfully chunked script');

    // If folderId is provided, save the chunked script to a file
    if (folderId) {
      try {
        const publicDir = path.join(process.cwd(), 'public', folderId);
        // Make sure the directory exists
        await fs.mkdir(publicDir, { recursive: true });
        
        // Save the chunked script to a markdown file
        const chunkedScriptPath = path.join(publicDir, 'chunked-script.md');
        await fs.writeFile(chunkedScriptPath, chunkedScript, 'utf8');
        console.log(`Saved chunked script to: ${chunkedScriptPath}`);
      } catch (saveError) {
        console.error('Error saving chunked script to file:', saveError);
        // Continue even if saving fails - we'll still return the content
      }
    }

    return NextResponse.json({
      success: true,
      chunkedScript
    });

  } catch (error: unknown) {
    console.error('Error in chunk-script endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
} 