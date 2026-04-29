#!/usr/bin/env python3

import requests
import json
import base64
import time
import sys
import os
import datetime
import argparse

def print_status(message, end="\n"):
    """Print a status message with timestamp"""
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {message}", end=end)
    sys.stdout.flush()

def transcribe_audio(audio_path, api_key, endpoint_id, output_path=None, timeout=900, async_mode=True):
    """
    Transcribe audio file with word-level timestamps using RunPod Parakeet endpoint
    
    Args:
        audio_path: Path to the audio file
        api_key: RunPod API key
        endpoint_id: RunPod endpoint ID
        output_path: Path to save the output JSON
        timeout: Timeout in seconds
        async_mode: Whether to use async API
    """
    # Validate audio file
    if not os.path.exists(audio_path):
        print_status(f"Error: Audio file not found at {audio_path}")
        return False
    
    # Set default output path if not specified
    if not output_path:
        base_name = os.path.splitext(os.path.basename(audio_path))[0]
        # Save to public folder relative to project root
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
        public_folder = os.path.join(project_root, 'public')
        os.makedirs(public_folder, exist_ok=True)
        output_path = os.path.join(public_folder, f"{base_name}_transcription.json")
    
    print_status(f"Transcribing audio file: {audio_path}")
    print_status(f"Using endpoint: {endpoint_id}")
    print_status(f"Mode: {'Async' if async_mode else 'Sync'}")
    
    # Read and encode audio file
    try:
        with open(audio_path, "rb") as f:
            audio_data = f.read()
            
        audio_base64 = base64.b64encode(audio_data).decode("utf-8")
        file_size_mb = len(audio_data) / (1024 * 1024)
        print_status(f"Audio file size: {file_size_mb:.2f} MB")
    except Exception as e:
        print_status(f"Error reading audio file: {str(e)}")
        return False
    
    # Prepare the request
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "input": {
            "audio": audio_base64,
            "options": {
                "language": None,
                "word_timestamps": True,
                "chunk_length_s": None
            }
        }
    }
    
    # Process using appropriate API mode
    if async_mode:
        return process_async(payload, headers, endpoint_id, api_key, timeout, output_path)
    else:
        return process_sync(payload, headers, endpoint_id, timeout, output_path)

def process_async(payload, headers, endpoint_id, api_key, timeout, output_path):
    """Process using async API"""
    url = f"https://api.runpod.ai/v2/{endpoint_id}/run"
    
    print_status("Submitting async job...")
    start_time = time.time()
    
    try:
        # Submit job
        response = requests.post(url, headers=headers, json=payload)
        response.raise_for_status()
        result = response.json()
        
        job_id = result.get("id")
        if not job_id:
            print_status("Error: No job ID returned")
            return False
        
        print_status(f"Job submitted successfully. ID: {job_id}")
        
        # Monitor job status
        job_result = monitor_job_status(endpoint_id, api_key, job_id, timeout)
        
        elapsed = time.time() - start_time
        if job_result:
            print_status(f"Job completed in {elapsed:.2f} seconds")
            # Save results
            return save_results(job_result, output_path)
        else:
            print_status(f"Job failed or timed out after {elapsed:.2f} seconds")
            return False
    
    except Exception as e:
        print_status(f"Error processing async request: {str(e)}")
        return False

def monitor_job_status(endpoint_id, api_key, job_id, timeout):
    """Monitor async job status until completion"""
    url = f"https://api.runpod.ai/v2/{endpoint_id}/status/{job_id}"
    headers = {"Authorization": f"Bearer {api_key}"}
    
    start_time = time.time()
    spinner = "|/-\\"
    spin_idx = 0
    
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            result = response.json()
            
            status = result.get("status")
            
            if status == "COMPLETED":
                print_status("\nJob completed successfully ✓")
                output = result.get("output", {})
                # Handle nested output structure
                if isinstance(output, dict) and "output" in output:
                    output = output["output"]
                return output
            
            elif status == "FAILED":
                print_status(f"\nJob failed: {result.get('error', 'Unknown error')}")
                return None
            
            elif status == "IN_QUEUE":
                position = result.get("position", "unknown")
                print_status(f"In queue (position: {position}) {spinner[spin_idx % len(spinner)]}", end="\r")
            
            else:  # IN_PROGRESS or other
                print_status(f"Processing... {spinner[spin_idx % len(spinner)]}", end="\r")
            
            spin_idx += 1
            time.sleep(2)
            
        except Exception as e:
            print_status(f"Error checking status: {str(e)}")
            time.sleep(5)
    
    print_status(f"\nTimeout after {timeout} seconds")
    return None

def process_sync(payload, headers, endpoint_id, timeout, output_path):
    """Process using sync API"""
    url = f"https://api.runpod.ai/v2/{endpoint_id}/runsync"
    
    print_status("Sending synchronous request...")
    start_time = time.time()
    
    # Setup animation
    spinner = "|/-\\"
    spin_idx = 0
    
    try:
        # Non-blocking approach with animation
        session = requests.Session()
        request = requests.Request('POST', url, headers=headers, json=payload)
        prepped = session.prepare_request(request)
        
        response = None
        
        # Show animation while waiting
        while True:
            try:
                if not response:
                    response = session.send(prepped, timeout=timeout)
                
                # Check if response is ready
                if response and hasattr(response, 'content'):
                    break
                    
                elapsed = time.time() - start_time
                status_msg = "Request in progress"
                
                # Update status based on elapsed time
                if elapsed < 30:
                    status_msg = "Initializing request"
                elif elapsed < 60:
                    status_msg = "Loading model"
                else:
                    status_msg = "Processing audio"
                    
                print_status(f"{status_msg} ({elapsed:.1f}s) {spinner[spin_idx % len(spinner)]}", end="\r")
                spin_idx += 1
                
                # Check for timeout
                if elapsed > timeout:
                    if response:
                        response.close()
                    print_status(f"\nTimeout after {timeout} seconds")
                    return False
                
                time.sleep(0.5)
                
            except Exception as e:
                print_status(f"\nError while waiting for response: {str(e)}")
                return False
        
        # Process the response
        elapsed = time.time() - start_time
        print_status(f"\nResponse received in {elapsed:.2f} seconds")
        
        response.raise_for_status()
        result = response.json()
        
        if "error" in result:
            print_status(f"API Error: {result['error']}")
            return False
            
        output = result.get("output")
        
        # Save results
        return save_results(output, output_path)
        
    except Exception as e:
        print_status(f"Error processing sync request: {str(e)}")
        return False

def save_results(output, output_path):
    """Format and save transcription results"""
    if not output:
        print_status("No output to save")
        print_status(f"Raw output: {json.dumps(output, indent=2)}")
        return False
    
    # Debug output structure
    print_status(f"DEBUG - Output type: {type(output)}")
    
    # Extract text and word timestamps - handle different response structures
    text = ""
    words = []
    
    # Case 1: Output is directly the result object with text and words
    if isinstance(output, dict) and "text" in output:
        text = output.get("text", "")
        words = output.get("words", [])
    # Case 2: Output is nested under 'output' key
    elif isinstance(output, dict) and "output" in output:
        inner_output = output.get("output", {})
        if isinstance(inner_output, dict):
            text = inner_output.get("text", "")
            words = inner_output.get("words", [])
    
    if not text:
        print_status("No transcription text found in result")
        print_status(f"Raw output: {json.dumps(output, indent=2)}")
        return False
    
    # Format output
    formatted_output = {
        "transcript": text,
        "word_timestamps": words
    }
    
    # Print transcript summary
    print_status(f"\nTranscription complete!")
    print_status(f"Transcript ({len(text)} chars):")
    print_status(f'"{text}"')
    
    # Save to file
    try:
        with open(output_path, 'w') as f:
            json.dump(formatted_output, f, indent=2)
        
        print_status(f"Results saved to: {output_path}")
        
        # Display sample output
        if words:
            print_status(f"\nFound {len(words)} words with timestamps")
            print_status("Sample word timestamps:")
            
            # Show first 5 words
            num_words = min(5, len(words))
            for i in range(num_words):
                word = words[i]
                start_time = word.get('start', 0)
                end_time = word.get('end', 0)
                # Handle different formats - the new model may use different field names
                if 'start' not in word and 'start_time' in word:
                    start_time = word.get('start_time', 0)
                if 'end' not in word and 'end_time' in word:
                    end_time = word.get('end_time', 0)
                print_status(f"  '{word['word']}': {start_time:.2f}s - {end_time:.2f}s")
                
            if len(words) > num_words:
                print_status(f"  ... and {len(words) - num_words} more words")
        
        return True
    
    except Exception as e:
        print_status(f"Error saving results: {str(e)}")
        return False

def main():
    """Main function to parse arguments and run transcription"""
    parser = argparse.ArgumentParser(description="RunPod Parakeet TDT Transcription Client")
    
    parser.add_argument(
        "audio_file",
        help="Path to the audio file to transcribe"
    )
    
    parser.add_argument(
        "--api-key",
        default=os.environ.get("ARSHH_RUNPOD_API_KEY"),
        help="RunPod API key (default: ARSHH_RUNPOD_API_KEY env var)"
    )
    
    parser.add_argument(
        "--endpoint-id",
        default="3bm1957lpyat1x",
        help="RunPod endpoint ID (default: 3bm1957lpyat1x)"
    )
    
    parser.add_argument(
        "--output",
        help="Output file path (default: audio_file_transcription.json)"
    )
    
    parser.add_argument(
        "--timeout",
        type=int,
        default=900,
        help="Timeout in seconds (default: 900)"
    )
    
    parser.add_argument(
        "--sync",
        action="store_true",
        help="Use synchronous API instead of async (default: async)"
    )
    
    args = parser.parse_args()
    
    # Validate arguments
    if not args.api_key:
        print_status("Error: API key is required. Set via --api-key or ARSHH_RUNPOD_API_KEY environment variable")
        return 1
    
    if not args.endpoint_id:
        print_status("Error: Endpoint ID is required. Set via --endpoint-id or default endpoint 3bm1957lpyat1x")
        return 1
    
    # Run transcription
    success = transcribe_audio(
        args.audio_file,
        args.api_key,
        args.endpoint_id,
        args.output,
        args.timeout,
        not args.sync  # Use async by default
    )
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main()) 