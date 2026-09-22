export type NavigationState = {
  phase: 'idle' | 'loading' | 'seeking' | 'ready' | 'blocked' | 'error';
  target: number;
  percent: number | null;
};

// The published media endpoint ignores byte-range requests. A complete Blob
// gives the browser a genuinely seekable source, including on a cold visit.
// Keep it for this page's lifetime; all chapter buttons share one download.
export function createVideoNavigator(
  player: HTMLVideoElement,
  source: string,
  onState: (state: NavigationState) => void,
) {
  let disposed = false;
  let target = 0;
  let revision = 0;
  let percent: number | null = null;
  let blobUrl: string | null = null;
  let loading: Promise<void> | null = null;
  let controller: AbortController | null = null;
  let pendingSeek: number | null = null;
  let nativeStart = false;
  let mediaTimer: ReturnType<typeof setTimeout> | undefined;

  const report = (phase: NavigationState['phase']) => {
    if (!disposed) onState({ phase, target, percent });
  };
  const clearMediaTimer = () => {
    clearTimeout(mediaTimer);
    mediaTimer = undefined;
  };
  const fail = () => {
    clearMediaTimer();
    pendingSeek = null;
    report('error');
  };
  const play = () => {
    const request = revision;
    // Call directly so the explicit resume button retains user activation.
    void player.play().then(() => {
      if (request === revision) report('ready');
    }).catch((error: unknown) => {
      if (disposed || request !== revision) return;
      report(error instanceof Error && error.name === 'NotSupportedError' ? 'error' : 'blocked');
    });
  };
  const finishSeek = () => {
    if (pendingSeek === null || player.seeking) return;
    // A setter returning the requested value is not evidence of a seek.
    // Only a completed seek at the requested location may start playback.
    if (Math.abs(player.currentTime - pendingSeek) > 0.1) {
      fail();
      return;
    }
    clearMediaTimer();
    pendingSeek = null;
    play();
  };
  const seek = () => {
    if (disposed || (!blobUrl && !nativeStart) || player.readyState < 1) return;
    nativeStart = false;
    clearMediaTimer();
    target = Math.min(target, Math.max(0, player.duration - 0.01));
    pendingSeek = target;
    report('seeking');
    if (!player.seeking && Math.abs(player.currentTime - target) < 0.04) {
      finishSeek();
      return;
    }
    mediaTimer = setTimeout(fail, 15000);
    try { player.currentTime = target; } catch { fail(); }
  };

  async function loadCompleteVideo() {
    const downloadController = new AbortController();
    controller = downloadController;
    const downloadTimer = setTimeout(() => downloadController.abort(), 90000);
    try {
      const response = await fetch(source, { signal: downloadController.signal, credentials: 'same-origin' });
      if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
        throw new Error('Video download failed');
      }
      let blob: Blob;
      if (response.body) {
        const reader = response.body.getReader();
        const total = Number(response.headers.get('content-length'));
        const parts: BlobPart[] = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(new Uint8Array(value));
          received += value.byteLength;
          const nextPercent = total > 0 ? Math.min(99, Math.floor(received / total * 100)) : null;
          if (nextPercent !== percent) {
            percent = nextPercent;
            report('loading');
          }
        }
        blob = new Blob(parts, { type: 'video/mp4' });
      } else {
        blob = await response.blob();
      }
      if (disposed || downloadController.signal.aborted) return;
      if (!blob.size) throw new Error('Empty video');
      blobUrl = URL.createObjectURL(blob);
      percent = 100;
      report('seeking');
      mediaTimer = setTimeout(fail, 20000);
      player.src = blobUrl;
      player.load();
      // The registered loadedmetadata listener applies the latest target.
    } catch {
      if (!disposed) fail();
    } finally {
      clearTimeout(downloadTimer);
      if (controller === downloadController) controller = null;
      loading = null;
    }
  }

  function jumpTo(seconds: number) {
    if (disposed || !Number.isFinite(seconds)) return;
    target = Math.max(0, seconds);
    revision++;
    pendingSeek = null;
    clearMediaTimer();
    player.pause();
    // Starting at zero needs no random access or extra full-file download.
    // Leave an in-flight chapter download alone so its latest target wins.
    if (!blobUrl && !loading && target === 0) {
      nativeStart = true;
      if (player.error) player.load();
      if (player.readyState >= 1) seek();
      else {
        report('seeking');
        mediaTimer = setTimeout(fail, 20000);
      }
      return;
    }
    nativeStart = false;
    if (blobUrl) {
      if (player.readyState >= 1) seek();
      else {
        report('seeking');
        mediaTimer = setTimeout(fail, 20000);
        if (player.error) player.load();
      }
      return;
    }
    report('loading');
    if (!loading) {
      percent = null;
      loading = loadCompleteVideo();
    }
  }

  player.addEventListener('loadedmetadata', seek);
  player.addEventListener('seeked', finishSeek);
  const onError = () => { if (blobUrl || nativeStart) fail(); };
  player.addEventListener('error', onError);
  return {
    jumpTo,
    resume: play,
    dispose() {
      disposed = true;
      revision++;
      clearMediaTimer();
      controller?.abort();
      player.removeEventListener('loadedmetadata', seek);
      player.removeEventListener('seeked', finishSeek);
      player.removeEventListener('error', onError);
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    },
  };
}
