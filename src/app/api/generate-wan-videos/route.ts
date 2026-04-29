import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { imageUrls, folderId, prompts } = await request.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json({ error: 'Image URLs are required' }, { status: 400 });
    }

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    const generatedVideos: string[] = [];
    const errors: string[] = [];

    // Process each image to generate a video
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const imageUrl = imageUrls[i];
        const prompt = prompts && prompts[i] ? prompts[i] : "cinematic video transformation, smooth motion, high quality";
        
        console.log(`Generating video ${i + 1}/${imageUrls.length} from image: ${imageUrl}`);
        console.log(`Using prompt: ${prompt}`);

        // Convert relative URL to absolute file path
        const imagePath = path.join(process.cwd(), 'public', imageUrl.replace(/^\//, ''));
        
        // Check if image file exists
        if (!fs.existsSync(imagePath)) {
          throw new Error(`Image file not found: ${imagePath}`);
        }

        // Generate video using the WAN endpoint
        const videoResult = await generateWanVideo(imagePath, prompt, folderId, i + 1);
        
        if (videoResult.success && videoResult.videoUrl) {
          generatedVideos.push(videoResult.videoUrl);
          console.log(`Successfully generated video ${i + 1}: ${videoResult.videoUrl}`);
        } else {
          errors.push(`Video ${i + 1}: ${videoResult.error}`);
          console.error(`Failed to generate video ${i + 1}: ${videoResult.error}`);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Video ${i + 1}: ${errorMessage}`);
        console.error(`Error generating video ${i + 1}:`, errorMessage);
      }
    }

    // Return results
    const response = {
      success: generatedVideos.length > 0,
      generatedVideos,
      totalRequested: imageUrls.length,
      totalGenerated: generatedVideos.length,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log('Video generation complete:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in generate-wan-videos API:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

async function generateWanVideo(imagePath: string, prompt: string, folderId: string, videoIndex: number) {
  try {
    // Import required modules
    const fs = await import('fs');
    
    // Get API key from environment
    const apiKey = process.env.ARSHH_RUNPOD_API_KEY;
    if (!apiKey) {
      throw new Error('ARSHH_RUNPOD_API_KEY environment variable not set');
    }

    // RunPod endpoint configuration
    const endpointId = "umhsvxn4l1sw85";
    const runUrl = `https://api.runpod.ai/v2/${endpointId}/run`;
    const statusUrl = `https://api.runpod.ai/v2/${endpointId}/status/`;

    // Encode image to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    // Create the WAN workflow
    const workflow = createWanWorkflow(base64Image, prompt);

    const payload = {
      input: {
        workflow: workflow
      }
    };

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };

    // Implement retry mechanism like in the Python version
    const maxRetries = 2;
    let jobId: string | null = null;
    let retryCount = 0;

    // Retry job submission
    while (retryCount <= maxRetries) {
      try {
        console.log(`Submitting video generation job for image ${videoIndex} (attempt ${retryCount + 1}/${maxRetries + 1})...`);
        
        const response = await fetch(runUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(payload)
        });

        console.log(`Response Status Code: ${response.status}`);

        if (response.status === 200) {
          const jobData = await response.json();
          jobId = jobData.id;
          
          if (!jobId) {
            throw new Error('No job ID returned from RunPod');
          }

          console.log(`Job submitted with ID: ${jobId}, starting polling...`);
          break; // Success, exit retry loop
        } else {
          const errorText = await response.text();
          console.error(`Attempt ${retryCount + 1} failed: ${response.status} - ${errorText}`);
          
          if (retryCount === maxRetries) {
            throw new Error(`Failed to submit job after ${maxRetries + 1} attempts: ${response.status} - ${errorText}`);
          }
        }
      } catch (error) {
        console.error(`Exception during job submission attempt ${retryCount + 1}:`, error);
        
        if (retryCount === maxRetries) {
          throw new Error(`Failed to submit job after ${maxRetries + 1} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      retryCount++;
      if (retryCount <= maxRetries) {
        console.log('Waiting 10 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds before retry
      }
    }

    if (!jobId) {
      throw new Error('Failed to get job ID after all retry attempts');
    }

    // Poll for completion with extended timeout
    const maxDuration = 30 * 60 * 1000; // 30 minutes (much longer timeout)
    const pollInterval = 10000; // 10 seconds (longer intervals to be gentler on the API)
    const startTime = Date.now();
    let pollCount = 0;

    console.log(`Starting polling for job ${jobId}. Max duration: 30 minutes, poll interval: 10 seconds`);

    while (Date.now() - startTime < maxDuration) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      pollCount++;

      try {
        const statusResponse = await fetch(`${statusUrl}${jobId}`, {
          headers: headers
        });

        if (!statusResponse.ok) {
          console.warn(`Status check attempt ${pollCount} failed: ${statusResponse.status} - ${statusResponse.statusText}`);
          continue; // Continue polling on status check failures
        }

        const statusData = await statusResponse.json();
        const status = statusData.status;

        console.log(`Poll ${pollCount}: Job ${jobId} status: ${status} (elapsed: ${Math.round((Date.now() - startTime) / 1000)}s)`);
        
        // Log additional details for debugging
        if (statusData.delayTime !== undefined) {
          console.log(`  - Delay time: ${statusData.delayTime}s`);
        }
        if (statusData.executionTime !== undefined) {
          console.log(`  - Execution time: ${statusData.executionTime}ms`);
        }
        if (statusData.workerId) {
          console.log(`  - Worker ID: ${statusData.workerId}`);
        }

        if (status === 'COMPLETED') {
          console.log(`Job ${jobId} completed successfully after ${Math.round((Date.now() - startTime) / 1000)} seconds`);
          
          // Process the completed job
          const output = statusData.output;
          const videoUrl = await saveVideoFromOutput(output, folderId, videoIndex);
          
          if (videoUrl) {
            return { success: true, videoUrl };
          } else {
            throw new Error('No video data found in completed job output');
          }
        } else if (status === 'FAILED' || status === 'ERROR') {
          const error = statusData.error || 'Job failed without specific error';
          console.error(`Job ${jobId} failed:`, error);
          console.error(`Full error response:`, JSON.stringify(statusData, null, 2));
          throw new Error(`Job failed: ${error}`);
        }
        // Continue polling for IN_PROGRESS, IN_QUEUE, etc.
        
      } catch (pollError) {
        console.error(`Error during polling attempt ${pollCount}:`, pollError);
        // Continue polling unless it's a job failure
        if (pollError instanceof Error && pollError.message.includes('Job failed:')) {
          throw pollError;
        }
      }
    }

    throw new Error(`Job timed out after 30 minutes (${pollCount} polling attempts)`);

  } catch (error) {
    console.error('Error in generateWanVideo:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

function createWanWorkflow(base64Image: string, prompt: string) {
  const negativePrompt = "deformed, distorted, disfigured, motion smear, blur, low quality";
  
  return {
    "3": {
      "inputs": {
        "seed": Math.floor(Math.random() * 1000000000000000),
        "steps": 20,
        "cfg": 6,
        "sampler_name": "uni_pc",
        "scheduler": "simple",
        "denoise": 1,
        "model": ["89", 0],
        "positive": ["82", 0],
        "negative": ["82", 1],
        "latent_image": ["82", 2]
      },
      "class_type": "KSampler",
      "_meta": { "title": "KSampler" }
    },
    "6": {
      "inputs": {
        "text": prompt,
        "clip": ["38", 0]
      },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "CLIP Text Encode (Positive Prompt)" }
    },
    "7": {
      "inputs": {
        "text": negativePrompt,
        "clip": ["38", 0]
      },
      "class_type": "CLIPTextEncode",
      "_meta": { "title": "CLIP Text Encode (Negative Prompt)" }
    },
    "8": {
      "inputs": {
        "samples": ["3", 0],
        "vae": ["83", 0]
      },
      "class_type": "VAEDecode",
      "_meta": { "title": "VAE Decode" }
    },
    "37": {
      "inputs": {
        "unet_name": "wan2.1_i2v_720p_14B_bf16.safetensors",
        "weight_dtype": "default"
      },
      "class_type": "UNETLoader",
      "_meta": { "title": "Load Diffusion Model" }
    },
    "38": {
      "inputs": {
        "clip_name": "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        "type": "wan",
        "device": "default"
      },
      "class_type": "CLIPLoader",
      "_meta": { "title": "Load CLIP" }
    },
    "53": {
      "inputs": {
        "frame_rate": 16,
        "loop_count": 0,
        "filename_prefix": "generated_video",
        "format": "video/h264-mp4",
        "pix_fmt": "yuv420p",
        "crf": 19,
        "save_metadata": true,
        "trim_to_audio": false,
        "pingpong": false,
        "save_output": true,
        "images": ["8", 0]
      },
      "class_type": "VHS_VideoCombine",
      "_meta": { "title": "Video Combine 🎥🅥🅗🅢" }
    },
    "79": {
      "inputs": {
        "crop": "none",
        "clip_vision": ["81", 0],
        "image": ["80", 0]
      },
      "class_type": "CLIPVisionEncode",
      "_meta": { "title": "CLIP Vision Encode" }
    },
    "80": {
      "inputs": {
        "image": null,
        "image_output": "Save",
        "save_prefix": "input_image",
        "base64_data": base64Image
      },
      "class_type": "easy loadImageBase64",
      "_meta": { "title": "Load Image Base64" }
    },
    "81": {
      "inputs": {
        "clip_name": "clip_vision_h.safetensors"
      },
      "class_type": "CLIPVisionLoader",
      "_meta": { "title": "Load CLIP Vision" }
    },
    "82": {
      "inputs": {
        "width": 512,
        "height": 768,
        "length": 25,
        "batch_size": 1,
        "positive": ["6", 0],
        "negative": ["7", 0],
        "vae": ["83", 0],
        "clip_vision_output": ["79", 0],
        "start_image": ["80", 0]
      },
      "class_type": "WanImageToVideo",
      "_meta": { "title": "WanImageToVideo" }
    },
    "83": {
      "inputs": {
        "vae_name": "wan_2.1_vae.safetensors"
      },
      "class_type": "VAELoader",
      "_meta": { "title": "Load VAE" }
    },
    "89": {
      "inputs": {
        "shift": 8,
        "model": ["37", 0]
      },
      "class_type": "ModelSamplingSD3",
      "_meta": { "title": "ModelSamplingSD3" }
    }
  };
}

async function saveVideoFromOutput(output: unknown, folderId: string, videoIndex: number): Promise<string | null> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    // Create the folder path
    const outputDir = path.join(process.cwd(), 'public', folderId);
    
    // Ensure directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('Processing video output:', JSON.stringify(output, null, 2));

    // Type guard for output structure
    const isValidOutput = (obj: unknown): obj is { node_outputs?: Record<string, unknown>; videos?: unknown[] } => {
      return typeof obj === 'object' && obj !== null;
    };

    if (!isValidOutput(output)) {
      console.error('Invalid output structure');
      return null;
    }

    // Look for video data in various places in the output
    if (output.node_outputs) {
      // Check node 53 (VHS_VideoCombine)
      if (output.node_outputs['53']) {
        const videoData = output.node_outputs['53'];
        const filename = `generated_video_${videoIndex}.mp4`;
        const filePath = path.join(outputDir, filename);
        
        if (Array.isArray(videoData) && videoData.length > 0) {
          const firstVideo = videoData[0];
          if (typeof firstVideo === 'object' && firstVideo !== null && 'data' in firstVideo) {
            // Save base64 video data
            const buffer = Buffer.from(firstVideo.data as string, 'base64');
            fs.writeFileSync(filePath, buffer);
            
            const relativePath = `/${folderId}/${filename}`;
            console.log(`Video saved to: ${relativePath}`);
            return relativePath;
          }
        } else if (typeof videoData === 'string') {
          // Direct base64 string
          const buffer = Buffer.from(videoData, 'base64');
          fs.writeFileSync(filePath, buffer);
          
          const relativePath = `/${folderId}/${filename}`;
          console.log(`Video saved to: ${relativePath}`);
          return relativePath;
        }
      }
    }

    // Check for videos array
    if (output.videos && Array.isArray(output.videos) && output.videos.length > 0) {
      const videoData = output.videos[0];
      const filename = `generated_video_${videoIndex}.mp4`;
      const filePath = path.join(outputDir, filename);
      
      if (typeof videoData === 'string') {
        const buffer = Buffer.from(videoData, 'base64');
        fs.writeFileSync(filePath, buffer);
        
        const relativePath = `/${folderId}/${filename}`;
        console.log(`Video saved to: ${relativePath}`);
        return relativePath;
      }
    }

    console.error('No video data found in output');
    return null;

  } catch (error) {
    console.error('Error saving video:', error);
    return null;
  }
}
