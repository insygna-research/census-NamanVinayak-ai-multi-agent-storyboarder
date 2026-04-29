import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  try {
    // Extract prompts array, model type, and styleUUID from request
    const { prompts, folderId, model = 'ideogram', styleUUID = '', aspectRatio = '16:9' } = await request.json();
    
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json({ error: 'Valid prompts array is required' }, { status: 400 });
    }
    
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required. Initialize a project first.' }, { status: 400 });
    }
    
    // Create the directory for this script's images
    const publicDir = path.join(process.cwd(), 'public', folderId);
    
    // Create the directory if it doesn't exist
    try {
      await fs.access(publicDir);
      console.log(`Directory exists: ${publicDir}`);
    } catch {
      // Create directory if it doesn't exist
      console.log(`Directory does not exist, creating: ${publicDir}`);
      try {
        await fs.mkdir(publicDir, { recursive: true });
        console.log(`Created directory: ${publicDir}`);
        
        // Set directory permissions to ensure it's readable
        try {
          await fs.chmod(publicDir, 0o755);
          console.log(`Set directory permissions to 0755 for ${publicDir}`);
        } catch (chmodError) {
          console.error('Error setting directory permissions:', chmodError);
        }
      } catch (mkdirError) {
        console.error('Error creating directory:', mkdirError);
        return NextResponse.json({ error: 'Invalid or inaccessible folder ID' }, { status: 400 });
      }
    }
    
    // Determine which API to use based on the model parameter
    let generateImagesFunction;
    let fileExtension = '.png'; // Default for Ideogram
    
    // Log the model choice for debugging
    console.log(`Image generation model: ${model}, aspect ratio: ${aspectRatio}, style: ${styleUUID || 'none'}`);
    
    switch (model) {
      case 'flux-schnell':
      case 'flux-dev':
        console.log(`Using ${model} model with Leonardo AI`);
        fileExtension = '.jpg'; // Leonardo AI returns JPG images
        generateImagesFunction = model === 'flux-schnell' 
          ? (prompts: string[], folderId: string) => generateImagesWithFluxSchnell(prompts, folderId, styleUUID, aspectRatio)
          : (prompts: string[], folderId: string) => generateImagesWithFluxDev(prompts, folderId, styleUUID, aspectRatio);
        break;
      case 'ideogram':
      default:
        console.log('Using Ideogram model');
        fileExtension = '.png'; // Ideogram returns PNG images
        generateImagesFunction = (prompts: string[], folderId: string) => 
          generateImagesWithIdeogram(prompts, folderId, publicDir, fileExtension, aspectRatio);
        break;
    }
    
    // Generate images for all prompts using the selected model
    const results = await generateImagesFunction(prompts, folderId);
    
    // Log the results for debugging
    console.log(`Generated ${results.length} images with ${results.filter(r => r.success).length} successes`);
    results.forEach((result, i) => {
      if (result.success) {
        console.log(`Result ${i+1}: ${result.imageUrl}`);
        
        // Verify that the file actually exists on disk
        const filePath = path.join(process.cwd(), 'public', result.imageUrl.replace(/^\//, ''));
        fs.access(filePath)
          .then(() => console.log(`✅ File exists: ${filePath}`))
          .catch(err => console.error(`❌ File does not exist: ${filePath}`, err));
      } else {
        console.log(`Result ${i+1} failed: ${result.error}`);
      }
    });
    
    return NextResponse.json({
      success: true,
      folderId,
      model,
      results
    });
    
  } catch (error: unknown) {
    console.error('Error in generate-multiple-images endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * Generate images using the Ideogram API
 */
async function generateImagesWithIdeogram(
  prompts: string[], 
  folderId: string, 
  publicDir: string, 
  fileExtension: string = '.png',
  aspectRatio: string = '16:9'
) {
  // Get the Ideogram API key from environment variables
  const apiKey = process.env.IDEOGRAM_API_KEY || '';
  if (!apiKey) {
    throw new Error('Ideogram API key is not configured');
  }
  
  const results = [];
  let index = 1;
  
  // Convert aspectRatio to Ideogram's expected format
  const ideogramAspectRatio = aspectRatio === '9:16' ? 'ASPECT_9_16' : 'ASPECT_16_9';
  
  for (const prompt of prompts) {
    console.log(`Generating image ${index} with Ideogram for prompt: "${prompt}" with aspect ratio: ${ideogramAspectRatio}`);
    
    try {
      // Make API request to Ideogram
      const url = 'https://api.ideogram.ai/generate';
      const options = {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_request: {
            prompt: prompt,
            aspect_ratio: ideogramAspectRatio, // Use the selected aspect ratio
            model: "V_2A_TURBO", // Using the V_2A model as specified
            magic_prompt_option: "AUTO",
            style_type: "REALISTIC"
          }
        })
      };
      
      // Generate the image
      const response = await fetch(url, options);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error(`Ideogram API error (${response.status}): ${errorData}`);
        results.push({
          index,
          prompt,
          success: false,
          error: `API error: ${response.status}`
        });
        index++;
        continue;
      }
      
      const data = await response.json();
      console.log(`Ideogram API response for prompt ${index}:`, JSON.stringify(data, null, 2));
      
      // Check if the response contains image data
      if (!data.data || data.data.length === 0 || !data.data[0].url) {
        console.error(`No image URL in Ideogram response for prompt ${index}`);
        results.push({
          index,
          prompt,
          success: false,
          error: 'No image URL in response'
        });
        index++;
        continue;
      }
      
      const imageUrl = data.data[0].url;
      console.log(`Received image URL: ${imageUrl}`);
      
      // Download the image from the provided URL
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }
      
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      
      const filename = `prompt-${index}${fileExtension}`;
      const outputPath = path.join(publicDir, filename);
      
      try {
        await fs.writeFile(outputPath, imageBuffer);
        console.log(`Image ${index} saved to ${outputPath}`);
        
        // Verify the file exists after writing
        try {
          const fileStats = await fs.stat(outputPath);
          console.log(`File successfully created with size: ${fileStats.size} bytes`);
        } catch (err) {
          console.error(`Error verifying file existence: ${err}`);
        }
        
        // Ensure URL starts with a slash and includes the full path
        const imagePathUrl = `/${folderId}/${filename}`;
        console.log(`Image URL path: ${imagePathUrl}`);
        
        results.push({
          index,
          prompt,
          success: true,
          imageUrl: imagePathUrl,
          sourceUrl: imageUrl
        });
      } catch (saveError) {
        console.error(`Error saving image ${index}:`, saveError);
        results.push({
          index,
          prompt,
          success: false,
          error: 'Error saving image'
        });
      }
    } catch (promptError) {
      console.error(`Error generating image ${index}:`, promptError);
      results.push({
        index,
        prompt,
        success: false,
        error: promptError instanceof Error ? promptError.message : 'Unknown error'
      });
    }
    
    index++;
  }
  
  return results;
}

/**
 * Generate images using the Flux Schnell model via Leonardo AI
 */
async function generateImagesWithFluxSchnell(
  prompts: string[], 
  folderId: string, 
  styleUUID: string = '',
  aspectRatio: string = '16:9'
) {
  const results = [];
  let index = 1;
  
  for (const prompt of prompts) {
    console.log(`Generating image ${index} with Flux Schnell for prompt: "${prompt}" with aspect ratio: ${aspectRatio}`);
    
    try {
      // Call our API route for Flux Schnell
      const response = await fetch(`${getBaseUrl()}/api/generate-flux-schnell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          folderId,
          index,
          styleUUID,
          aspectRatio
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Flux Schnell API error: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        results.push({
          index,
          prompt,
          success: true,
          imageUrl: data.imageUrl
        });
        
        // Log the successful image URL for debugging
        console.log(`Successful Flux Schnell image generation. URL: ${data.imageUrl}`);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error generating image ${index} with Flux Schnell:`, error);
      results.push({
        index,
        prompt,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    index++;
  }
  
  return results;
}

/**
 * Generate images using the Flux Dev model via Leonardo AI
 */
async function generateImagesWithFluxDev(
  prompts: string[], 
  folderId: string, 
  styleUUID: string = '',
  aspectRatio: string = '16:9'
) {
  const results = [];
  let index = 1;
  
  for (const prompt of prompts) {
    console.log(`Generating image ${index} with Flux Dev for prompt: "${prompt}" with aspect ratio: ${aspectRatio}`);
    
    try {
      // Call our API route for Flux Dev
      const response = await fetch(`${getBaseUrl()}/api/generate-flux-dev`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          folderId,
          index,
          styleUUID,
          aspectRatio
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Flux Dev API error: ${errorData.error || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        results.push({
          index,
          prompt,
          success: true,
          imageUrl: data.imageUrl
        });
        
        // Log the successful image URL for debugging
        console.log(`Successful Flux Dev image generation. URL: ${data.imageUrl}`);
      } else {
        throw new Error(data.error || 'Unknown error');
      }
    } catch (error) {
      console.error(`Error generating image ${index} with Flux Dev:`, error);
      results.push({
        index,
        prompt,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    index++;
  }
  
  return results;
}

/**
 * Get the base URL for API calls
 */
function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3000'
    : `https://${process.env.NEXT_PUBLIC_VERCEL_URL || 'localhost:3000'}`;
} 