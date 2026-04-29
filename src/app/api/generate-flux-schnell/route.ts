import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import leonardoai from '@/utils/leonardoai';

// Flux Schnell model ID
const FLUX_SCHNELL_MODEL_ID = '1dd50843-d653-4516-a8e3-f0238ee453ff';

/**
 * Generates an image using the Flux Schnell model from Leonardo AI
 * @param prompt - The text prompt for image generation
 * @param outputPath - Where to save the image
 * @param styleUUID - Optional style UUID to use for generation
 * @param aspectRatio - Optional aspect ratio (16:9 or 9:16)
 * @returns Promise with the image URL
 */
async function generateFluxSchnellImage(
  prompt: string, 
  outputPath: string, 
  styleUUID?: string,
  aspectRatio: string = '16:9'
): Promise<string> {
  try {
    // Initialize API key from environment
    leonardoai.auth(process.env.LEONARDO_API_KEY || '');
    
    // Use provided styleUUID or default to Dynamic
    const actualStyleUUID = styleUUID || '111dc692-d470-4eec-b791-3475abac4c46';
    
    // Set dimensions based on aspect ratio
    let width = 512;
    let height = 512;
    
    if (aspectRatio === '16:9') {
      width = 912;
      height = 512;
    } else if (aspectRatio === '9:16') {
      width = 512;
      height = 912;
    }
    
    // Create the generation
    const { data } = await leonardoai.createGeneration({
      modelId: FLUX_SCHNELL_MODEL_ID,
      prompt,
      contrast: 3.5, // Medium contrast
      width: width,
      height: height,
      num_images: 1,
      styleUUID: actualStyleUUID,
      enhancePrompt: false,
      negative_prompt: "nsfw, nude, bad quality, blurry"
    });
    
    // Poll for the result (Leonardo AI is asynchronous)
    console.log(`Generation created with ID: ${data.generationId}`);
    const generationId = data.generationId;
    let result;
    let attempts = 0;
    const maxAttempts = 30; // 30 * 2 seconds = 60 seconds maximum wait time
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Wait for 2 seconds between polls
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check generation status
      result = await leonardoai.getGenerationById(generationId);
      
      // If completed, break out of the loop
      if (result.generations_by_pk.status === 'COMPLETE' && 
          result.generations_by_pk.generated_images.length > 0) {
        break;
      }
      
      // If failed, throw an error
      if (result.generations_by_pk.status === 'FAILED') {
        throw new Error('Image generation failed');
      }
    }
    
    if (!result || !result.generations_by_pk.generated_images.length) {
      throw new Error('Timeout waiting for image generation or no images were generated');
    }
    
    // Get the URL of the first generated image
    const imageUrl = result.generations_by_pk.generated_images[0].url;
    
    // Fetch the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }
    
    // Create the directory if it doesn't exist
    const dir = path.dirname(outputPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Save the image to disk
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    
    // Get the correct extension based on content type
    // Leonardo AI Flux models return JPG images
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    console.log(`Image content type from Leonardo: ${contentType}`);
    
    // Determine file extension from content type
    const extension = contentType.includes('jpeg') || contentType.includes('jpg') ? '.jpg' : '.png';
    console.log(`Using file extension: ${extension}`);
    
    // Update the outputPath with the correct extension
    const originalPath = outputPath;
    outputPath = outputPath.replace(/\.(png|jpg|jpeg)$/i, extension);
    console.log(`Updated output path from ${originalPath} to ${outputPath}`);
    
    // Write the image data to disk
    await fs.writeFile(outputPath, imageBuffer);
    console.log(`Image saved to disk at: ${outputPath}`);
    
    // Verify the file exists after writing
    try {
      const fileStats = await fs.stat(outputPath);
      console.log(`File successfully created with size: ${fileStats.size} bytes`);
    } catch (err) {
      console.error(`Error verifying file existence: ${err}`);
    }

    // Add a small delay to ensure file system operations are complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Return the local path to the saved image (relative to public)
    // Extract just the relative path regardless of the full path structure
    // First, get just the filename and folder from the outputPath
    const folderName = path.basename(path.dirname(outputPath));
    const fileName = path.basename(outputPath);
    const imagePath = `/${folderName}/${fileName}`;
    
    console.log(`Final image path to return: ${imagePath}`);
    return imagePath;
  } catch (error) {
    console.error('Error generating image with Flux Schnell:', error);
    throw error;
  }
}

/**
 * API route handler for Flux Schnell image generation
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const { prompt, folderId, index = 1, styleUUID, aspectRatio = '16:9' } = await request.json();
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }
    
    // Define the output path for the image - use jpg for Leonardo API
    const fileName = `prompt-${index}.jpg`;
    const outputPath = path.join(process.cwd(), 'public', folderId, fileName);
    console.log(`Starting image generation for ${fileName}, output path: ${outputPath}`);
    
    // Generate the image with the provided styleUUID and aspectRatio
    const imagePath = await generateFluxSchnellImage(prompt, outputPath, styleUUID, aspectRatio);
    console.log(`Successfully generated image, returned path: ${imagePath}`);
    
    // Return success response
    return NextResponse.json({
      success: true,
      imageUrl: imagePath,
      prompt
    });
  } catch (error: unknown) {
    console.error('Error in Flux Schnell image generation endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ 
      error: errorMessage,
      success: false 
    }, { status: 500 });
  }
} 