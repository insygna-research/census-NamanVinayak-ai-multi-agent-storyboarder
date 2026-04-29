# Parakeet TDT Client

This directory contains the client script for transcribing audio files using the NVIDIA Parakeet TDT model deployed on RunPod.

## Usage

```bash
python transcribe_audio.py /path/to/audio_file.mp3 \
    --api-key YOUR_API_KEY \
    --endpoint-id YOUR_ENDPOINT_ID
```

See the script's help for more options:

```bash
python transcribe_audio.py --help
```

## Output Format

The script produces a JSON file with the following structure:

```json
{
  "transcript": "Full transcription text",
  "word_timestamps": [
    {
      "word": "first",
      "start": 0.5,
      "end": 0.8,
      "score": 0.95
    },
    ...
  ]
}
``` 