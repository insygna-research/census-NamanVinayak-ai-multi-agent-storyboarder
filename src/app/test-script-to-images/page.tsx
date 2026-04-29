'use client';

import { useState } from 'react';
import styles from '../page.module.css';

interface ImageResult {
  index: number;
  prompt: string;
  success: boolean;
  imageUrl?: string;
  sourceUrl?: string;
  error?: string;
}

export default function TestScriptToImages() {
  const [chunkedScript, setChunkedScript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prompts, setPrompts] = useState<string[]>([]);
  const [imageResults, setImageResults] = useState<ImageResult[]>([]);

  // Parse the markdown table to extract prompts
  const parseChunkedScript = () => {
    try {
      // Split by lines and filter out empty lines
      const lines = chunkedScript.split('\n').filter(line => line.trim() !== '');
      
      // Extract prompts - Assuming the format is a markdown table with prompts in the last column
      const extractedPrompts: string[] = [];
      
      // Skip the first 2 lines (table header and separator)
      for (let i = 2; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|')) {
          // Split by | and remove empty segments
          const columns = line.split('|').filter(col => col.trim() !== '');
          
          // The prompt should be the last column
          if (columns.length >= 1) {
            const prompt = columns[columns.length - 1].trim();
            if (prompt) {
              extractedPrompts.push(prompt);
            }
          }
        }
      }
      
      if (extractedPrompts.length === 0) {
        throw new Error('No prompts found in the chunked script');
      }
      
      setPrompts(extractedPrompts);
      setError(null);
      return extractedPrompts;
    } catch (err) {
      console.error('Error parsing chunked script:', err);
      setError(err instanceof Error ? err.message : 'Failed to parse the chunked script');
      return [];
    }
  };

  // Generate images from the extracted prompts
  const generateImages = async (extractedPrompts: string[]) => {
    setIsGeneratingImages(true);
    setImageResults([]);
    setError(null);
    
    try {
      // Add timestamp to avoid caching
      const timestamp = new Date().getTime();
      
      const response = await fetch('/api/generate-multiple-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompts: extractedPrompts }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate images');
      }
      
      // Add timestamp to image URLs to avoid caching
      const resultsWithTimestamp = data.results.map((result: ImageResult) => ({
        ...result,
        imageUrl: result.imageUrl ? `${result.imageUrl}?t=${timestamp}` : undefined
      }));
      
      setImageResults(resultsWithTimestamp);
    } catch (err) {
      console.error('Error generating images:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while generating images');
    } finally {
      setIsGeneratingImages(false);
    }
  };

  // Handle the submit action
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const extractedPrompts = parseChunkedScript();
    
    if (extractedPrompts.length > 0) {
      await generateImages(extractedPrompts);
    }
    
    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Test Script to Images</h1>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="chunkedScript" className={styles.label}>
            Paste Chunked Script (Markdown Table):
          </label>
          <textarea
            id="chunkedScript"
            value={chunkedScript}
            onChange={(e) => setChunkedScript(e.target.value)}
            className={styles.textarea}
            rows={10}
            placeholder="Paste your chunked script with prompts here..."
            required
            disabled={isLoading || isGeneratingImages}
            style={{ color: 'black', backgroundColor: 'white' }}
          />
        </div>
        
        <button 
          type="submit" 
          className={styles.processBtn}
          disabled={isLoading || isGeneratingImages || !chunkedScript.trim()}
        >
          {isLoading ? 'Processing...' : isGeneratingImages ? 'Generating Images...' : 'Generate Images'}
        </button>
      </form>

      {error && (
        <div className={styles.error}>
          <h2>Error:</h2>
          <p>{error}</p>
        </div>
      )}
      
      {prompts.length > 0 && (
        <div className={styles.result}>
          <h2>Extracted Prompts:</h2>
          <ul>
            {prompts.map((prompt, index) => (
              <li key={index}>
                <strong>Prompt {index + 1}:</strong> {prompt}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {imageResults.length > 0 && (
        <div className={styles.result}>
          <h2>Generated Images:</h2>
          <div className={styles.imageGrid}>
            {imageResults.map((result, index) => (
              <div key={index} className={styles.imageCard}>
                <h3>Image {result.index}</h3>
                <p>{result.prompt}</p>
                {result.success ? (
                  <>
                    <img 
                      src={result.imageUrl} 
                      alt={`Generated from: ${result.prompt}`}
                      style={{ width: '100%', borderRadius: '4px' }}
                    />
                    {result.sourceUrl && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <a 
                          href={result.sourceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: '#3b82f6' }}
                        >
                          View original on Ideogram
                        </a>
                      </div>
                    )}
                  </>
                ) : (
                  <div className={styles.error}>
                    <p>Failed to generate image: {result.error}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 