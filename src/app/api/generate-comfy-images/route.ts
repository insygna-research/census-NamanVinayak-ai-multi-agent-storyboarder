import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export async function POST(request: Request) {
  try {
    const { prompts, folderId } = await request.json();
    
    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return NextResponse.json({ error: 'Valid prompts array is required' }, { status: 400 });
    }
    
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required. Initialize a project first.' }, { status: 400 });
    }
    
    // Create the directory for this script's images
    const publicDir = path.join(process.cwd(), 'public', folderId);
    
    try {
      await fs.access(publicDir);
    } catch {
      await fs.mkdir(publicDir, { recursive: true });
      await fs.chmod(publicDir, 0o755);
    }
    
    // Save prompts to a temporary file for the Python script to read
    const promptsFilePath = path.join(process.cwd(), 'src', 'utils', 'temp_prompts.json');
    await fs.writeFile(promptsFilePath, JSON.stringify(prompts));
    
    // Set the output directory for the Python script
    process.env.OUTPUT_DIR = publicDir;
    
    // Ensure API key is available for the Python script
    const apiKey = process.env.ARSHH_RUNPOD_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'RunPod API key is not configured' }, { status: 500 });
    }
    
    console.log(`Starting ComfyUI image generation for ${prompts.length} prompts...`);
    console.log(`Output directory: ${publicDir}`);
    
    return new Promise<Response>((resolve) => {
      const pythonScript = path.join(process.cwd(), 'src', 'utils', 'comfyEndpointTest.py');
      const python = spawn('python3', [pythonScript, '--prompts-file', promptsFilePath], {
        cwd: path.dirname(pythonScript),
        env: { 
          ...process.env, 
          OUTPUT_DIR: publicDir,
          ARSHH_RUNPOD_API_KEY: apiKey
        }
      });
      
      let output = '';
      let errorOutput = '';
      const generatedImages: string[] = [];
      
      python.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log('Python stdout:', text);
        
        // Check for successful image generation
        const imageMatch = text.match(/saved as (.+\.png)/);
        if (imageMatch) {
          const imagePath = imageMatch[1];
          const fileName = path.basename(imagePath);
          generatedImages.push(`/${folderId}/${fileName}`);
        }
      });
      
      python.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error('Python stderr:', text);
      });
      
      python.on('close', async (code) => {
        // Clean up temp file
        try {
          await fs.unlink(promptsFilePath);
        } catch (error) {
          console.warn('Could not clean up temp prompts file:', error);
        }
        
        if (code === 0) {
          console.log(`ComfyUI image generation completed successfully. Generated ${generatedImages.length} images.`);
          resolve(NextResponse.json({
            success: true,
            generatedImages,
            totalImages: generatedImages.length,
            message: `Successfully generated ${generatedImages.length} images`,
            output
          }));
        } else {
          console.error(`ComfyUI image generation failed with code ${code}`);
          resolve(NextResponse.json({
            success: false,
            error: `Image generation failed with exit code ${code}`,
            errorOutput,
            output
          }, { status: 500 }));
        }
      });
      
      python.on('error', (error) => {
        console.error('Python process error:', error);
        resolve(NextResponse.json({
          success: false,
          error: `Failed to start Python process: ${error.message}`
        }, { status: 500 }));
      });
    });
    
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
