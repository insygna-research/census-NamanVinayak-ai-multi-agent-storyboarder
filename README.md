# AI Multi-Agent Storyboarder

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![Status](https://img.shields.io/badge/status-incomplete%20%E2%80%94%20open%20to%20forks-orange)

> **Honest disclaimer:** This is an **incomplete project**, published as-is for anyone who wants to fork, learn from, or finish it. The script-to-storyboard-to-images half works. The image-to-video half was attempted, hit latency walls, and was never finished. Read the "Status" section below for the full story.

A Next.js application that turns a written script into a cinematic AI storyboard. A multi-agent crew (Producer, Director, DOP, Prompt Engineer, QwenVL Reviewer) breaks down the script, designs each shot, generates a high-fidelity prompt per frame, generates the image with Flux / ComfyUI / Leonardo / Ideogram, and exports a DaVinci Resolve-compatible XML timeline.

---

## The original vision

The system was designed to be a complete script-to-video pipeline:

```
Script
   ↓
[ Producer Agent → Director Agent → DOP Agent → Prompt Engineer → Image Model ]
   ↓
Storyboard (a grid of generated images you can rearrange)
   ↓
[ Image-to-video model → assembled video clips ]
   ↓
Video output OR DaVinci XML for human polish
```

The idea was: **type a prompt or script, get a full storyboard back, drag the panels around to recompose the story, then click "render" and have the system generate a video for each panel using API calls** — letting the user effectively direct a film with a single workflow.

We built the script→storyboard→image side. We never finished the image→video side.

---

## Why it's incomplete

We ran into two real problems on the video side:

1. **Wan video generation latency.** We were hosting Wan on RunPod serverless. Cold-start times plus generation time made the round-trip too slow for any kind of interactive workflow.
2. **The project ended.** A combination of personal and partnership reasons stopped active development before the video assembly was finished.

The architecture is sound, the storyboard side is functional, and there's a clean path forward for anyone who wants to finish it. See **"Where to pick it up"** at the bottom.

---

## What actually works

✅ **Multi-agent script breakdown** — Producer plans the project, Director designs scenes and shots, DOP designs cinematography per shot, Prompt Engineer translates each shot into an image-model prompt
✅ **Image generation** — at every panel, integrated with Flux Dev, Flux Schnell, ComfyUI, Leonardo, Ideogram
✅ **Storyboard view** — see all panels together, rearrange, regenerate individual frames
✅ **TTS narration** — Google Gemini TTS, Hume voice synthesis with optimized settings
✅ **Music video pipeline** — beat-driven shot pacing for music videos
✅ **DaVinci Resolve XML export** — drop the XML into Resolve, all timing and assets pre-aligned
✅ **Multiple pipeline modes** — music-video, no-music-video, universal-chat, conversation-mode, direct script-to-images
✅ **Vision-language review** — QwenVL agent sanity-checks generated frames before they enter the timeline

## What doesn't work / never finished

❌ **Image-to-video generation** — the Wan endpoint integration is *coded* (`src/app/api/generate-wan-videos/`) but was never reliable enough to use end-to-end. RunPod cold starts + Wan generation latency made the pipeline impractical.
❌ **Storyboard → final video assembly** — without working video gen, the system stops at images + DaVinci XML.
❌ **Cost / token telemetry** — there's no spend tracking per pipeline run.
❌ **Polish** — error handling, retries, and rate-limit graceful degradation are inconsistent across providers.

---

## Architecture

```
src/
├── agents/                       The multi-agent crew (React components for orchestration)
│   ├── producer.tsx                 High-level project planner
│   ├── director.tsx                 Scene + shot breakdown
│   ├── dop.tsx                      Cinematography decisions per shot
│   ├── promptEngineer.tsx           Shot → high-fidelity image-model prompt
│   └── qwenVL.tsx                   VL review of generated frames
├── app/
│   ├── api/                      Next.js API routes (one per provider/operation)
│   │   ├── chunk-script/            Break script into shot-sized pieces
│   │   ├── format-script/           Script preprocessing
│   │   ├── transcribe-audio/        Whisper-based transcription
│   │   ├── generate-script/         Script generation from a prompt
│   │   ├── generate-flux-dev/       Flux Dev image generation
│   │   ├── generate-flux-schnell/   Flux Schnell (fast Flux)
│   │   ├── generate-comfy-images/   ComfyUI workflow runner
│   │   ├── generate-multiple-images/ Batch image generation
│   │   ├── generate-wan-videos/     Wan video gen ⚠️ never reliable in production
│   │   ├── generate-davinci-xml/    Resolve XML exporter
│   │   ├── test-ideogram/           Ideogram test endpoint
│   │   ├── test-image/              Generic image-gen test
│   │   ├── test-format/             Format pipeline test
│   │   ├── test-tts/                TTS playground
│   │   ├── producer-agent/          Producer endpoint
│   │   ├── director-agent/          Director endpoint
│   │   ├── dop-agent/               DOP endpoint
│   │   ├── prompt-engineer-agent/   Prompt engineering endpoint
│   │   ├── qwen-vl-review/          QwenVL review endpoint
│   │   ├── list-images/             List generated images
│   │   ├── init-project/            Initialize a pipeline run
│   │   └── process/                 Pipeline coordinator
│   └── [pipeline-routes]/        UI routes — see "Pipelines" below
├── nvidia/client/                NVIDIA-specific image-gen client
├── utils/                        Shared helpers
└── types/                        Shared TypeScript types

public/                           Generated content (gitignored)
generate-xml.mjs                  Standalone DaVinci XML generator (also called from /api/generate-davinci-xml)
```

---

## Pipelines

Each pipeline route is a separate page under `src/app/`:

| Route | Mode | Status |
|---|---|---|
| `/music-video-pipeline` | Beat-driven music video, BPM-synced shots | ✅ Works (up to images) |
| `/no-music-video-pipeline` | Narrated explainer / storytelling | ✅ Works (up to images) |
| `/universal-video-chat` | Conversational video editor | ✅ Works (up to images) |
| `/conversation-mode` | Iterative refinement loop | ✅ Works |
| `/test-script-to-images` | Quick storyboard from a script | ✅ Works |
| `/davinci-export` | Convert any pipeline run → Resolve XML | ✅ Works |
| `/test-music-analysis` | Standalone BPM / structure analyzer | ✅ Works |
| `/test-tts` | TTS playground | ✅ Works |
| `/test-runpod` | RunPod connectivity tester | ⚠️ Wan endpoint integration was the blocker |

---

## Quick start

```bash
# 1. Clone
git clone https://github.com/NamanVinayak/ai-multi-agent-storyboarder.git
cd ai-multi-agent-storyboarder

# 2. Install
yarn install

# 3. Configure environment
cp .env.example .env.local   # then fill in keys for whichever providers you want

# 4. Run dev server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) and pick a pipeline.

---

## Environment variables

You don't need all of these — only the ones for the providers you actually use.

```env
# LLMs (script intelligence)
OPENAI_API_KEY=
GEMINI_API_KEY=

# Image generation
LEONARDO_API_KEY=
FLUX_API_KEY=
COMFYUI_ENDPOINT=https://...
IDEOGRAM_API_KEY=
NVIDIA_API_KEY=

# Voice / TTS
HUME_API_KEY=

# Compute (for Wan video gen — currently unreliable)
RUNPOD_API_KEY=
RUNPOD_WAN_ENDPOINT=
```

---

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Yarn** for package management
- **Server-side API routes** for every AI provider (keys never reach the browser)
- **Google Gemini** + **OpenAI** for script intelligence
- **Flux / ComfyUI / Leonardo / Ideogram / NVIDIA** for image generation
- **Hume** + **Gemini TTS** for voice
- **Wan via RunPod** for video generation (intended, never reliable)
- **DaVinci Resolve XML** as the export format for human-edited final cuts

---

## Where to pick it up

If you want to finish this, here's where to start:

### To get end-to-end working video output

1. **Replace Wan/RunPod with a more reliable serverless image-to-video provider.** Candidates: Runway Gen-3, Luma, Kling, Pika, Hailuo. Each has a clean API; the integration would slot in next to `generate-wan-videos/`.
2. **Or finish the Wan/RunPod integration** by warming the endpoint with always-on workers (RunPod active workers, not serverless) — solves the cold-start problem at the cost of higher idle bills.
3. **Wire the pipeline coordinator** (`/api/process`) to call the chosen video endpoint per storyboard panel, then assemble the resulting clips into a timeline.

### To get a polished UX

1. **Drag-and-drop storyboard reorder** is partially wired but not finished — `src/app/test-script-to-images/` is the closest working version.
2. **Per-panel regeneration** is wired but error states need work.
3. **Cost telemetry per run** — every API route returns provider responses but nothing aggregates spend; a small middleware would solve it.

### To get more pipelines

The `src/app/[pipeline-name]/` pattern is easy to extend. Copy `no-music-video-pipeline/` and adapt for your use case (interview cuts, ad creative, podcast→storyboard, etc.).

---

## Why open-source it now?

Because the architecture is sound and the script→storyboard→image stack works end-to-end. Someone with a few weekends and a working video provider could turn this into a real product. The code's just sitting on a hard drive otherwise.

If you fork it and ship something interesting, I'd love to know.

---

## License

MIT — see [LICENSE](LICENSE). Fork, modify, ship — just don't sue me when the Wan endpoint times out.
