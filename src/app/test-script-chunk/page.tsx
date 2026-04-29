'use client';

import { useState } from 'react';
import styles from '../page.module.css';

export default function TestScriptChunk() {
  const [inputScript, setInputScript] = useState('');
  const [formattedScript, setFormattedScript] = useState('');
  const [chunkedScript, setChunkedScript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    scriptLength?: number;
    formattedLength?: number;
    formattingTime?: number;
  } | null>(null);

  const handleFormatScript = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('Calling test-format API...');
      const response = await fetch('/api/test-format', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script: inputScript }),
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonParseError) {
        console.error('Failed to parse JSON:', responseText, jsonParseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to format script');
      }

      setFormattedScript(data.formattedScript);
      setStats({
        scriptLength: data.stats?.scriptLength,
        formattedLength: data.stats?.formattedLength,
        formattingTime: data.stats?.formattingTime
      });
    } catch (err) {
      console.error('Format script error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChunkScript = async () => {
    if (!formattedScript) {
      setError('Please format the script first');
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      console.log('Calling chunk-script API...');
      // Create a temporary folder ID for this test
      const tempFolderId = "test-chunk-" + Date.now();
      
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

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (jsonParseError) {
        console.error('Failed to parse JSON:', responseText, jsonParseError);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to chunk script');
      }

      setChunkedScript(data.chunkedScript);
      console.log('Successfully received chunked script');
    } catch (err) {
      console.error('Chunk script error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Test Script Formatting and Chunking</h1>
      
      <div className={styles.scriptInput}>
        <label htmlFor="script">Enter your script:</label>
        <textarea
          id="script"
          value={inputScript}
          onChange={(e) => setInputScript(e.target.value)}
          rows={10}
          placeholder="Enter your script here..."
          disabled={isLoading}
          style={{ color: 'black' }}
        />
      </div>
      
      <div className={styles.buttons}>
        <button 
          className={styles.processBtn} 
          onClick={handleFormatScript} 
          disabled={isLoading || !inputScript}
        >
          {isLoading ? 'Processing...' : 'Format Script'}
        </button>
        
        {formattedScript && (
          <button 
            className={styles.processBtn} 
            onClick={handleChunkScript} 
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Chunk Script'}
          </button>
        )}
      </div>

      {error && (
        <div className={styles.error}>
          Error: {error}
        </div>
      )}
      
      {stats && (
        <div className={styles.stats}>
          <h3>Processing Stats:</h3>
          <ul>
            <li>Original Length: {stats.scriptLength} characters</li>
            <li>Formatted Length: {stats.formattedLength} characters</li>
            <li>Processing Time: {stats.formattingTime} seconds</li>
          </ul>
        </div>
      )}

      {formattedScript && (
        <div className={styles.formattedScript}>
          <h4>Formatted Script:</h4>
          <p>{formattedScript}</p>
        </div>
      )}

      {chunkedScript && (
        <div className={styles.result}>
          <h3>Chunked Script with Prompts:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', color: 'black' }}>{chunkedScript}</pre>
        </div>
      )}
    </div>
  );
} 