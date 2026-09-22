const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// The live media endpoint returns 200/full-file even for Range: bytes=0-1.
// Model the browser boundary that clamps seeks while that source is loading.
// All navigation and UI callbacks below come from the real page/modules.
class MediaWithoutRanges extends EventTarget {
  src = '/media/training-v6-web.mp4';
  readyState = 4;
  duration = 163.925;
  paused = true;
  seeking = false;
  error = null;
  time = 0;
  blockPlayback = false;
  get currentSrc() { return this.src; }
  get currentTime() { return this.time; }
  set currentTime(value) {
    this.time = value;
    this.seeking = true;
    queueMicrotask(() => {
      if (!this.src.startsWith('blob:')) this.time = 0;
      this.seeking = false;
      this.dispatchEvent(new Event('seeked'));
      this.dispatchEvent(new Event('timeupdate'));
    });
  }
  pause() { this.paused = true; }
  async play() {
    if (this.blockPlayback) throw new DOMException('User gesture required', 'NotAllowedError');
    this.paused = false;
    this.dispatchEvent(new Event('playing'));
  }
  load() {
    this.readyState = 0;
    this.time = 0;
    queueMicrotask(() => {
      this.readyState = 4;
      this.dispatchEvent(new Event('loadedmetadata'));
    });
  }
  getBoundingClientRect() { return { top: -300, bottom: -100 }; }
  scrollIntoView() { this.scrolled = true; }
}

const textOf = (node) => node == null || typeof node === 'boolean' ? '' :
  typeof node !== 'object' ? String(node) : Array.isArray(node) ? node.map(textOf).join('') : textOf(node.props?.children);
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  if (predicate(node)) return node;
  return find(node.props?.children, predicate);
}

function fixture(t, fetchImpl = async () => new Response(new Uint8Array(32), { headers: { 'Content-Type': 'video/mp4', 'Content-Length': '32' } }), { deferEffects = false } = {}) {
  const video = new MediaWithoutRanges();
  const states = [], refs = [], effects = [], cleanups = [], cache = new Map();
  let si = 0, ri = 0, ei = 0, requests = 0, root;
  const hooks = {
    useState(initial) {
      const i = si++;
      if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial;
      return [states[i], (value) => { states[i] = typeof value === 'function' ? value(states[i]) : value; }];
    },
    useRef(initial) { const i = ri++; return refs[i] ??= { current: i === 0 ? video : initial }; },
    useMemo(fn) { return fn(); },
    useCallback(fn) { return fn; },
    useEffect(fn) { const i = ei++; if (!(i in effects)) { effects[i] = fn; if (!deferEffects) cleanups.push(fn()); } },
  };
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    vm.runInNewContext(`(function(require,module,exports){${js}\n})`, {
      fetch: (...args) => { requests++; return fetchImpl(...args); },
      URL, Blob, Response, AbortController, DOMException, setTimeout, clearTimeout,
      window: { innerHeight: 800, matchMedia: () => ({ matches: false }) },
      console,
    })((name) => name === 'react' ? hooks : name.startsWith('.') ? load(path.resolve(path.dirname(filename), name + (path.extname(name) ? '' : '.ts'))) : require(name), module, module.exports);
    return module.exports;
  }
  const Home = load(path.resolve(__dirname, '../app/page.tsx')).default;
  function render() { si = ri = ei = 0; root = Home(); return root; }
  render();
  for (const [event, prop] of [['timeupdate', 'onTimeUpdate'], ['loadedmetadata', 'onLoadedMetadata']]) {
    video.addEventListener(event, () => find(root, (node) => node.type === 'video')?.props[prop]?.({ currentTarget: video }));
  }
  t.after(() => cleanups.forEach((fn) => fn?.()));
  return {
    video,
    get requests() { return requests; },
    click(name) {
      const button = find(render(), (node) => node.type === 'button' && textOf(node) === name);
      assert.ok(button, `Button exists: ${name}`);
      assert.ok(!button.props.disabled, `Button is enabled: ${name}`);
      button.props.onClick();
    },
    button(name) { return find(render(), (node) => node.type === 'button' && textOf(node) === name); },
    mediaEvent(prop) { find(render(), (node) => node.type === 'video').props[prop]?.({ currentTarget: video }); },
    text() { return textOf(render()); },
    nowPlaying() { return textOf(find(render(), (node) => node.props?.className === 'now-playing')); },
    dispose() { cleanups.forEach((fn) => fn?.()); },
  };
}
const settled = () => new Promise((resolve) => setImmediate(resolve));

test('from-start plays directly without waiting for a second full download', async (t) => {
  const f = fixture(t);
  f.click('從頭播放');
  await settled();
  assert.equal(f.requests, 0);
  assert.equal(f.video.paused, false);
});

test('native buffering and failures have visible recovery without chapter navigation', async (t) => {
  const f = fixture(t);
  f.mediaEvent('onWaiting');
  assert.match(f.text(), /緩衝/);
  f.mediaEvent('onPlaying');
  assert.doesNotMatch(f.text(), /正在緩衝/);
  f.mediaEvent('onError');
  assert.ok(f.button('重新載入影片'));
  f.click('重新載入影片');
  await settled();
  assert.equal(f.video.paused, false);
});

test('fullscreen rejection provides a usable alternative', async (t) => {
  const f = fixture(t);
  f.video.requestFullscreen = async () => { throw new DOMException('Denied', 'NotAllowedError'); };
  f.click('全螢幕觀看');
  await settled();
  assert.match(f.text(), /播放器內建/);
});

test('chapter controls show a loading state until their handlers are mounted', (t) => {
  const f = fixture(t, undefined, { deferEffects: true });
  assert.equal(f.button('步驟 5').props.disabled, true);
  assert.equal(f.button('02:355.6乘場門').props.disabled, true);
  assert.match(f.text(), /啟用/);
});

test('step 5 seeks the actual media even when the endpoint ignores Range', async (t) => {
  const f = fixture(t);
  f.click('步驟 5');
  await settled();
  assert.equal(f.video.currentTime, 59.4583);
  assert.equal(f.video.paused, false);
  f.click('從頭播放');
  await settled();
  assert.equal(f.video.currentTime, 0);
  assert.equal(f.video.paused, false);
  assert.equal(f.requests, 1, 'reuse the same complete video after the first jump');
});

test('rapid clicks during loading land on the latest requested chapter', async (t) => {
  let finish;
  const f = fixture(t, () => new Promise((resolve) => { finish = resolve; }));
  f.click('步驟 4');
  f.click('步驟 5');
  f.click('02:355.6乘場門');
  assert.match(f.text(), /載入/);
  assert.equal(f.video.currentTime, 0, 'do not display an unconfirmed seek as playback');
  assert.equal(typeof finish, 'function', 'begin loading the complete movie');
  finish(new Response(new Uint8Array(32), { headers: { 'Content-Type': 'video/mp4' } }));
  await settled();
  assert.equal(f.video.currentTime, 155.375);
  assert.equal(f.requests, 1);
});

test('a failed load is visible and the same chapter can be retried', async (t) => {
  let fail = true;
  const f = fixture(t, async () => fail ? new Response('unavailable', { status: 503 }) : new Response(new Uint8Array(32), { headers: { 'Content-Type': 'video/mp4' } }));
  f.click('步驟 5');
  await settled();
  assert.match(f.text(), /失敗/);
  fail = false;
  f.click('重試跳轉');
  await settled();
  assert.equal(f.video.currentTime, 59.4583);
});

test('autoplay rejection keeps the selected time and offers a visible play action', async (t) => {
  const f = fixture(t);
  f.video.blockPlayback = true;
  f.click('步驟 5');
  await settled();
  assert.equal(f.video.currentTime, 59.4583);
  assert.match(f.text(), /繼續播放/);
  f.video.blockPlayback = false;
  f.click('繼續播放');
  await settled();
  assert.equal(f.video.paused, false);
});

test('cold metadata and leaving during a download do not start an old request', async (t) => {
  let finish;
  const f = fixture(t, () => new Promise((resolve) => { finish = resolve; }));
  f.video.readyState = 0;
  f.click('步驟 5');
  assert.equal(typeof finish, 'function', 'load even before original metadata is ready');
  f.dispose();
  finish(new Response(new Uint8Array(32), { headers: { 'Content-Type': 'video/mp4' } }));
  await settled();
  assert.equal(f.video.paused, true);
  assert.ok(!f.video.src.startsWith('blob:'));
});

test('sub-frame timestamp rounding keeps the chapter label on the selected scene', (t) => {
  const f = fixture(t);
  f.video.time = 65.458299;
  f.video.dispatchEvent(new Event('timeupdate'));
  assert.match(f.nowPlaying(), /ECSW/);
});
