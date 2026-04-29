"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../page.module.css";

// Define types for our data
interface Segment {
  lineNumber: number;
  prompt: string;
}

interface ImageAsset {
  index: number;
  prompt: string;
  imageUrl: string;
  success: boolean;
}

interface StepStatus<T> {
  loading: boolean;
  completed: boolean;
  error: string | null;
  output: T | null;
}

interface ChunkOutput {
  raw: string;
  segments: Segment[];
}

export default function WorkflowTest() {
  const [script, setScript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [downloadReady, setDownloadReady] = useState(false);
  
  // Step statuses
  const [formatStatus, setFormatStatus] = useState<StepStatus<string>>({ 
    loading: false, 
    completed: false, 
    error: null, 
    output: null 
  });
  const [audioStatus, setAudioStatus] = useState<StepStatus<string>>({ 
    loading: false, 
    completed: false, 
    error: null, 
    output: null 
  });
  const [chunkStatus, setChunkStatus] = useState<StepStatus<ChunkOutput>>({ 
    loading: false, 
    completed: false, 
    error: null, 
    output: null 
  });
  const [imageStatus, setImageStatus] = useState<StepStatus<ImageAsset[]>>({ 
    loading: false, 
    completed: false, 
    error: null, 
    output: [] 
  });
  const [xmlStatus, setXmlStatus] = useState<StepStatus<string>>({ 
    loading: false, 
    completed: false, 
    error: null, 
    output: null 
  });

  // Parse the chunked script into segments
  const parseChunkedScript = (chunkedScript: string): Segment[] => {
    try {
      // Split by lines and filter out the header row and empty lines
      const lines = chunkedScript.split('\n')
        .filter(line => line.trim() && !line.includes('Line Number') && !line.includes('---'));
      
      const segments: Segment[] = [];
      
      for (const line of lines) {
        // Extract line number and prompt from markdown table format
        const match = line.match(/\|\s*(\d+)\s*\|\s*(.*?)\s*\|/);
        if (match && match.length >= 3) {
          segments.push({
            lineNumber: parseInt(match[1], 10),
            prompt: match[2].trim()
          });
        }
      }
      
      return segments;
    } catch (error) {
      console.error('Error parsing chunked script:', error);
      return [];
    }
  };

  // Step 1: Format script for TTS
  const formatScript = async () => {
    setFormatStatus({ ...formatStatus, loading: true, error: null });
    
    try {
      const response = await fetch('/api/format-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to format script');
      }
      
      const data = await response.json();
      setFormatStatus({ 
        loading: false, 
        completed: true, 
        error: null, 
        output: data.formattedScript 
      });
      
      return data.formattedScript;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      console.error("Error formatting script:", errorMessage);
      setFormatStatus({ 
        loading: false, 
        completed: false, 
        error: errorMessage, 
        output: null 
      });
      throw error;
    }
  };

  // Step 2: Convert text to speech (non-blocking)
  const convertToSpeech = async (formattedScript: string) => {
    setAudioStatus({ ...audioStatus, loading: true, error: null });
    
    try {
      const response = await fetch('/api/test-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script: formattedScript }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to convert to speech');
      }
      
      const data = await response.json();
      setAudioStatus({ 
        loading: false, 
        completed: true, 
        error: null, 
        output: data.audioUrl 
      });
      
      return data.audioUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      console.error("Error converting to speech:", errorMessage);
      setAudioStatus({ 
        loading: false, 
        completed: false, 
        error: errorMessage, 
        output: null 
      });
      throw error;
    }
  };

  // Step 3: Chunk script
  const chunkScript = async (formattedScript: string) => {
    setChunkStatus({ ...chunkStatus, loading: true, error: null });
    
    try {
      // Create a temporary folder ID if needed
      const tempFolderId = "workflow-test-" + Date.now();
      
      const response = await fetch('/api/chunk-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          script: formattedScript,
          folderId: tempFolderId 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to chunk script');
      }
      
      const data = await response.json();
      const segments = parseChunkedScript(data.chunkedScript);
      
      setChunkStatus({ 
        loading: false, 
        completed: true, 
        error: null, 
        output: {
          raw: data.chunkedScript,
          segments: segments
        }
      });
      
      return segments;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      console.error("Error chunking script:", errorMessage);
      setChunkStatus({ 
        loading: false, 
        completed: false, 
        error: errorMessage, 
        output: null 
      });
      throw error;
    }
  };

  // Step 4: Generate images for each segment
  const generateImages = async (segments: Segment[]) => {
    setImageStatus({ ...imageStatus, loading: true, error: null });
    
    try {
      // Extract prompts from segments
      const prompts = segments.map(segment => segment.prompt);
      
      const response = await fetch('/api/generate-multiple-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompts }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate images');
      }
      
      const data = await response.json();
      
      // Map the results to image assets
      const images: ImageAsset[] = data.results
        .map((result: {
          index: number; 
          prompt: string; 
          imageUrl: string;
          success: boolean;
        }) => ({
          index: result.index,
          prompt: result.prompt,
          imageUrl: result.imageUrl || '',
          success: result.success
        }));
      
      setImageStatus({ 
        loading: false, 
        completed: true, 
        error: null, 
        output: images 
      });
      
      return images;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      console.error("Error generating images:", errorMessage);
      setImageStatus({ 
        loading: false, 
        completed: false, 
        error: errorMessage, 
        output: [] 
      });
      throw error;
    }
  };

  // Step 5: Create DaVinci Resolve XML
  const createXML = async () => {
    setXmlStatus({ ...xmlStatus, loading: true, error: null });
    
    try {
      const response = await fetch('/api/generate-davinci-xml');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create XML');
      }
      
      const data = await response.json();
      setXmlStatus({ 
        loading: false, 
        completed: true, 
        error: null, 
        output: data.downloadUrl 
      });
      
      return data.downloadUrl;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      console.error("Error creating XML:", errorMessage);
      setXmlStatus({ 
        loading: false, 
        completed: false, 
        error: errorMessage, 
        output: null 
      });
      throw error;
    }
  };

  // Main process handler
  const handleProcess = async () => {
    if (!script.trim()) return;
    
    setProcessing(true);
    setDownloadReady(false);
    
    // Reset all statuses
    setFormatStatus({ loading: false, completed: false, error: null, output: null });
    setAudioStatus({ loading: false, completed: false, error: null, output: null });
    setChunkStatus({ loading: false, completed: false, error: null, output: null });
    setImageStatus({ loading: false, completed: false, error: null, output: [] });
    setXmlStatus({ loading: false, completed: false, error: null, output: null });
    
    try {
      console.log("Step 1: Format script for TTS");
      // Step 1: Format script for TTS
      const formattedScript = await formatScript();
      
      if (!formattedScript) {
        throw new Error("Failed to format script - no output received");
      }
      
      console.log("Step 2: Convert to speech (non-blocking)");
      // Step 2: Start audio conversion (non-blocking)
      const audioPromise = convertToSpeech(formattedScript);
      
      console.log("Step 3: Chunk script");
      // Step 3: Chunk script (proceed without waiting for audio)
      const segments = await chunkScript(formattedScript);
      
      if (!segments || segments.length === 0) {
        throw new Error("Failed to chunk script - no segments received");
      }
      
      console.log("Step 4: Generate images");
      // Step 4: Generate images
      const images = await generateImages(segments);
      
      console.log("Waiting for audio to complete");
      // Wait for audio to complete
      const audioUrl = await audioPromise;
      
      if (!audioUrl) {
        throw new Error("Failed to generate audio");
      }
      
      if (!images || images.filter(img => img.success).length === 0) {
        throw new Error("Failed to generate images");
      }
      
      console.log("Step 5: Create XML");
      // Step 5: Create XML when both audio and images are ready
      await createXML();
      
      setDownloadReady(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      console.error("Error in workflow process:", errorMessage);
      // The specific step's error is already set in its own error handler
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!xmlStatus.output) return;
    
    // Create a link to download the XML
    const a = document.createElement('a');
    a.href = xmlStatus.output;
    a.download = 'davinci_resolve_timeline.fcpxml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <h2 className={styles.navTitle}>Workflow Test Page</h2>
        <Link href="/" className={styles.navButton}>
          Back to Home
        </Link>
      </nav>

      <h1 className={styles.title}>Workflow Test</h1>
      
      <main className={styles.container}>
        <div className={styles.scriptInput}>
          <label htmlFor="script">Enter your script:</label>
          <textarea 
            id="script"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            placeholder="Paste your full script here..."
            disabled={processing}
            rows={10}
            style={{ color: 'black' }}
          />
        </div>

        <div className={styles.workflow}>
          <h3>Workflow:</h3>
          <ol>
            <li className={formatStatus.loading ? styles.processing : (formatStatus.completed ? styles.completed : (formatStatus.error ? styles.error : ''))}>
              Format script for TTS
              {formatStatus.loading && <div className={styles.loadingBar}><div className={styles.loadingProgress}></div></div>}
              {formatStatus.error && <div className={styles.errorMessage}>{formatStatus.error}</div>}
            </li>
            <li className={audioStatus.loading ? styles.processing : (audioStatus.completed ? styles.completed : (audioStatus.error ? styles.error : ''))}>
              Convert text to speech
              {audioStatus.loading && <div className={styles.loadingBar}><div className={styles.loadingProgress}></div></div>}
              {audioStatus.error && <div className={styles.errorMessage}>{audioStatus.error}</div>}
            </li>
            <li className={chunkStatus.loading ? styles.processing : (chunkStatus.completed ? styles.completed : (chunkStatus.error ? styles.error : ''))}>
              Chunk script
              {chunkStatus.loading && <div className={styles.loadingBar}><div className={styles.loadingProgress}></div></div>}
              {chunkStatus.error && <div className={styles.errorMessage}>{chunkStatus.error}</div>}
            </li>
            <li className={imageStatus.loading ? styles.processing : (imageStatus.completed ? styles.completed : (imageStatus.error ? styles.error : ''))}>
              Generate images for each segment
              {imageStatus.loading && <div className={styles.loadingBar}><div className={styles.loadingProgress}></div></div>}
              {imageStatus.error && <div className={styles.errorMessage}>{imageStatus.error}</div>}
            </li>
            <li className={xmlStatus.loading ? styles.processing : (xmlStatus.completed ? styles.completed : (xmlStatus.error ? styles.error : ''))}>
              Create DaVinci Resolve XML
              {xmlStatus.loading && <div className={styles.loadingBar}><div className={styles.loadingProgress}></div></div>}
              {xmlStatus.error && <div className={styles.errorMessage}>{xmlStatus.error}</div>}
            </li>
          </ol>
        </div>

        <div className={styles.buttons}>
          <button 
            className={styles.processBtn}
            onClick={handleProcess}
            disabled={processing || !script.trim()}
          >
            {processing ? "Processing..." : "Start Workflow"}
          </button>
          
          {downloadReady && xmlStatus.completed && (
            <button 
              className={styles.downloadBtn}
              onClick={handleDownload}
            >
              Download XML
            </button>
          )}
        </div>
        
        {/* Display step outputs */}
        <div className={styles.outputs}>
          {/* Step 1: Formatted Script */}
          {formatStatus.completed && formatStatus.output && (
            <div className={styles.outputSection}>
              <h3>Formatted Script</h3>
              <div className={styles.formattedScript}>
                <pre>{formatStatus.output}</pre>
              </div>
            </div>
          )}
          
          {/* Step 2: Audio */}
          {audioStatus.completed && audioStatus.output && (
            <div className={styles.outputSection}>
              <h3>Generated Audio</h3>
              <audio controls src={audioStatus.output} className={styles.audioPlayer}></audio>
            </div>
          )}
          
          {/* Step 3: Chunked Script */}
          {chunkStatus.completed && chunkStatus.output && (
            <div className={styles.outputSection}>
              <h3>Script Segments</h3>
              <div className={styles.segmentsTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Prompt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chunkStatus.output.segments.map((segment: Segment) => (
                      <tr key={segment.lineNumber}>
                        <td>{segment.lineNumber}</td>
                        <td>{segment.prompt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {/* Step 4: Generated Images */}
          {imageStatus.completed && imageStatus.output && imageStatus.output.length > 0 && (
            <div className={styles.outputSection}>
              <h3>Generated Images</h3>
              <div className={styles.imagesGrid}>
                {imageStatus.output
                  .filter(image => image.success)
                  .map((image) => (
                    <div key={image.index} className={styles.imageCard}>
                      <img src={image.imageUrl} alt={`Generated image ${image.index}`} />
                      <p>{image.prompt}</p>
                    </div>
                  ))}
              </div>
              {imageStatus.output.some(img => !img.success) && (
                <div className={styles.warningMessage}>
                  Some images failed to generate. Showing only successful images.
                </div>
              )}
            </div>
          )}
          
          {/* Step 5: XML Link */}
          {xmlStatus.completed && xmlStatus.output && (
            <div className={styles.outputSection}>
              <h3>DaVinci Resolve Project Ready</h3>
              <p>Your DaVinci Resolve project file has been created. Click the Download button above to save it.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 