import requests
import json
import os
import time
import base64
from dotenv import load_dotenv

# Load API key from your .env.local file
load_dotenv('.env.local')
api_key = os.getenv('RUNPOD_API_KEY')

# RunPod endpoint ID for LLaVA model
endpoint_id = "fge0xs2s20s1vs"

# Define API URLs
health_url = f"https://api.runpod.ai/v2/{endpoint_id}/health"
run_url = f"https://api.runpod.ai/v2/{endpoint_id}/run"
status_url = f"https://api.runpod.ai/v2/{endpoint_id}/status/"

# Hardcoded path to the image
DEFAULT_IMAGE_PATH = os.path.join("public", "generated_image.png")

def check_endpoint_health():
    """Check if the RunPod endpoint is healthy."""
    headers = {"Authorization": f"Bearer {api_key}"}
    try:
        response = requests.get(health_url, headers=headers)
        print(f"Health Check - Status Code: {response.status_code}")
        print(f"Health Check - Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Health check failed with error: {e}")
        return False

def encode_image_to_base64(image_path):
    """Encode an image to base64 for sending to API"""
    try:
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except Exception as e:
        print(f"Error encoding image: {e}")
        return None

def query_minimal(text_prompt="What is shown in this image?", image_path=DEFAULT_IMAGE_PATH):
    """
    Send a query to LLaVA model via RunPod using the absolute minimal format
    """
    # First check if image exists
    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        return None
    
    # Encode image (resize it first if it's too large)
    print(f"Encoding image from {image_path}...")
    image_base64 = encode_image_to_base64(image_path)
    if not image_base64:
        return None
    
    # Create the absolute minimal payload
    payload = {
        "input": {
            "prompt": text_prompt,
            "image": image_base64
        }
    }
    
    # Simplified headers
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    print(f"Sending minimal request to RunPod LLaVA endpoint...")
    try:
        response = requests.post(run_url, headers=headers, json=payload)
        print(f"Initial Response Status Code: {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            job_id = response_data.get("id")
            print(f"Job submitted successfully with ID: {job_id}")
            
            # Poll for completion but with better error handling
            max_retries = 10
            retry_count = 0
            
            while retry_count < max_retries:
                try:
                    print(f"Checking status (attempt {retry_count+1}/{max_retries})...")
                    status_response = requests.get(f"{status_url}{job_id}", headers=headers)
                    
                    if status_response.status_code != 200:
                        print(f"Status check failed with code: {status_response.status_code}")
                        print(f"Response: {status_response.text}")
                        retry_count += 1
                        time.sleep(5)
                        continue
                    
                    status_data = status_response.json()
                    status = status_data.get("status")
                    print(f"Status: {status}")
                    
                    if status == "COMPLETED":
                        print("Job completed!")
                        return status_data
                    elif status in ["FAILED", "ERROR"]:
                        print(f"Job failed with status: {status}")
                        print(json.dumps(status_data, indent=2))
                        return None
                    
                    # Still in progress, wait and retry
                    time.sleep(5)
                    
                except Exception as e:
                    print(f"Error checking status: {e}")
                    retry_count += 1
                    time.sleep(5)
            
            print(f"Exceeded maximum retries ({max_retries})")
            return None
        else:
            print(f"Failed to submit job: {response.text}")
            return None
            
    except Exception as e:
        print(f"Error making request: {e}")
        return None

def test_endpoint_basic():
    """
    Test if the endpoint responds to a very basic text-only request
    """
    print("Testing endpoint with basic text-only request...")
    
    # Super simple payload for testing
    payload = {
        "input": {
            "prompt": "Hello, world!"
        }
    }
    
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(run_url, headers=headers, json=payload)
        print(f"Response Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            job_id = response.json().get("id")
            print(f"Job ID: {job_id}")
            print("Basic test succeeded - endpoint accepts requests")
            return True
        else:
            print("Basic test failed - endpoint rejected simple request")
            return False
    except Exception as e:
        print(f"Error in basic test: {e}")
        return False

def main():
    # First check if the endpoint is healthy
    print("Checking endpoint health...")
    if not check_endpoint_health():
        print("Endpoint health check failed. Please check your endpoint ID and API key.")
        return
    
    # Test with a basic request first
    print("\nTesting endpoint with basic request...")
    if not test_endpoint_basic():
        print("Endpoint is not accepting even basic requests. Please check configuration.")
        return
    
    # Now try with the image
    print("\nProceeding with image request...")
    print(f"Using image path: {DEFAULT_IMAGE_PATH}")
    if not os.path.exists(DEFAULT_IMAGE_PATH):
        print(f"Warning: Image not found at {DEFAULT_IMAGE_PATH}")
        create_test = input("Do you want to continue with text-only test? (y/n): ")
        if create_test.lower() != 'y':
            return
    
    text_prompt = input("Enter your text prompt (or press Enter for default): ")
    if not text_prompt:
        text_prompt = "What is shown in this image? Describe it in detail."
    
    # Try the minimal query approach
    print("\nSending minimal query to LLaVA model...")
    result = query_minimal(text_prompt, DEFAULT_IMAGE_PATH)
    
    if result:
        print("\n----- RESULTS -----")
        print(json.dumps(result, indent=2))
        print("-------------------")
        
        # Check for output
        if "output" in result and result["output"]:
            print("\nOutput found in response:")
            print(result["output"])
        else:
            print("\nNo output field found in response.")
    else:
        print("\nQuery failed or returned no results.")

if __name__ == "__main__":
    main()

