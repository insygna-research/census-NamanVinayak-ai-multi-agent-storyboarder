/**
 * Utility functions for generating DaVinci Resolve compatible XML files
 */

interface Segment {
  text: string;
  startTime: number;
  endTime: number;
}

interface ImageAsset {
  text: string;
  imageUrl: string;
}

/**
 * Generates a DaVinci Resolve compatible XML string
 * @param audioUrl URL of the complete audio file
 * @param segments Array of audio segments with timing information
 * @param images Array of image assets paired with segments
 * @returns XML string that can be imported into DaVinci Resolve
 */
export function generateDaVinciResolveXML(
  audioUrl: string,
  segments: Segment[],
  images: ImageAsset[]
): string {
  // Create a mapping between segment text and corresponding image
  const imageMap = new Map<string, string>();
  images.forEach(img => {
    imageMap.set(img.text, img.imageUrl);
  });
  
  // XML header and project settings
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.9">
  <resources>
    <format id="r1" name="FFVideoFormat1080p30" frameDuration="100/3000s" width="1920" height="1080"/>
    <asset id="r2" name="main_audio" src="${audioUrl}" duration="${segments[segments.length - 1].endTime}s"/>
`;

  // Add image assets to resources
  segments.forEach((segment, index) => {
    const imageUrl = imageMap.get(segment.text) || '';
    xml += `    <asset id="img${index + 1}" name="image_${index + 1}" src="${imageUrl}" duration="5s"/>\n`;
  });

  // Close resources and start project
  xml += `  </resources>
  <project name="Script-to-Video Project">
    <sequence format="r1" duration="${segments[segments.length - 1].endTime}s">
      <spine>
        <!-- Audio track -->
        <asset-clip name="Main Audio" offset="0s" ref="r2" duration="${segments[segments.length - 1].endTime}s">
          <audio lane="1"/>
        </asset-clip>
`;

  // Add video clips (images) with proper timing
  segments.forEach((segment, index) => {
    const duration = segment.endTime - segment.startTime;
    xml += `        <!-- Segment: ${segment.text} -->
        <asset-clip name="Segment ${index + 1}" offset="${segment.startTime}s" ref="img${index + 1}" duration="${duration}s">
          <video lane="1"/>
        </asset-clip>
`;
  });

  // Close XML structure
  xml += `      </spine>
    </sequence>
  </project>
</fcpxml>`;

  return xml;
}

/**
 * Creates a downloadable blob from XML string
 * @param xmlString XML content as string
 * @returns Blob URL that can be used for downloading
 */
export function createDownloadableXML(xmlString: string): string {
  const blob = new Blob([xmlString], { type: 'application/xml' });
  return URL.createObjectURL(blob);
} 