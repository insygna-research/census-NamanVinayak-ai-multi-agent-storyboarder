/**
 * Utility functions for generating DaVinci Resolve compatible XML files
 */

import fs from 'fs';
import path from 'path';

interface ImageAsset {
  id: string;
  path: string;
  duration: number;
}

interface AudioAsset {
  id: string;
  path: string;
  duration: number;
  start: string;
  audioSources: number;
  audioChannels: number;
  audioRate: number;
}

/**
 * Finds the most recently generated audio file in the public directory
 * @param audioDir Directory containing the audio files
 * @returns Path to the latest audio file
 */
async function findLatestAudioFile(audioDir: string = 'public'): Promise<string> {
  try {
    const projectRoot = process.cwd();
    const absoluteAudioDir = path.join(projectRoot, audioDir);
    
    // Read all files in the directory
    const files = await fs.promises.readdir(absoluteAudioDir);
    
    // Filter for audio files and sort by modification time
    const audioFiles = files
      .filter(file => file.startsWith('generated-audio-') && file.endsWith('.mp3'))
      .map(file => ({
        name: file,
        path: path.join(absoluteAudioDir, file),
        time: fs.statSync(path.join(absoluteAudioDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time); // Sort by newest first
    
    if (audioFiles.length === 0) {
      throw new Error('No generated audio files found');
    }
    
    return audioFiles[0].path;
  } catch (error) {
    console.error('Error finding latest audio file:', error);
    throw error;
  }
}

/**
 * Generates a DaVinci Resolve compatible XML string
 * @param images Array of image assets with paths and durations
 * @param audio Audio asset information
 * @param outputPath Path where the XML file should be saved
 * @returns Promise that resolves when the XML file is saved
 */
export async function generateDaVinciResolveXML(
  images: ImageAsset[],
  audio: AudioAsset,
  outputPath: string = 'public/davinci-resolve-export/timeline.fcpxml'
): Promise<string> {
  // XML header and format definition
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <!-- Format definition -->
    <format id="r1" name="FFVideoFormat1080p30" width="1920" height="1080" frameDuration="1/30s"/>
    
    <!-- Audio asset -->
    <asset id="${audio.id}" 
           start="${audio.start}" 
           duration="${audio.duration}s" 
           hasAudio="1" 
           format="r1" 
           audioSources="${audio.audioSources}" 
           audioChannels="${audio.audioChannels}" 
           audioRate="${audio.audioRate}"
           name="timeline-audio">
      <media-rep kind="original-media" src="file://${audio.path}"/>
    </asset>
    
    <!-- Image assets -->
`;

  // Add image assets to resources
  images.forEach((image) => {
    xml += `    <asset id="${image.id}" hasVideo="1" format="r1" name="${path.basename(image.path, '.png')}">
      <media-rep kind="original-media" src="file://${image.path}"/>
    </asset>\n`;
  });

  // Close resources and start project
  xml += `  </resources>
  
  <library>
    <event name="DDP_APPLE_FORMAT">
      <project name="DDP_AUDIO_PROJECT">
        <sequence format="r1" tcStart="0s" tcFormat="NDF" duration="${audio.duration}s">
          <spine>
`;

  // Add video clips (images) with proper timing
  let currentTime = 0;
  images.forEach((image) => {
    xml += `            <asset-clip ref="${image.id}" offset="0s" duration="${image.duration}s" name="Still ${currentTime / image.duration + 1}"/>\n`;
    currentTime += image.duration;
  });

  // Add audio clip
  xml += `            <asset-clip ref="${audio.id}" 
                       offset="0s" 
                       start="0s" 
                       duration="${audio.duration}s" 
                       name="Timeline Audio" 
                       lane="-1" 
                       audioRole="dialogue"/>\n`;

  // Close XML structure
  xml += `          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>`;

  // Ensure the directory exists
  const dir = path.dirname(outputPath);
  await fs.promises.mkdir(dir, { recursive: true });

  // Write the XML to a file
  await fs.promises.writeFile(outputPath, xml);

  return outputPath;
}

/**
 * Creates an XML file from images in a directory
 * @param imageDir Directory containing the images to include in the timeline
 * @param outputPath Path where the XML file should be saved
 * @param imageDuration Duration in seconds for each image in the timeline
 * @returns Promise that resolves when the XML file is saved
 */
export async function createXMLFromImageDirectory(
  imageDir: string = 'public/generated-images',
  outputPath: string = 'public/davinci-resolve-export/timeline.fcpxml',
  imageDuration: number = 5
): Promise<string> {
  try {
    // Get the absolute path to the project root
    const projectRoot = process.cwd();
    const absoluteImageDir = path.join(projectRoot, imageDir);
    
    // Find the latest audio file
    const latestAudioPath = await findLatestAudioFile();
    
    // Read all files in the directory
    const files = await fs.promises.readdir(absoluteImageDir);
    
    // Explicitly looking for the 30 prompt images in correct order
    const specificImages = Array.from({length: 30}, (_, i) => `prompt-${i+1}.png`);
    let foundImages = specificImages.filter(img => files.includes(img));
    
    // If we don't have all specific images, fall back to sorting all image files
    if (foundImages.length < 30) {
      foundImages = files
        .filter(file => /\.(jpg|jpeg|png|gif|bmp)$/i.test(file))
        .sort((a, b) => {
          // Extract numbers from filenames for natural sorting
          const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
          const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
          return numA - numB;
        });
    }
    
    // Create image assets from the files
    const imageAssets: ImageAsset[] = foundImages.map((file, index) => {
      const absolutePath = path.join(absoluteImageDir, file);
      return {
        id: `r${index + 1}_src`,
        path: absolutePath,
        duration: imageDuration
      };
    });

    // Create audio asset
    const audioAsset: AudioAsset = {
      id: 'r_audio',
      path: latestAudioPath,
      duration: imageAssets.length * imageDuration, // Total duration based on images
      start: '0s',
      audioSources: 1,
      audioChannels: 2,
      audioRate: 48000
    };
    
    // Generate the XML file
    return generateDaVinciResolveXML(imageAssets, audioAsset, path.join(projectRoot, outputPath));
  } catch (error) {
    console.error('Error creating XML from image directory:', error);
    throw error;
  }
}

/**
 * Get the full path to the created XML file
 * @param xmlPath Relative path to the XML file
 * @returns Absolute path to the XML file
 */
export function getXMLFilePath(xmlPath: string = 'public/davinci-resolve-export/timeline.fcpxml'): string {
  return path.join(process.cwd(), xmlPath);
} 