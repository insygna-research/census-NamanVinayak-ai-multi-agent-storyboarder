import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Transcribe audio using the Nvidia Python script
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { audioUrl, projectFolder } = body;
    
    if (!audioUrl) {
      return NextResponse.json({ 
        error: 'audioUrl is required' 
      }, { status: 400 });
    }

    // Extract filename and folder from the audio URL
    const urlParts = audioUrl.split('/');
    const audioFileName = urlParts.pop(); // Get the filename
    const folderName = projectFolder || urlParts[1]; // Use provided folder or extract from URL
    
    if (!audioFileName || !folderName) {
      return NextResponse.json({
        error: 'Could not extract filename or folder from audioUrl'
      }, { status: 400 });
    }

    // Construct the full paths
    const audioPath = path.join(process.cwd(), 'public', folderName, audioFileName);
    const transcriptionFileName = audioFileName.replace(/\.(wav|mp3)$/, '_transcription.json');
    const outputPath = path.join(process.cwd(), 'public', folderName, transcriptionFileName);

    console.log('Audio file path:', audioPath);
    console.log('Output path:', outputPath);

    // Check if audio file exists
    if (!fs.existsSync(audioPath)) {
      return NextResponse.json({
        error: `Audio file not found at ${audioPath}`
      }, { status: 400 });
    }

    console.log('Transcribing audio file:', audioPath);
    
    // Get the API key from environment variables
    const apiKey = process.env.ARSHH_RUNPOD_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'RunPod API key is not configured' 
      }, { status: 500 });
    }

    // Path to the Python script
    const scriptPath = path.join(process.cwd(), 'src/nvidia/client/transcribe_audio.py');
    const pythonPath = 'python3'; // Use system Python
    
    // Construct the command with proper escaping - USE SYNC MODE FOR FASTER PROCESSING
    const command = [
      pythonPath, // Use system Python
      `"${scriptPath}"`,
      `"${audioPath}"`,
      '--api-key', apiKey,
      '--endpoint-id', '3bm1957lpyat1x',
      '--output', `"${outputPath}"`,
      '--sync',  // Force synchronous mode to avoid queue delays
      '--timeout', '300'  // 5 minute timeout instead of 15
    ].join(' ');
    console.log('Executing command:', command);

    // Execute the Python script
    const { stdout, stderr } = await execAsync(command, { 
      timeout: 360000, // 6 minutes timeout (reduced from 15)
      cwd: process.cwd(), // Set working directory
      env: { 
        ...process.env,
        ARSHH_RUNPOD_API_KEY: apiKey,
        PATH: '/usr/bin:/bin:/usr/local/bin:' + (process.env.PATH || '') // Ensure system Python is available
      }
    });

    console.log('Python script stdout:', stdout);
    if (stderr) {
      console.log('Python script stderr:', stderr);
    }

    // Determine the output file path
    let resultPath = outputPath;
    if (!resultPath) {
      const baseName = path.basename(audioPath, path.extname(audioPath));
      resultPath = path.join(process.cwd(), 'public', `${baseName}_transcription.json`);
    }

    // Check if the output file was created
    if (!fs.existsSync(resultPath)) {
      return NextResponse.json({
        error: 'Transcription failed - output file not created',
        stdout,
        stderr
      }, { status: 500 });
    }

    // Read and return the transcription result
    const transcriptionData = JSON.parse(fs.readFileSync(resultPath, 'utf8'));
    
    console.log('Transcription completed successfully');
    
    return NextResponse.json({
      success: true,
      transcription: transcriptionData,
      transcript: transcriptionData.transcript,
      word_timestamps: transcriptionData.word_timestamps,
      outputPath: resultPath,
      stdout,
      stderr
    });

  } catch (error: unknown) {
    console.error('Error in transcribe-audio endpoint:', error);
    
    let errorMessage = 'An unexpected error occurred';
    let details = '';
    
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check if it's an exec error with additional info
      if ('stdout' in error || 'stderr' in error) {
        const execError = error as Error & { stdout?: string; stderr?: string };
        details = `stdout: ${execError.stdout || ''}\nstderr: ${execError.stderr || ''}`;
      }
    }
    
    return NextResponse.json({
      error: errorMessage,
      details
    }, { status: 500 });
  }
}
