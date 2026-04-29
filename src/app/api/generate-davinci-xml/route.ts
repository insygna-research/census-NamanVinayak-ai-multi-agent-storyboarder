import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs/promises';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * A simpler function to get audio duration using Node's native child_process
 * This avoids the webpack issues with the ffprobe package
 * @param filePath Path to the audio file
 * @returns Duration in seconds
 */
async function getAudioDuration(filePath: string): Promise<number> {
  try {
    // Try to use ffprobe if available in the system
    try {
      const { stdout } = await execPromise(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`
      );
      return parseFloat(stdout.trim());
    } catch {
      console.log('ffprobe not available, using fallback method');
      
      // Fallback: Read file stats to estimate duration roughly (for MP3 files)
      // Not accurate but better than nothing when ffprobe isn't available
      const stats = await fs.stat(filePath);
      // Rough estimate based on average bitrate of 128kbps
      const estimatedDuration = stats.size / (128 * 1024 / 8);
      return estimatedDuration;
    }
  } catch (error) {
    console.error('Error getting audio duration:', error);
    return 0;
  }
}

/**
 * Generate DaVinci Resolve XML for a project
 */
export async function POST(request: Request) {
  try {
    // Get the folder ID from the request
    const { folderId, chunkedScript } = await request.json();
    
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }
    
    // Check if the folder exists
    const publicDir = path.join(process.cwd(), 'public', folderId);
    try {
      await fs.access(publicDir);
    } catch {
      return NextResponse.json({ error: 'Invalid or inaccessible folder' }, { status: 400 });
    }
    
    // Find audio file for duration estimation
    const files = await fs.readdir(publicDir);
    const audioFiles = files.filter(file => file.endsWith('.mp3'));
    
    // Get audio duration from the MP3 file if available
    let audioDuration = 0;
    if (audioFiles.length > 0) {
      try {
        const audioFilePath = path.join(publicDir, audioFiles[0]);
        // Get audio duration using our custom function
        audioDuration = await getAudioDuration(audioFilePath);
        console.log(`Detected audio duration: ${audioDuration} seconds`);
      } catch (error) {
        console.error('Error getting audio duration:', error);
        // Fallback to a reasonable default if unable to get duration
        audioDuration = 0;
        console.log(`Using fallback audio duration: ${audioDuration} seconds`);
      }
    } else {
      console.log('No audio file found, using duration of 0 seconds');
    }
    
    // Output path for the XML file
    const outputPath = `public/${folderId}/fcpx-export.fcpxml`;
    
    // Image duration in seconds (fallback if no chunked script)
    const defaultImageDuration = 5;
    
    console.log(`Generating XML for folder: ${folderId}`);
    console.log(`Audio files found: ${audioFiles.length > 0 ? audioFiles[0] : 'None'}`);
    
    // Save chunked script to a file AND pass it directly through environment variable
    let scriptEnvVar = '';
    if (chunkedScript) {
      try {
        console.log('Received chunked script from client:');
        console.log(chunkedScript.substring(0, 200) + '...');
        
        // Make sure the public directory exists
        await fs.mkdir(publicDir, { recursive: true });
        
        // Write the chunked script to a file as backup
        const chunkedScriptPath = path.join(publicDir, 'chunked-script.md');
        await fs.writeFile(chunkedScriptPath, chunkedScript, 'utf8');
        console.log(`Saved chunked script to ${chunkedScriptPath}`);
        
        // Prepare script content for environment variable
        scriptEnvVar = chunkedScript.replace(/"/g, '\\"').replace(/\n/g, '\\n');
      } catch (error) {
        console.error('Error processing chunked script:', error);
      }
    } else {
      console.log('No chunked script provided.');
    }
    
    // Run the generate-xml.mjs script with the folder ID and chunked script
    // Pass actual audio duration now for comparison
    try {
      const command = `node generate-xml.mjs ${folderId} ${defaultImageDuration} ${audioDuration} "${outputPath}"`;
      
      // Execute with environment variable containing script content
      const options = {
        env: {
          ...process.env,
          CHUNKED_SCRIPT: scriptEnvVar || ''
        }
      };
      
      console.log('Executing command with env variable CHUNKED_SCRIPT');
      const { stdout, stderr } = await execPromise(command, options);
      
      if (stderr) {
        console.error('Error from XML generator:', stderr);
      }
      
      console.log('XML generation output:', stdout);
      
      // Check if the XML file was created
      await fs.access(path.join(process.cwd(), outputPath));
      
      return NextResponse.json({
        success: true,
        xmlUrl: `/${folderId}/fcpx-export.fcpxml`,
        message: 'DaVinci Resolve XML generated successfully'
      });
    } catch (execError) {
      console.error('Error executing XML generator:', execError);
      return NextResponse.json({ error: 'Failed to generate XML file' }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('Error in generate-davinci-xml endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
} 