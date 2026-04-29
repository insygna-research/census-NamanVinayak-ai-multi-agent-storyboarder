'use client';

import { useState } from 'react';

export default function SimpleTestPage() {
  const [message, setMessage] = useState('Ready to test');

  const testButton = () => {
    console.log('Simple button clicked!');
    setMessage('Button clicked at ' + new Date().toLocaleTimeString());
  };

  const testRunPodAPI = async () => {
    console.log('Testing RunPod API...');
    setMessage('Testing RunPod API...');
    
    try {
      const response = await fetch('/api/test-runpod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testPrompt: 'Simple test prompt' })
      });
      
      const data = await response.json();
      console.log('API Response:', data);
      setMessage(`API Response: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error('API Error:', error);
      setMessage(`Error: ${error}`);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Simple Test Page</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <strong>Status:</strong> {message}
      </div>
      
      <div style={{ marginBottom: '1rem' }}>
        <button 
          onClick={testButton}
          style={{
            padding: '10px 20px',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Test Button Click
        </button>
        
        <button 
          onClick={testRunPodAPI}
          style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test RunPod API
        </button>
      </div>
      
      <div style={{ marginTop: '2rem' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Open browser console (F12)</li>
          <li>Click "Test Button Click" to verify JavaScript is working</li>
          <li>Click "Test RunPod API" to test the endpoint</li>
          <li>Watch console for logs and errors</li>
        </ol>
      </div>
    </div>
  );
}