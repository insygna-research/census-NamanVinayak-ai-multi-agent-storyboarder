'use client';

import { useState } from 'react';
import styles from '../page.module.css';

export default function TestPage() {
  const [prompt, setPrompt] = useState('A beautiful mountain landscape at sunset');
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsLoading(true);
    setImageUrl(null);
    setError(null);
    setSourceUrl(null);
    
    try {
      // Get the current timestamp to avoid caching
      const timestamp = new Date().getTime();
      const response = await fetch(`/api/test-ideogram?prompt=${encodeURIComponent(prompt)}&t=${timestamp}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }
      
      // Add timestamp to image URL to avoid caching
      setImageUrl(`${data.imageUrl}?t=${timestamp}`);
      if (data.sourceUrl) {
        setSourceUrl(data.sourceUrl);
      }
    } catch (err) {
      console.error('Error generating image:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <main className={styles.container}>
        <h1 className={styles.title}>Test Image Generation</h1>
        <p className={styles.subtitle}>Test the Ideogram API for image generation</p>
        
        <div className={styles.scriptInput}>
          <label htmlFor="prompt">Image Prompt:</label>
          <textarea 
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            disabled={isLoading}
            rows={4}
            style={{ color: 'black' }}
          />
        </div>
        
        <div className={styles.buttons}>
          <button 
            className={styles.processBtn}
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
          >
            {isLoading ? "Generating..." : "Generate with Ideogram"}
          </button>
        </div>
        
        {isLoading && (
          <div className={styles.loading}>
            <p>Generating image, please wait...</p>
          </div>
        )}
        
        {error && (
          <div className={styles.error}>
            <p>Error: {error}</p>
          </div>
        )}
        
        {imageUrl && (
          <div className={styles.imageResult}>
            <h3>Generated Image:</h3>
            <img 
              src={imageUrl} 
              alt={`Generated from: ${prompt}`}
              style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '1rem' }}
            />
            {sourceUrl && (
              <div style={{ marginTop: '0.5rem' }}>
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>
                  View original on Ideogram
                </a>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
} 