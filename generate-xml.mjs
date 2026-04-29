// Script to generate a Final Cut Pro XML file (FCPXML v1.9)
import fs from 'fs';
import path from 'path';

// Get the absolute path to the project root
const projectRoot = process.cwd();

/**
 * @typedef {Object} ImageAsset
 * @property {string} id - Unique identifier for the asset
 * @property {string} path - Absolute path to the image file
 * @property {number} duration - Duration in seconds for each image in the timeline
 */

/**
 * Parses a markdown table string and extracts durations for each line
 * @param {string} markdownTable - Markdown table string with line numbers, prompts, and durations
 * @returns {Array<{lineNumber: number, prompt: string, duration: number}>} - Array of parsed data
 */
function parseMarkdownTable(markdownTable) {
  if (!markdownTable || typeof markdownTable !== 'string') {
    console.warn('Invalid markdown table provided, returning empty array.');
    return [];
  }

  console.log('Processing markdown table...');
  console.log(`Raw table input (first 100 chars): ${markdownTable.substring(0, 100)}...`);
  
  try {
    // Split the table into lines
    const lines = markdownTable.trim().split('\n');
    console.log(`Found ${lines.length} lines in the markdown table.`);
    
    if (lines.length < 3) {
      console.warn('Markdown table has fewer than 3 lines (header, separator, data), may be invalid.');
      return [];
    }
    
    // Debug: Print all lines for debugging
    lines.forEach((line, i) => {
      console.log(`Line ${i}: ${line}`);
    });
    
    // Filter out header and separator rows (usually first two rows in a markdown table)
    const dataRows = lines.slice(2).filter(line => line.trim() !== '');
    console.log(`Found ${dataRows.length} data rows after filtering header and separator.`);
    
    // Parse each row into components
    const parsedData = dataRows.map((row, index) => {
      // Split by pipe character, trim, and filter empty cells
      const cells = row.split('|')
        .map(cell => cell.trim())
        .filter(cell => cell !== '');
      
      console.log(`Row ${index + 1} cells (${cells.length}): ${JSON.stringify(cells)}`);
      
      if (cells.length >= 3) {
        // Extract the duration specifically
        // Look for a number at the end of the last cell
        const durationText = cells[cells.length - 1];
        console.log(`Duration text: "${durationText}"`);
        
        // Try to extract just the number from the duration field
        const durationMatch = durationText.match(/(\d+)/);
        const duration = durationMatch ? parseInt(durationMatch[1], 10) : 5;
        
        console.log(`Extracted duration for row ${index + 1}: ${duration}s`);
        
        return {
          lineNumber: parseInt(cells[0], 10) || (index + 1),
          prompt: cells[1],
          duration: duration
        };
      }
      
      console.warn(`Row ${index + 1} does not have enough cells, using default values.`);
      // Return default values if the row doesn't have enough cells
      return { lineNumber: index + 1, prompt: 'Default prompt', duration: 5 };
    });
    
    console.log(`Successfully parsed ${parsedData.length} rows with durations.`);
    // Log the durations for debugging
    parsedData.forEach(row => {
      console.log(`Line ${row.lineNumber}: Duration = ${row.duration}s`);
    });
    
    return parsedData;
  } catch (error) {
    console.error('Error parsing markdown table:', error);
    return [];
  }
}

/**
 * Generates an Apple FCPXML (v1.9) string matching your "perfect" example
 * @param {ImageAsset[]} images - Array of image assets with absolute paths and durations
 * @param {string} outputPath - Where the XML file should be saved
 * @param {string} [audioFilePath] - Optional absolute path to the audio file (e.g., MP3)
 * @param {number} [audioDuration=0] - Actual audio duration from the audio file
 * @returns {Promise<string>} - Resolves to the outputPath when the file is written
 */
async function generateAppleFCPXML(
  images,
  outputPath = 'public/fcpx-exports/apple.fcpxml',
  audioFilePath = '',
  audioDuration = 0
) {
  if (images.length === 0) {
    console.warn('No images provided for XML generation');
    return outputPath;
  }
  
  // 1) Calculate total timeline duration based on sum of image durations
  const totalImagesDuration = images.reduce((sum, img) => sum + img.duration, 0);
  
  // Initialize with default values (using image durations)
  let audioClipDuration = totalImagesDuration;
  let totalTimelineDuration = totalImagesDuration;
  
  // Handle edge case: if audio is longer than images, adjust the last image duration
  if (audioFilePath && audioDuration > 0 && audioDuration > totalImagesDuration) {
    console.log(`Audio duration (${audioDuration}s) is longer than total image duration (${totalImagesDuration}s)`);
    
    // Round up the audio duration to the next whole second
    const roundedAudioDuration = Math.ceil(audioDuration);
    console.log(`Rounded audio duration: ${roundedAudioDuration}s`);
    
    // Calculate extra time needed
    const extraTime = roundedAudioDuration - totalImagesDuration;
    console.log(`Adding ${extraTime}s to last image to prevent audio cut-off`);
    
    // Update the last image's duration
    const lastImageIndex = images.length - 1;
    const originalLastImageDuration = images[lastImageIndex].duration;
    images[lastImageIndex].duration += extraTime;
    
    console.log(`Last image duration changed from ${originalLastImageDuration}s to ${images[lastImageIndex].duration}s`);
    
    // Recalculate total duration with adjusted last image
    const newTotalDuration = images.reduce((sum, img) => sum + img.duration, 0);
    
    // Use rounded audio duration for audio clip and timeline
    audioClipDuration = roundedAudioDuration;
    totalTimelineDuration = newTotalDuration;
    
    console.log(`New total timeline duration: ${totalTimelineDuration}s`);
  } else if (audioFilePath && audioDuration > 0) {
    console.log(`Audio duration (${audioDuration}s) is shorter than or equal to image duration (${totalImagesDuration}s)`);
    console.log(`Using image-based duration: ${totalImagesDuration}s`);
  }

  // 2) Start building the XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <!-- Format definition -->
    <format id="r1" name="FFVideoFormat1080p30" width="1920" height="1080" frameDuration="1/30s"/>
`;

  // 3) If an audio file is provided, define it here
  if (audioFilePath) {
    xml += `    
    <!-- Audio asset with proper attributes and media-rep -->
    <asset id="r_audio"
           start="0s"
           duration="${audioClipDuration}s"
           hasAudio="1"
           format="r1"
           audioSources="1"
           audioChannels="2"
           audioRate="48000"
           name="timeline-audio">
      <media-rep kind="original-media" src="file://${audioFilePath}"/>
    </asset>
`;
  }

  // 4) Add image assets
  images.forEach((image, index) => {
    const assetId = `r${index + 1}_src`;
    const promptName = path.basename(image.path, path.extname(image.path));
    xml += `    
    <!-- Image asset -->
    <asset id="${assetId}" hasVideo="1" format="r1" name="${promptName}">
      <media-rep kind="original-media" src="file://${image.path}"/>
    </asset>
`;
  });

  // Close <resources>, start <library>
  xml += `  </resources>
  
  <library>
    <event name="DDP_APPLE_FORMAT">
      <project name="DDP_AUDIO_PROJECT">
        <sequence format="r1" tcStart="0s" tcFormat="NDF" duration="${totalTimelineDuration}s">
          <spine>
`;

  // 5) Create the <asset-clip> elements for each image in the spine
  let currentOffset = 0;
  images.forEach((image, index) => {
    const assetId = `r${index + 1}_src`;
    const baseName = path.basename(image.path, path.extname(image.path));
    xml += `            <asset-clip ref="${assetId}" offset="${currentOffset}s" duration="${image.duration}s" name="${baseName}"/>
`;
    currentOffset += image.duration;
  });

  // 6) Add the audio clip in the spine (if we have audio)
  if (audioFilePath) {
    xml += `            
            <!-- Audio clip -->
            <asset-clip ref="r_audio"
                        offset="0s"
                        start="0s"
                        duration="${audioClipDuration}s"
                        name="Timeline Audio"
                        lane="-1"
                        audioRole="dialogue"/>
`;
  }

  // Close spine and sequence
  xml += `          </spine>
        </sequence>
      </project>
`;

  // 7) Additional audio clip definition at the event level (optional)
  if (audioFilePath) {
    xml += `
      <!-- Additional audio clip definition at event level -->
      <asset-clip name="Timeline Audio"
                  ref="r_audio"
                  format="r1"
                  start="0s"
                  duration="${audioClipDuration}s"
                  audioRole="dialogue"/>
`;
  }

  // Close the event, library, fcpxml
  xml += `    </event>
  </library>
</fcpxml>`;

  // Ensure the output directory exists
  const dir = path.dirname(outputPath);
  await fs.promises.mkdir(dir, { recursive: true });

  // Write the XML to a file
  await fs.promises.writeFile(outputPath, xml);

  return outputPath;
}

/**
 * Extracts the numeric portion of a filename like `prompt-1.png` → 1,
 * `prompt-30.png` → 30, etc. Defaults to 0 if no number is found.
 */
function extractNumericFromFilename(filename) {
  // Match any digits between a dash and dot
  const match = filename.match(/-(\d+)\./);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return 0;
}

/**
 * Creates an FCPXML file from images in a directory, matching the "perfect" example structure.
 * Uses durations from a chunkedScript markdown table if provided.
 * Sorts the images in ascending numeric order by filename (prompt-1, prompt-2, prompt-3, ...).
 * 
 * @param {string} folderId - The folder ID containing the images and audio
 * @param {string} outputPath - Where the XML file should be saved
 * @param {number} defaultImageDuration - Default duration in seconds for each image (if no chunkedScript)
 * @param {string} [audioFileName] - Optional name of the audio file in the folder
 * @param {number} [audioDuration=0] - Duration of the audio in seconds
 * @param {string} [chunkedScript=''] - Markdown table with line numbers, prompts, and durations
 * @returns {Promise<string>}
 */
async function createXMLFromImageDirectory(
  folderId,
  outputPath = null,
  defaultImageDuration = 5,
  audioFileName = '',
  audioDuration = 0,
  chunkedScript = ''
) {
  try {
    // Set default paths based on folderId if not provided
    const imageDir = `public/${folderId}`;
    if (!outputPath) {
      outputPath = `public/${folderId}/fcpx-export.fcpxml`;
    }
    
    const absoluteImageDir = path.join(projectRoot, imageDir);

    // Read all files in the directory
    const files = await fs.promises.readdir(absoluteImageDir);

    // Filter for image files - support both PNG and JPG formats
    const imageFiles = files.filter((file) => /\.(jpg|jpeg|png|gif|bmp)$/i.test(file));

    // Sort them by the numeric portion of the filename
    imageFiles.sort((a, b) => {
      const aNum = extractNumericFromFilename(a);
      const bNum = extractNumericFromFilename(b);
      return aNum - bNum;
    });

    // Print image formats for debugging
    imageFiles.forEach(file => {
      console.log(`Found image file: ${file}, extension: ${path.extname(file).toLowerCase()}`);
    });

    // Check if we have both jpg and png files in the same folder
    const hasJpgFiles = imageFiles.some(file => ['.jpg', '.jpeg'].includes(path.extname(file).toLowerCase()));
    const hasPngFiles = imageFiles.some(file => path.extname(file).toLowerCase() === '.png');
    
    if (hasJpgFiles && hasPngFiles) {
      console.log('Warning: Mixed file types detected (both JPG and PNG). This may cause issues in DaVinci Resolve.');
    }

    // Parse durations from chunked script if provided
    let durations = [];
    if (chunkedScript) {
      const parsedTable = parseMarkdownTable(chunkedScript);
      durations = parsedTable.map(row => row.duration);
      console.log(`Parsed ${durations.length} durations from chunked script: ${JSON.stringify(durations)}`);
    }

    // Create full file paths and image assets
    const imageAssets = imageFiles.map((file, index) => {
      // Get duration from parsed table or use default
      const duration = (index < durations.length) ? durations[index] : defaultImageDuration;
      
      console.log(`Image ${index + 1} (${file}): Assigned duration = ${duration}s`);
      
      return {
        id: `r${index + 1}_src`,
        path: path.join(absoluteImageDir, file),
        duration: duration,
      };
    });

    console.log(`Found ${imageAssets.length} image files in ${imageDir}`);
    console.log(`Sorted them by numeric filename order.`);
    
    if (durations.length) {
      console.log(`Using custom durations from chunked script: ${JSON.stringify(durations)}`);
    } else {
      console.log(`Using default duration of ${defaultImageDuration}s for all images.`);
    }

    // Determine audio file path if audio file name is provided
    let audioFilePath = '';
    if (audioFileName) {
      audioFilePath = path.join(projectRoot, imageDir, audioFileName);
      console.log(`Using audio file: ${audioFilePath}`);
    } else {
      // Try to find any MP3 file in the directory
      const audioFiles = files.filter(file => file.endsWith('.mp3'));
      if (audioFiles.length > 0) {
        audioFilePath = path.join(projectRoot, imageDir, audioFiles[0]);
        console.log(`Found audio file: ${audioFilePath}`);
      }
    }

    // Generate the FCPXML file
    return generateAppleFCPXML(
      imageAssets,
      path.join(projectRoot, outputPath),
      audioFilePath,
      audioDuration
    );
  } catch (error) {
    console.error('Error creating XML from image directory:', error);
    throw error;
  }
}

// Command line processing
const args = process.argv.slice(2);

if (args.length >= 1) {
  // First argument should be the folder ID
  const folderId = args[0];
  
  // Second argument (optional) is default image duration in seconds (used if no chunked script)
  const defaultImageDuration = args.length >= 2 ? parseFloat(args[1]) : 5;
  
  // Third argument (optional) is audio duration in seconds
  const audioDuration = args.length >= 3 ? parseFloat(args[2]) : 0;
  
  // Output path (optional)
  const outputPath = args.length >= 4 ? args[3] : `public/${folderId}/fcpx-export.fcpxml`;
  
  // Fifth argument (optional) is chunked script file path
  const chunkedScriptPath = args.length >= 5 ? args[4] : `public/${folderId}/chunked-script.md`;
  
  console.log('-------- XML Generation Started --------');
  console.log(`Folder ID: ${folderId}`);
  console.log(`Default Image Duration: ${defaultImageDuration}s`);
  console.log(`Audio Duration: ${audioDuration}s`);
  console.log(`Output Path: ${outputPath}`);
  
  // Try to get chunked script from environment variable first, then try file
  let chunkedScript = '';
  
  // Check for environment variable
  if (process.env.CHUNKED_SCRIPT) {
    chunkedScript = process.env.CHUNKED_SCRIPT;
    console.log('Found chunked script in environment variable');
    console.log(`Chunked script length: ${chunkedScript.length} bytes`);
    console.log(`Chunked script sample: ${chunkedScript.substring(0, 100)}...`);
  } 
  // If not in environment, try reading from file
  else {
    console.log(`Looking for chunked script file at: ${chunkedScriptPath}`);
    try {
      if (fs.existsSync(chunkedScriptPath)) {
        chunkedScript = fs.readFileSync(chunkedScriptPath, 'utf8');
        console.log(`Read chunked script from file: ${chunkedScriptPath}`);
        console.log(`Chunked script length: ${chunkedScript.length} bytes`);
        console.log(`Chunked script sample: ${chunkedScript.substring(0, 100)}...`);
      } else {
        console.log(`WARNING: Chunked script file not found at: ${chunkedScriptPath}`);
        console.log(`Using default duration: ${defaultImageDuration}s for all images`);
      }
    } catch (error) {
      console.warn(`Error reading chunked script file: ${error.message}`);
      console.log(`Using default image duration: ${defaultImageDuration}s`);
    }
  }
  
  createXMLFromImageDirectory(folderId, outputPath, defaultImageDuration, '', audioDuration, chunkedScript)
    .then((xmlPath) => {
      console.log(`XML file generated successfully at: ${xmlPath}`);
      console.log('-------- XML Generation Completed --------');
    })
    .catch((error) => {
      console.error('Failed to generate XML file:', error);
      console.log('-------- XML Generation Failed --------');
      process.exit(1);
    });
} else {
  console.error('Usage: node generate-xml.mjs <folderId> [defaultImageDuration] [audioDuration] [outputPath] [chunkedScriptPath]');
  process.exit(1);
}
