# Setting up your Parakeet TDT RunPod Endpoint

This guide will help you set up your RunPod endpoint with the new Parakeet TDT image and test it with your audio files.

## 1. Setting up the RunPod Endpoint

1. Go to the RunPod serverless dashboard: https://www.runpod.io/console/serverless
2. Click "New Endpoint"
3. Select "Docker Hub" as the template source
4. Enter the image name: `naman188/nvidia-parakeet:latest`
5. Configure your endpoint:
   - Select a GPU type (recommended: at least 16GB VRAM)
   - Set the number of workers (start with 1)
   - Set the minimum and maximum idle workers (e.g., min: 0, max: 1)
   - Configure network volume if needed
6. Name your endpoint (e.g., "parakeet-tdt")
7. Click "Deploy"

## 2. Getting Your API Key and Endpoint ID

1. After deployment, note your Endpoint ID from the endpoint details page
2. Go to "API Keys" in the sidebar menu and create a new API key if you don't have one
3. Copy both your API key and Endpoint ID

## 3. Testing Your Endpoint

1. Set environment variables (optional but recommended):
   ```bash
   export RUNPOD_API_KEY="your_api_key"
   export PARAKEET_ENDPOINT_ID="your_endpoint_id"
   ```

2. Run the client script:
   ```bash
   cd nvidia/parakeet_runpod/client
   python3 transcribe_audio.py "/path/to/your/audio.wav"
   ```

   Or with explicit parameters:
   ```bash
   python3 transcribe_audio.py "/path/to/your/audio.wav" --api-key "your_api_key" --endpoint-id "your_endpoint_id"
   ```

## 4. Monitoring Your Endpoint

1. Check the RunPod console for logs and errors
2. If you see any issues, you can check the detailed logs by clicking on the worker

## 5. Troubleshooting

If you encounter issues:

1. **Endpoint logs show errors loading the model**:
   - Check if your GPU has enough VRAM
   - Try restarting the endpoint

2. **Client timeout errors**:
   - Increase the timeout with the `--timeout` parameter
   - For large audio files, use async mode (default)

3. **"Mock transcription" in results**:
   - Ensure you're using the latest image (`naman188/nvidia-parakeet:latest`) 
   - Check endpoint logs for model loading errors

4. **No word timestamps in output**:
   - Make sure the `word_timestamps` option is set to `true` in the request
   - Check if the model loaded correctly in the logs

## 6. Example Client Commands

Standard usage:
```bash
python3 transcribe_audio.py "/path/to/audio.mp3"
```

Using sync mode (for faster results with small files):
```bash
python3 transcribe_audio.py "/path/to/audio.wav" --sync
```

Specifying output file:
```bash
python3 transcribe_audio.py "/path/to/audio.wav" --output "my_transcription.json"
```

Increasing timeout for large files:
```bash
python3 transcribe_audio.py "/path/to/audio.wav" --timeout 1800  # 30 minutes
``` 