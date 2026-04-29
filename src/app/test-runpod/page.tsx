'use client';

import { useState } from 'react';
import Image from 'next/image';
import styles from './page.module.css';

export default function TestRunPodPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [testPrompt, setTestPrompt] = useState('A beautiful sunset over mountains, cinematic lighting, 8K resolution');

  const runTest = async () => {
    console.log('🧪 Button clicked - Starting RunPod test...');
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('📡 Making API request to /api/test-runpod');
      console.log('📝 Test prompt:', testPrompt);
      
      const response = await fetch('/api/test-runpod', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testPrompt }),
      });

      console.log('📥 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);
      
      if (response.ok) {
        setResult(data);
        console.log('✅ Test completed successfully');
      } else {
        setError(data.error || `API returned status ${response.status}`);
        console.error('❌ Test failed with API error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Network error: ${errorMessage}`);
      console.error('🔥 Network/JS error:', err);
    } finally {
      setLoading(false);
      console.log('🏁 Test completed, loading set to false');
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🧪 RunPod Connection Test</h1>
        <p>Test the RunPod ComfyUI endpoint with a single prompt to verify the connection is working.</p>
      </header>

      <div className={styles.stageIndicator}>
        <div className={`${styles.stage} ${styles.active}`}>RunPod Test</div>
        <div className={`${styles.stage} ${result?.success ? styles.active : ''}`}>Verification</div>
        <div className={`${styles.stage} ${result?.success ? styles.active : ''}`}>Complete</div>
      </div>

      {error && (
        <div className={styles.error}>
          <h3>❌ Test Failed</h3>
          <p>{error}</p>
        </div>
      )}

      <div className={styles.stageContent}>
        <h2>Test Configuration</h2>
        <div className={styles.resultGrid}>
          <div>
            <strong>Endpoint ID:</strong> 5lq23g82tx2u2k
          </div>
          <div>
            <strong>API Key:</strong> Configured ✅
          </div>
          <div>
            <strong>Model:</strong> FLUX ComfyUI
          </div>
        </div>

        <div className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="testPrompt">Test Prompt:</label>
            <textarea
              id="testPrompt"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              rows={3}
              placeholder="Enter your test prompt here..."
            />
          </div>

          <button
            onClick={runTest}
            disabled={loading}
            className={styles.button}
          >
            {loading ? '🔄 Testing RunPod Connection...' : '🚀 Run Test'}
          </button>
        </div>
      </div>

      {/* Current Step Indicator */}
      {loading && (
        <div className={styles.currentStepIndicator}>
          <div className={styles.processingStage}>
            <div className={styles.loadingSpinner}></div>
            <p>Testing connection to RunPod endpoint...</p>
          </div>
        </div>
      )}

      {/* Results Section */}
      <div className={styles.resultsSection}>
        {result && (
          <div className={styles.result}>
            <h2>{result.success ? '✅ Test Successful!' : '❌ Test Failed'}</h2>
            <div className={styles.resultData}>
              <div className={styles.resultGrid}>
                <div>
                  <strong>API Key Configured:</strong> {result.apiKeyConfigured ? 'Yes ✅' : 'No ❌'}
                </div>
                <div>
                  <strong>Test Folder:</strong> {result.testFolderId}
                </div>
                <div>
                  <strong>Images Generated:</strong> {result.totalImages || 0}
                </div>
                <div>
                  <strong>Status:</strong> {result.message || result.error}
                </div>
              </div>

              {result.generatedImages && result.generatedImages.length > 0 && (
                <div className={styles.imagesGrid}>
                  {result.generatedImages.map((imageUrl: string, index: number) => (
                    <div key={index} className={styles.imageContainer}>
                      <Image 
                        src={imageUrl} 
                        alt={`Generated test image ${index + 1}`}
                        className={styles.generatedImage}
                        width={500}
                        height={300}
                        onError={(e) => {
                          console.error(`Failed to load image:`, imageUrl);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className={styles.imageActions}>
                        <a 
                          href={imageUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={styles.viewFullButton}
                        >
                          View Full Size
                        </a>
                        <button 
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = imageUrl;
                            link.download = `runpod-test-image-${index + 1}.png`;
                            link.click();
                          }}
                          className={styles.downloadButton}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.output && (
                <details className={styles.rawData}>
                  <summary>🐍 Python Output Log</summary>
                  <pre>{result.output}</pre>
                </details>
              )}

              {result.errorOutput && (
                <details className={styles.rawData}>
                  <summary>❌ Error Output</summary>
                  <pre style={{ color: '#d32f2f' }}>{result.errorOutput}</pre>
                </details>
              )}
            </div>
          </div>
        )}
      </div>

      <div className={styles.result}>
        <h2>🔍 What this test does:</h2>
        <div className={styles.resultData}>
          <ul>
            <li>✅ Verifies RUNPOD_API_KEY is configured</li>
            <li>✅ Tests connection to endpoint 5lq23g82tx2u2k</li>
            <li>✅ Sends 1 test prompt to RunPod ComfyUI</li>
            <li>✅ Checks if image generation works</li>
            <li>✅ Displays generated image if successful</li>
          </ul>
        </div>
      </div>
    </div>
  );
}