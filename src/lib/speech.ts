// Minimal SpeechRecognition wrappers — Web Speech API
type SR = {
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: any) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: any) => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
};

export function getRecognition(): SR | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!Ctor) return null;
  const r: SR = new Ctor();
  r.continuous = false;
  r.interimResults = true;
  r.lang = "en-US";
  return r;
}

export function speak(text: string, opts?: { onend?: () => void }) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    opts?.onend?.();
    return;
  }
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.02;
    u.pitch = 1.0;
    u.onend = () => opts?.onend?.();
    window.speechSynthesis.speak(u);
  } catch {
    opts?.onend?.();
  }
}

export function stopSpeaking() {
  if (typeof window === "undefined") return;
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}
