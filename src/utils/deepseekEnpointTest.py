import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get API key and endpoint ID from environment variables
API_KEY = os.getenv('RUNPOD_API_KEY') or os.getenv('ARSHH_RUNPOD_API_KEY')
ENDPOINT_ID = os.getenv('DEEPSEEK_ENDPOINT_ID', '72sj33m0ktakl5')

if not API_KEY:
    raise ValueError("RUNPOD_API_KEY or ARSHH_RUNPOD_API_KEY environment variable is required")

# OpenAI-compatible API URL
BASE_URL = f"https://api.runpod.ai/v2/{ENDPOINT_ID}/openai/v1"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

def send_chat_request(messages, temperature=0.7):
    """Send a chat request to the DeepSeek-R1-Distill-Llama-8B model using OpenAI API."""
    url = f"{BASE_URL}/chat/completions"
    
    payload = {
        "model": "deepseek-ai/DeepSeek-R1-Distill-Llama-8B",
        "messages": messages,
        "temperature": temperature,
        "stop": ["User:"]
    }
    
    print("Sending message to model...")
    response = requests.post(url, headers=headers, json=payload)
    
    if response.status_code == 200:
        result = response.json()
        return result
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None

def main():
    """Interactive chat with DeepSeek-R1-Distill-Llama-8B using OpenAI API."""
    print("====================================================")
    print("Welcome to DeepSeek-R1-Distill-Llama-8B Chat")
    print("Type 'quit', 'exit', or 'bye' to end the conversation")
    print("====================================================")
    
    # Initialize conversation history with a system message
    history = [
        {"role": "system", "content": "You are a helpful assistant powered by the DeepSeek-R1-Distill-Llama-8B model."}
    ]
    
    while True:
        user_input = input("\nYou: ").strip()
        
        # Check if user wants to exit
        if user_input.lower() in ['quit', 'exit', 'bye']:
            print("Goodbye!")
            break
        
        # Add user message to history
        history.append({"role": "user", "content": user_input})
        
        try:
            # Send request to the model
            result = send_chat_request(history)
            
            if result:
                # Extract the assistant's response
                answer = result.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # Display response and token usage
                print(f"\nDeepSeek: {answer}")
                
                usage = result.get("usage", {})
                if usage:
                    print(f"\n[Token usage: {usage.get('total_tokens', 'unknown')} tokens]")
                
                # Add assistant's response to history
                history.append({"role": "assistant", "content": answer})
            else:
                print("\nFailed to get a response from the model.")
                
        except Exception as e:
            print(f"\nError: {e}")
            print("There was an error communicating with the model.")

if __name__ == "__main__":
    main() 