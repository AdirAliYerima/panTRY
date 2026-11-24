// speech.ts — raw WebSocket implementation for Gemini Live API
// Conversational Pantry assistant with humor + follow-ups.

type LiveTokenResponse = {
  token: string;
  model: string;
  voice: string;
};

const LIVE_WS_BASE =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";

const INTAKE_SYSTEM_PROMPT =
  "You are Pantry — a warm, witty, voice-only cooking sidekick. " +
  "Personality: a friend who happens to be a chef. Drop the occasional dry joke or playful aside, but stay concise (1–2 sentences per turn). " +
  "Job: gather enough context to plan 3 budget-fitting meals. Ask, in natural conversation:\n" +
  "  1) what they want to cook or vibe they're going for,\n" +
  "  2) their budget,\n" +
  "  3) any dietary restrictions or allergies,\n" +
  "  4) how much time / how many people,\n" +
  "  5) one preference (cuisine, mood, comfort vs. healthy).\n" +
  "Ask them ONE at a time, react warmly to their answer, then move on. " +
  "Don't lecture or list. Don't repeat info back unless asked. " +
  "Once you have a budget AND a clear request, output EXACTLY this single line and nothing else:\n" +
  'PANTRY_READY:{"budget":"$30","request":"short summary including diet/time/people/cuisine"}\n' +
  "Use real values. The 'request' field should be one descriptive sentence the meal planner can use.";

// === Token fetch ===

async function fetchLiveToken(): Promise<LiveTokenResponse> {
  const res = await fetch("/api/live-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || "Failed to fetch Live API token");
  }
  return (await res.json()) as LiveTokenResponse;
}

// === Shared AudioContext (pre-unlocked during user gesture) ===

let _sharedCtx: AudioContext | null = null;

export function primeAudio() {
  if (typeof window === "undefined") return;
  if (!_sharedCtx) _sharedCtx = new AudioContext({ sampleRate: 24000 });
  if (_sharedCtx.state === "suspended") void _sharedCtx.resume();
}

// === Global AI-speaking signal (for UI side animation) ===

type SpeakingListener = (speaking: boolean) => void;
const speakingListeners = new Set<SpeakingListener>();
let _isAiSpeaking = false;
let _speakingResetTimer: number | null = null;

function setSpeaking(next: boolean) {
  if (next === _isAiSpeaking) return;
  _isAiSpeaking = next;
  speakingListeners.forEach((cb) => { try { cb(next); } catch { /* ignore */ } });
}

function pingSpeaking(ms = 700) {
  setSpeaking(true);
  if (_speakingResetTimer) window.clearTimeout(_speakingResetTimer);
  _speakingResetTimer = window.setTimeout(() => { _speakingResetTimer = null; setSpeaking(false); }, ms);
}

export function subscribeToSpeaking(cb: SpeakingListener): () => void {
  speakingListeners.add(cb);
  cb(_isAiSpeaking);
  return () => { speakingListeners.delete(cb); };
}

// === PCM audio player (24 kHz output) ===

class AudioPcmPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources: Set<AudioBufferSourceNode> = new Set();

  async init() {
    if (this.audioContext) return;
    this.audioContext = _sharedCtx ?? new AudioContext({ sampleRate: 24000 });
  }

  async play(base64Audio: string) {
    await this.init();
    if (!this.audioContext) return;
    if (this.audioContext.state === "suspended") await this.audioContext.resume();
    const binary = atob(base64Audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pcm = new Int16Array(bytes.buffer);
    const f32 = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) f32[i] = pcm[i] / 32768;
    const buf = this.audioContext.createBuffer(1, f32.length, 24000);
    buf.getChannelData(0).set(f32);
    const src = this.audioContext.createBufferSource();
    src.buffer = buf;
    src.connect(this.audioContext.destination);
    const now = this.audioContext.currentTime;
    if (this.nextStartTime < now) this.nextStartTime = now;
    src.start(this.nextStartTime);
    this.nextStartTime += buf.duration;
    this.sources.add(src);
    src.onended = () => { this.sources.delete(src); };
    pingSpeaking(Math.max(700, buf.duration * 1000 + 300));
  }

  /** Immediately silence any still-scheduled audio. */
  stopAll() {
    for (const s of this.sources) {
      try { s.stop(); } catch { /* ignore */ }
      try { s.disconnect(); } catch { /* ignore */ }
    }
    this.sources.clear();
    this.nextStartTime = 0;
  }

  async destroy() {
    this.stopAll();
    if (!this.audioContext) return;
    // Never close the shared context — other sessions reuse it. Just detach.
    if (this.audioContext !== _sharedCtx) {
      try { await this.audioContext.close(); } catch { /* ignore */ }
    }
    this.audioContext = null;
    setSpeaking(false);
  }
}

// === One-shot TTS speak() ===

let activeSpeakCancel: (() => void) | null = null;

async function speakWithLiveApi(text: string, opts?: { onend?: () => void }) {
  const tokenData = await fetchLiveToken();
  const player = new AudioPcmPlayer();
  let settled = false;
  let closeTimer: number | null = null;

  const settle = () => {
    if (settled) return;
    settled = true;
    if (closeTimer) window.clearTimeout(closeTimer);
    void player.destroy();
    opts?.onend?.();
  };

  const ws = new WebSocket(`${LIVE_WS_BASE}?key=${tokenData.token}`);

  activeSpeakCancel = () => {
    settled = true;
    if (closeTimer) window.clearTimeout(closeTimer);
    void player.destroy();
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
  };

  ws.onopen = () => {
    ws.send(JSON.stringify({
      setup: {
        model: `models/${tokenData.model}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: tokenData.voice } },
          },
        },
        systemInstruction: { parts: [{ text: "You are Pantry. Speak the user's message warmly and concisely." }] },
      },
    }));
  };

  ws.onmessage = async (event) => {
    if (settled) return;
    const raw = event.data instanceof Blob ? await event.data.text() : (event.data as string);
    const data = JSON.parse(raw) as Record<string, unknown>;

    if (data.setupComplete != null) {
      ws.send(JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text }] }],
          turnComplete: true,
        },
      }));
    }

    const sc = data.serverContent as { modelTurn?: { parts?: Array<{ inlineData?: { data?: string } }> }; turnComplete?: boolean; generationComplete?: boolean } | undefined;
    if (sc?.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        if (part.inlineData?.data) void player.play(part.inlineData.data);
      }
    }
    if (sc?.turnComplete || sc?.generationComplete) {
      if (closeTimer) window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => ws.close(), 800);
    }
  };

  ws.onclose = () => settle();
  ws.onerror = () => settle();

  window.setTimeout(() => {
    if (!settled && ws.readyState !== WebSocket.CLOSED) ws.close();
  }, 15_000);
}

export function speak(text: string, opts?: { onend?: () => void }) {
  if (typeof window === "undefined") { opts?.onend?.(); return; }
  // Mutually exclusive with any live conversation — otherwise voices overlap.
  stopConversation();
  activeSpeakCancel?.();
  activeSpeakCancel = null;
  void speakWithLiveApi(text, opts).catch(() => opts?.onend?.());
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  activeSpeakCancel?.();
  activeSpeakCancel = null;
  setSpeaking(false);
}

// === Bidirectional conversation ===

export type ConversationCallbacks = {
  onReady?: (budget: string, request: string) => void;
  onError?: (msg: string) => void;
  onTranscript?: (text: string) => void;
  systemPrompt?: string;
  initialUserMessage?: string;
};

type ActiveConvo = {
  stop: () => void;
  sendText: (text: string) => void;
};
let activeConvo: ActiveConvo | null = null;

export async function startConversation(callbacks: ConversationCallbacks): Promise<void> {
  stopConversation();
  // Make sure any in-flight one-shot speak() is silenced first.
  activeSpeakCancel?.();
  activeSpeakCancel = null;
  setSpeaking(false);

  const tokenData = await fetchLiveToken();
  const player = new AudioPcmPlayer();

  let micStream: MediaStream | null = null;
  let micCtx: AudioContext | null = null;
  let processor: ScriptProcessorNode | null = null;
  let srcNode: MediaStreamAudioSourceNode | null = null;
  let closed = false;

  const ws = new WebSocket(`${LIVE_WS_BASE}?key=${tokenData.token}`);

  const doStop = () => {
    if (closed) return;
    closed = true;
    try { processor?.disconnect(); } catch { /* ignore */ }
    try { srcNode?.disconnect(); } catch { /* ignore */ }
    processor = null;
    srcNode = null;
    micStream?.getTracks().forEach((t) => t.stop());
    micStream = null;
    if (micCtx) { void micCtx.close(); micCtx = null; }
    void player.destroy();
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) ws.close();
    activeConvo = null;
  };

  const sendText = (text: string) => {
    if (closed || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({
      clientContent: {
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      },
    }));
  };

  activeConvo = { stop: doStop, sendText };

  const checkForReady = (text: string) => {
    const m = text.match(/PANTRY_READY:(\{.+?\})/);
    if (!m) return;
    try {
      const d = JSON.parse(m[1]) as { budget?: string; request?: string };
      if (d.budget && d.request) callbacks.onReady?.(d.budget, d.request);
    } catch { /* ignore */ }
  };

  ws.onopen = () => {
    ws.send(JSON.stringify({
      setup: {
        model: `models/${tokenData.model}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: tokenData.voice } },
          },
        },
        outputAudioTranscription: {},
        inputAudioTranscription: {},
        systemInstruction: {
          parts: [{ text: callbacks.systemPrompt ?? INTAKE_SYSTEM_PROMPT }],
        },
      },
    }));
  };

  ws.onmessage = async (event) => {
    if (closed) return;
    const raw = event.data instanceof Blob ? await event.data.text() : (event.data as string);
    const data = JSON.parse(raw) as Record<string, unknown>;

    if (data.setupComplete != null) {
      ws.send(JSON.stringify({
        clientContent: {
          turns: [{ role: "user", parts: [{ text: callbacks.initialUserMessage ?? "hi" }] }],
          turnComplete: true,
        },
      }));

      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micCtx = new AudioContext({ sampleRate: 16000 });
        srcNode = micCtx.createMediaStreamSource(micStream);
        processor = micCtx.createScriptProcessor(2048, 1, 1);
        const silencer = micCtx.createGain();
        silencer.gain.value = 0;

        processor.onaudioprocess = (e) => {
          if (closed || ws.readyState !== WebSocket.OPEN) return;
          const f32 = e.inputBuffer.getChannelData(0);
          const i16 = new Int16Array(f32.length);
          for (let i = 0; i < f32.length; i++) {
            i16[i] = Math.max(-32768, Math.min(32767, f32[i] * 32768));
          }
          const bytes = new Uint8Array(i16.buffer);
          let bin = "";
          for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
          ws.send(JSON.stringify({
            realtimeInput: {
              audio: { data: btoa(bin), mimeType: "audio/pcm;rate=16000" },
            },
          }));
        };

        srcNode.connect(processor);
        processor.connect(silencer);
        silencer.connect(micCtx.destination);
      } catch {
        console.warn("Mic unavailable — Pantry will speak but cannot hear voice input.");
      }
    }

    type Part = { inlineData?: { data?: string }; text?: string };
    type ServerContent = {
      modelTurn?: { parts?: Part[] };
      outputTranscription?: { text?: string };
    };
    const sc = data.serverContent as ServerContent | undefined;

    if (sc?.modelTurn?.parts) {
      for (const part of sc.modelTurn.parts) {
        if (part.inlineData?.data) void player.play(part.inlineData.data);
        if (part.text) { checkForReady(part.text); callbacks.onTranscript?.(part.text); }
      }
    }
    if (sc?.outputTranscription?.text) {
      checkForReady(sc.outputTranscription.text);
      callbacks.onTranscript?.(sc.outputTranscription.text);
    }
  };

  ws.onerror = () => {
    callbacks.onError?.("Voice connection error. Please try again.");
  };
  ws.onclose = () => { if (!closed) doStop(); };
}

export function stopConversation(): void {
  if (!activeConvo) return;
  activeConvo.stop();
  activeConvo = null;
}

export function sendUserText(text: string): void {
  activeConvo?.sendText(text);
}

/** Convenience: start a follow-up Q&A conversation with meal context. */
export function startFollowUp(opts: {
  mealsContext: string;
  onError?: (msg: string) => void;
  onTranscript?: (t: string) => void;
}): Promise<void> {
  return startConversation({
    onError: opts.onError,
    onTranscript: opts.onTranscript,
    systemPrompt:
      "You are Pantry, a warm, witty voice cooking companion. " +
      "The user has just been shown 3 meal options:\n" +
      opts.mealsContext +
      "\nAnswer their follow-up questions about these meals — ingredients, substitutions, nutrition, cooking tips, " +
      "or help them decide. Keep replies short (1–2 sentences), friendly, and a little playful. " +
      "Do not output PANTRY_READY. Just chat.",
    initialUserMessage: "I might have some questions about these meals.",
  });
}

/** Voice confirm: AI asks the user to confirm their request, listens for yes/no,
 *  and emits a PANTRY_CONFIRM:YES or PANTRY_CONFIRM:NO marker on the transcript. */
export function startConfirm(opts: {
  request: string;
  budget: string;
  onYes: () => void;
  onNo: () => void;
  onError?: (msg: string) => void;
  onTranscript?: (t: string) => void;
}): Promise<void> {
  let fired = false;
  return startConversation({
    onError: opts.onError,
    onTranscript: (t) => {
      opts.onTranscript?.(t);
      if (fired) return;
      if (/PANTRY_CONFIRM\s*:\s*YES/i.test(t)) {
        fired = true;
        opts.onYes();
      } else if (/PANTRY_CONFIRM\s*:\s*NO/i.test(t)) {
        fired = true;
        opts.onNo();
      }
    },
    systemPrompt:
      "You are Pantry, a warm, witty voice cooking companion confirming the user's request. " +
      `The user said they want: "${opts.request}" for ${opts.budget}. ` +
      "The app has ALREADY spoken the confirmation question out loud to the user — do NOT repeat it. " +
      "Stay completely silent and just listen until the user responds.\n" +
      "  • The instant you detect an affirmative (yes, yeah, yep, sure, sounds good, perfect, let's do it, go for it, do it, please), " +
      "output EXACTLY this on its own line and nothing else: PANTRY_CONFIRM:YES — then say one short line like 'Perfect, curating now.'\n" +
      "  • If they say no / change / different / actually / wait, output EXACTLY: PANTRY_CONFIRM:NO — " +
      "then say one short line like 'No problem, tell me what to change.'\n" +
      "If the user is unclear, ask a single short clarifying question. Never re-introduce or re-ask the original confirmation. Do not output PANTRY_READY.",
    initialUserMessage: "(silent — just listen for the user's yes or no)",
  });
}

/** Continuous voice flow that walks the user through 3 meals and lets them pick by voice.
 *  Emits PANTRY_FOCUS:<1|2|3> when starting to talk about a meal (UI uses it to highlight),
 *  and PANTRY_PICK:<1|2|3> once the user has chosen. */
export function startMealGuide(opts: {
  mealsContext: string;
  userRequest: string;
  onPick: (index: number) => void;
  onFocus?: (index: number) => void;
  onError?: (msg: string) => void;
  onTranscript?: (t: string) => void;
}): Promise<void> {
  const handleTranscript = (t: string) => {
    opts.onTranscript?.(t);
    const f = t.match(/PANTRY_FOCUS\s*:\s*([123])/i);
    if (f) {
      const idx = parseInt(f[1], 10) - 1;
      if (idx >= 0 && idx <= 2) opts.onFocus?.(idx);
    }
    const m = t.match(/PANTRY_PICK\s*:\s*([123])/i);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx <= 2) opts.onPick(idx);
    }
  };
  return startConversation({
    onError: opts.onError,
    onTranscript: handleTranscript,
    systemPrompt:
      "You are Pantry, a warm, witty voice cooking sidekick. " +
      `The user originally asked for: "${opts.userRequest}". ` +
      "You curated 3 meals tailored to that request (indexed 1, 2, 3):\n" +
      opts.mealsContext +
      "\n\nVoice style: elegant, flowing, conversational. NEVER say robotic things like 'Meal one,' 'Number two,' or 'Option three.' " +
      "Speak about each dish by NAME, weaving in a one-line story about flavor, texture, and how it lands for what they asked. " +
      "Between dishes, use natural connective tissue ('Next up...', 'Or if you're craving something brighter...', 'And finally...'). " +
      "Keep each dish to ~2 short sentences total \u2014 one for character, one for what makes it special.\n\n" +
      "BEFORE you start speaking about a dish, output EXACTLY one marker on its own line: PANTRY_FOCUS:1 (or 2 or 3) \u2014 " +
      "this tells the UI which card to highlight. Do this for the dish you're about to describe.\n\n" +
      "Your flow:\n" +
      "  1. Open with one warm line introducing the three options as a set.\n" +
      "  2. PANTRY_FOCUS:1 \u2014 describe dish 1 elegantly.\n" +
      "  3. PANTRY_FOCUS:2 \u2014 describe dish 2.\n" +
      "  4. PANTRY_FOCUS:3 \u2014 describe dish 3.\n" +
      "  5. Ask, naturally, which one calls to them.\n" +
      "  6. If they hesitate, give a quick recommendation rooted in their original ask.\n" +
      "  7. The instant they pick (by number or name), output EXACTLY on its own line: PANTRY_PICK:1 (or 2/3). " +
      "Then a short warm confirmation.\n\n" +
      "Never re-read marker lines aloud; they are silent UI cues. Do not output PANTRY_READY.",
    initialUserMessage: "Walk me through the three options.",
  });
}

/** Voice confirm on the review screen \u2014 AI says 'cool choice, want to roll with it?'
 *  and emits REVIEW_CONFIRM:YES or REVIEW_CONFIRM:NO. */
export function startReviewConfirm(opts: {
  mealName: string;
  mealSummary: string;
  onYes: () => void;
  onNo: () => void;
  onError?: (msg: string) => void;
  onTranscript?: (t: string) => void;
}): Promise<void> {
  let fired = false;
  return startConversation({
    onError: opts.onError,
    onTranscript: (t) => {
      opts.onTranscript?.(t);
      if (fired) return;
      if (/REVIEW_CONFIRM\s*:\s*YES/i.test(t)) { fired = true; opts.onYes(); }
      else if (/REVIEW_CONFIRM\s*:\s*NO/i.test(t)) { fired = true; opts.onNo(); }
    },
    systemPrompt:
      "You are Pantry, a warm, witty voice cooking companion. " +
      `The user just picked "${opts.mealName}". Quick context: ${opts.mealSummary}. ` +
      "Your job:\n" +
      "  1. Open with ONE elegant line celebrating their pick \u2014 mention something specific about it (a flavor, a texture, why it's a great call). " +
      "End by gently confirming: 'Want to roll with this?' or similar.\n" +
      "  2. Listen for their answer.\n" +
      "  3. If they say yes / yeah / let's do it / sure / sounds good / perfect \u2014 " +
      "output EXACTLY on its own line: REVIEW_CONFIRM:YES. Then say one short line like 'Beautiful \u2014 let's check the pantry.'\n" +
      "  4. If they say no / change / different / wait / actually \u2014 output EXACTLY: REVIEW_CONFIRM:NO. " +
      "Then say one short line like 'No worries, back to the options.'\n" +
      "Keep it brief and graceful. Do not output PANTRY_READY, PANTRY_PICK, or PANTRY_FOCUS.",
    initialUserMessage: "Confirm my pick.",
  });
}

/** Voice-led pantry check. Walks ingredient-by-ingredient asking 'do you have X?'.
 *  After each answer, emits HAVE:<name> or NEED:<name>. When done, emits CHECK_DONE. */
export function startPantryCheck(opts: {
  mealName: string;
  ingredients: { name: string; quantity: string }[];
  onAnswer: (ingredient: string, have: boolean) => void;
  onDone: () => void;
  onError?: (msg: string) => void;
  onTranscript?: (t: string) => void;
}): Promise<void> {
  const seen = new Set<string>();
  let done = false;
  const list = opts.ingredients
    .map((i, idx) => `  ${idx + 1}. ${i.name} (${i.quantity})`)
    .join("\n");

  return startConversation({
    onError: opts.onError,
    onTranscript: (t) => {
      opts.onTranscript?.(t);
      const matches = t.matchAll(/(HAVE|NEED)\s*:\s*([^\n\r]+)/gi);
      for (const m of matches) {
        const have = m[1].toUpperCase() === "HAVE";
        const name = m[2].trim().replace(/[.\s]+$/, "");
        const key = `${have}|${name.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        opts.onAnswer(name, have);
      }
      if (!done && /CHECK_DONE/i.test(t)) { done = true; opts.onDone(); }
    },
    systemPrompt:
      "You are Pantry, a warm, witty voice cooking companion doing a pantry check. " +
      `The user picked "${opts.mealName}". The ingredients to check, in order, are:\n` +
      list +
      "\n\nYour job:\n" +
      "  1. Open with one warm line like 'Quick pantry check \u2014 I'll run through the list with you.'\n" +
      "  2. Then ask, one at a time, in the order listed: 'Do you have <ingredient>?' Wait for the user's answer before moving on. " +
      "Be playful and natural \u2014 not robotic. Vary phrasing ('How about...', 'Got any...', 'Any <X> in the pantry?').\n" +
      "  3. After EACH answer, output EXACTLY one marker on its own line:\n" +
      "       HAVE:<ingredient name>   if they have it (yes/yeah/got it/sure/of course)\n" +
      "       NEED:<ingredient name>   if they don't (no/nope/out/none/need to buy)\n" +
      "     The <ingredient name> must match the list above EXACTLY (same spelling). " +
      "Then briefly acknowledge ('Nice.', 'No worries.', 'Got it.') and move to the next.\n" +
      "  4. After the LAST ingredient is answered, output EXACTLY on its own line: CHECK_DONE. " +
      "Then say one warm line like 'All done \u2014 I'll get your grocery list ready.'\n" +
      "Never re-read the markers aloud. Do not output PANTRY_READY, PANTRY_PICK, PANTRY_FOCUS, or REVIEW_CONFIRM.",
    initialUserMessage: "Let's check my pantry.",
  });
}
