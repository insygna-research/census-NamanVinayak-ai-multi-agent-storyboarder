import { NextResponse } from 'next/server';
import { QWEN_VL_SYSTEM_MESSAGE } from '@/agents/qwenVL';
import { createCanvas, loadImage } from 'canvas';
import path from 'path';

interface QwenVLReviewResult {
  overall_score: number;
  approved: boolean;
  style_continuity_score: number;
  narrative_progression_score: number;
  timeline_position: string;
  visual_motifs_maintained: boolean;
  script_alignment: boolean;
  auto_reject_triggered: boolean;
  auto_reject_reasons: string[];
  feedback: string[];
  narrative_context_notes: string;
}

/**
 * Function to resize image and convert to base64 for QWEN VL API
 * QWEN VL Plus has a limit of 1,003,520 pixels per image
 */
async function resizeImageToBase64(imagePath: string, maxWidth = 980, maxHeight = 980): Promise<string> {
  try {
    console.log(`Loading image: ${imagePath}`);
    const image = await loadImage(imagePath);
    
    console.log(`Original dimensions: ${image.width}x${image.height}`);
    
    // Calculate new dimensions maintaining aspect ratio
    let newWidth = image.width;
    let newHeight = image.height;
    
    if (newWidth > maxWidth || newHeight > maxHeight) {
      const widthRatio = maxWidth / newWidth;
      const heightRatio = maxHeight / newHeight;
      const ratio = Math.min(widthRatio, heightRatio);
      
      newWidth = Math.floor(newWidth * ratio);
      newHeight = Math.floor(newHeight * ratio);
    }
    
    console.log(`Resized dimensions: ${newWidth}x${newHeight}`);
    
    // Create canvas and resize
    const canvas = createCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0, newWidth, newHeight);
    
    // Convert to base64
    const buffer = canvas.toBuffer('image/png');
    const base64 = buffer.toString('base64');
    
    console.log(`Base64 size: ${base64.length} characters`);
    console.log(`Image size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error(`Error processing image ${imagePath}:`, error);
    throw error;
  }
}

/**
 * QWEN VL Review Agent endpoint to evaluate generated images for continuity and approval
 * Uses the QWEN VL Plus model via Alibaba Cloud DashScope API
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { 
      director_output, 
      dop_output, 
      original_script, 
      generated_images 
    } = body;
    
    if (!director_output || !dop_output || !original_script || !generated_images || !Array.isArray(generated_images)) {
      return NextResponse.json({
        error: 'director_output, dop_output, original_script, and generated_images (array) are all required'
      }, { status: 400 });
    }

    if (generated_images.length < 3) {
      return NextResponse.json({
        error: 'At least 3 images are required for comparison (A, B, and C frames)'
      }, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.ARSHH_ALIBABA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'Alibaba API key is not configured'
      }, { status: 500 });
    }

    console.log('Calling QWEN VL Review Agent...');
    console.log(`Director output preview: ${JSON.stringify(director_output).substring(0, 100)}...`);
    console.log(`DoP output preview: ${JSON.stringify(dop_output).substring(0, 100)}...`);
    console.log(`Script preview: ${original_script.substring(0, 100)}...`);
    console.log(`Number of images to review: ${generated_images.length}`);

    // For the QWEN VL model, we'll evaluate the images in groups of 3
    // Taking the first 3 images as A, B, and candidate C for review
    const frameAPaths = generated_images[0];
    const frameBPaths = generated_images[1];
    const candidateCPaths = generated_images[2];

    // Convert local image paths to base64
    console.log('Converting images to base64...');
    let frameA: string, frameB: string, candidateC: string;
    
    try {
      // Check if the paths are URLs or local file paths
      if (frameAPaths.startsWith('http')) {
        // If they're already URLs, use them directly
        frameA = frameAPaths;
        frameB = frameBPaths;
        candidateC = candidateCPaths;
      } else {
        // Convert local file paths to base64
        const publicDir = path.join(process.cwd(), 'public');
        frameA = await resizeImageToBase64(path.join(publicDir, frameAPaths));
        frameB = await resizeImageToBase64(path.join(publicDir, frameBPaths));
        candidateC = await resizeImageToBase64(path.join(publicDir, candidateCPaths));
      }
    } catch (imageError) {
      console.error('Error processing images:', imageError);
      return NextResponse.json({
        error: 'Failed to process images for QWEN VL analysis',
        details: imageError instanceof Error ? imageError.message : 'Unknown image processing error'
      }, { status: 500 });
    }

    // Prepare the user content message with context and images
    // For QWEN VL models, we need to combine system instructions with user content
    const userContent = [
      {
        type: "text",
        text: `${QWEN_VL_SYSTEM_MESSAGE}

Please evaluate the visual continuity and narrative alignment of these frames.

CONTEXT INFORMATION:

ORIGINAL SCRIPT:
"${original_script}"

DIRECTOR'S CREATIVE VISION:
${JSON.stringify(director_output)}

DIRECTOR OF PHOTOGRAPHY NOTES:
${JSON.stringify(dop_output)}

TASK:
You are evaluating Frame C for its consistency with reference Frames A & B, and alignment with the Director's and DoP's vision. Please analyze and provide your evaluation in the exact JSON format specified in your system instructions.

FRAME SEQUENCE:
- Frame A (Reference): First image
- Frame B (Reference): Second image  
- Frame C (Candidate): Third image to evaluate`
      },
      {
        type: "image_url",
        image_url: {
          url: frameA
        }
      },
      {
        type: "image_url", 
        image_url: {
          url: frameB
        }
      },
      {
        type: "image_url",
        image_url: {
          url: candidateC
        }
      }
    ];

    // Create the request payload for Alibaba Cloud DashScope
    // QWEN VL models only support user messages with vision content
    const payload = {
      model: "qwen-vl-plus",
      messages: [
        {
          role: "user",
          content: userContent
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    };

    // Make the API request to Alibaba Cloud DashScope
    const response = await fetch('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Alibaba API error (${response.status}): ${errorText}`);
      return NextResponse.json({
        error: `Alibaba API error: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('QWEN VL response received:', JSON.stringify(result, null, 2));

    // Extract the response content
    if (result.choices?.[0]?.message?.content) {
      const qwenResponse = result.choices[0].message.content;
      
      try {
        // Clean the response by removing markdown code blocks if present
        let cleanedResponse = qwenResponse.trim();
        
        // Remove markdown code blocks if present
        if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.slice(7, -3).trim();
        } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.slice(3, -3).trim();
        }
        
        // Try to parse the cleaned JSON response
        const reviewResult: QwenVLReviewResult = JSON.parse(cleanedResponse);
        
        return NextResponse.json({
          success: true,
          reviewResult,
          rawResponse: qwenResponse,
          framesEvaluated: {
            frameA,
            frameB, 
            candidateC
          },
          usage: result.usage
        });
      } catch (parseError) {
        // If JSON parsing fails, return the raw response
        console.error('Failed to parse QWEN VL response as JSON:', parseError);
        return NextResponse.json({
          success: true,
          rawResponse: qwenResponse,
          framesEvaluated: {
            frameA,
            frameB,
            candidateC
          },
          warning: 'Response could not be parsed as JSON',
          usage: result.usage
        });
      }
    } else {
      return NextResponse.json({
        error: 'No valid response received from QWEN VL model',
        details: result
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Error in qwen-vl-review endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}
