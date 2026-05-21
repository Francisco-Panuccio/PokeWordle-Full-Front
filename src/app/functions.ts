const IMG_PRELOAD_VERSION = "v1";
const AUD_PRELOAD_VERSION = "v1";
const AUDIO_CACHE = new Map<string, HTMLAudioElement>();

function toAbs(url: string): string {
  if (!url) return "";
  return url.startsWith("/") ? url : `/${url.replace(/^\/+/, "")}`;
}

//Images
export function preloadImagesOnce(imageUrls: string[], timeout = 10000): Promise<void> {
  const abs = [...new Set(imageUrls.map(toAbs).filter(Boolean))];
  if (!abs.length) return Promise.resolve();

  const key = `imgPreloaded:${IMG_PRELOAD_VERSION}:${abs.slice().sort().join("|")}`;
  const loaded: string[] = JSON.parse(sessionStorage.getItem(key) || "[]");
  const remaining = abs.filter(u => !loaded.includes(u));
  if (!remaining.length) return Promise.resolve();

  const loadOne = (src: string): Promise<string | null> =>
    new Promise(resolve => {
      const img = new Image();
      let done = false;
      const finish = (ok: boolean) => {
        if (done) return;
        done = true;
        ok ? resolve(src) : resolve(null);
      };
      img.onload = () => finish(true);
      img.onerror = () => finish(false);
      img.src = src;
      setTimeout(() => finish(false), timeout);
    });

  return Promise.all(remaining.map(loadOne)).then(results => {
    const success = results.filter((u): u is string => !!u);
    if (success.length) {
      sessionStorage.setItem(key, JSON.stringify([...loaded, ...success]));
    }
  });
}

//Sounds
export async function preloadAudiosOnce(audioUrls: string[], timeout = 15000): Promise<HTMLAudioElement[]> {
  const abs = [...new Set(audioUrls.map(toAbs).filter(Boolean))];
  if (!abs.length) return [];

  const key = `audPreloaded:${AUD_PRELOAD_VERSION}:${abs.slice().sort().join("|")}`;
  const loaded: string[] = JSON.parse(sessionStorage.getItem(key) || "[]");
  const remaining = abs.filter(u => !loaded.includes(u));

  const loadOne = (src: string) => new Promise<HTMLAudioElement | null>((resolve) => {
    let audio = AUDIO_CACHE.get(src);
    if (!audio) {
      audio = new Audio();
      audio.src = src;
      audio.preload = "auto";
      AUDIO_CACHE.set(src, audio);
    }

    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      audio!.removeEventListener("canplaythrough", onReady);
      audio!.removeEventListener("loadeddata", onReady);
      audio!.removeEventListener("error", onError);
      resolve(ok ? audio! : null);
    };
    const onReady = () => finish(true);
    const onError = () => finish(false);

    audio.addEventListener("canplaythrough", onReady, { once: true });
    audio.addEventListener("loadeddata", onReady, { once: true });
    audio.addEventListener("error", onError, { once: true });

    try { audio.load(); } catch { }
    setTimeout(() => finish(false), timeout);
  });

  if (remaining.length) {
    const results = await Promise.all(remaining.map(loadOne));
    const success = remaining.filter((_, i) => !!results[i]);
    if (success.length) {
      sessionStorage.setItem(key, JSON.stringify([...loaded, ...success]));
    }
  }

  return audioUrls.map(u => {
    const src = toAbs(u);
    let a = AUDIO_CACHE.get(src);
    if (!a) {
      a = new Audio();
      a.src = src;
      a.preload = "auto";
      AUDIO_CACHE.set(src, a);
    }
    return a;
  });
}

export function playAudio(audioElements: HTMLAudioElement[], index: number) {
  audioElements.forEach((audio, i) => {
    if (i !== index) {
      audio.pause();
      audio.currentTime = 0;
    }
  });

  const audio = audioElements[index];
  if (!audio) return;

  try {
    audio.volume = 0.5;
    audio.currentTime = 0;
    audio.play().catch((e) => {
      console.error("Audio Play Interrupted: ", e.message);
    });
  } catch (e) {
    console.error("Audio Playback Error: ", e);
  }
}

//Wordle
export function isValidLetter(value: string, n: number): boolean {
  switch (n) {
    case 1:
      return /^[A-ZÑ]$/.test(value);
    case 2:
      return /^[a-zñ]$/i.test(value);
    default:
      console.error("Error with the function isValidLetter");
      return false;
  }
}