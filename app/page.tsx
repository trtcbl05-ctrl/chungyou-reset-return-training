'use client';

import {
  Captions,
  ChevronRight,
  Clock3,
  Download,
  MapPin,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createVideoNavigator, type NavigationState } from './video-navigator';

type Chapter = {
  at: number;
  group: '開場' | '步驟 4｜重置' | '步驟 5｜緩速歸樓';
  step: string;
  title: string;
};

const chapters: Chapter[] = [
  { at: 0, group: '開場', step: '操作教學', title: '控制箱遠照' },
  { at: 4, group: '步驟 4｜重置', step: '操作位置', title: '步驟四導引圖' },
  { at: 6, group: '步驟 4｜重置', step: '4.1', title: 'SW4：NOR → STP' },
  { at: 14.5, group: '步驟 4｜重置', step: '4.1', title: 'SW2、SW3 同時上撥' },
  { at: 24.5417, group: '步驟 4｜重置', step: '4.1', title: '復歸開關' },
  { at: 38.0417, group: '步驟 4｜重置', step: '4.1', title: 'SW4：STP → NOR' },
  { at: 46.0833, group: '步驟 4｜重置', step: '4.2', title: '就近樓層水平' },
  { at: 59.4583, group: '步驟 5｜緩速歸樓', step: '操作位置', title: '控制箱遠照' },
  { at: 63.4583, group: '步驟 5｜緩速歸樓', step: '操作位置', title: '步驟五導引圖' },
  { at: 65.4583, group: '步驟 5｜緩速歸樓', step: '5.1', title: 'ECSW：正常 → 緊急' },
  { at: 74.25, group: '步驟 5｜緩速歸樓', step: '5.2', title: '蓄電池開關：ON' },
  { at: 84.4583, group: '步驟 5｜緩速歸樓', step: '5.3', title: '救援裝置盒保護蓋' },
  { at: 94.125, group: '步驟 5｜緩速歸樓', step: '5.3', title: '紅色停止鈕' },
  { at: 100.125, group: '步驟 5｜緩速歸樓', step: '5.4', title: '對講機告知乘客' },
  { at: 110.6667, group: '步驟 5｜緩速歸樓', step: '5.4 A', title: 'A 步驟' },
  { at: 124.0417, group: '步驟 5｜緩速歸樓', step: '5.4 B', title: 'B 步驟' },
  { at: 137.5, group: '步驟 5｜緩速歸樓', step: '5.5', title: '門區「水平燈」' },
  { at: 146.125, group: '步驟 5｜緩速歸樓', step: '5.6', title: '主電源開關' },
  { at: 155.375, group: '步驟 5｜緩速歸樓', step: '5.6', title: '乘場門' },
];

const groups = ['開場', '步驟 4｜重置', '步驟 5｜緩速歸樓'] as const;

function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const remaining = whole % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

export default function Home() {
  const playerRef = useRef<HTMLVideoElement>(null);
  const navigatorRef = useRef<ReturnType<typeof createVideoNavigator> | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [navigation, setNavigation] = useState<NavigationState>({ phase: 'idle', target: 0, percent: null });
  const [isInteractive, setIsInteractive] = useState(false);
  const isBusy = navigation.phase === 'loading' || navigation.phase === 'seeking';

  useEffect(() => {
    if (!playerRef.current) return;
    const navigator = createVideoNavigator(playerRef.current, '/media/training-v6-web.mp4', setNavigation);
    navigatorRef.current = navigator;
    setIsInteractive(true);
    return () => {
      navigatorRef.current = null;
      navigator.dispose();
    };
  }, []);

  const activeIndex = useMemo(() => {
    for (let index = chapters.length - 1; index >= 0; index -= 1) {
      // Media timestamps can round a few microseconds below the requested chapter.
      if (currentTime + 0.0001 >= chapters[index].at) return index;
    }
    return 0;
  }, [currentTime]);

  const jumpTo = (seconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    navigatorRef.current?.jumpTo(seconds);
    const bounds = player.getBoundingClientRect();
    if (bounds.top < 0 || bounds.bottom > window.innerHeight) {
      player.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  };

  return (
    <main className="site-shell">
      <header className="topbar">
        <div className="brand-block">
          <span className="eyebrow">崇友電梯操作教學</span>
          <h1>重置與緩速歸樓</h1>
        </div>
        <span className="simulation-badge">操作模擬</span>
      </header>

      <section className="training-layout" aria-label="教學影片播放器">
        <div className="player-column">
          <div className="video-card" aria-busy={isBusy}>
            <video
              ref={playerRef}
              controls
              playsInline
              preload="metadata"
              poster="/media/01_intro.png"
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              onSeeked={(event) => setCurrentTime(event.currentTarget.currentTime)}
              aria-label="崇友重置與緩速歸樓操作模擬影片"
            >
              <source src="/media/training-v6-web.mp4" type="video/mp4" />
              <track
                kind="captions"
                src="/media/重置與歸樓_V6_字幕.vtt"
                srcLang="zh-TW"
                label="繁體中文"
                default
              />
              您的瀏覽器無法播放此影片，請改用下方下載連結觀看。
            </video>
          </div>

          {!isInteractive && <output className="player-status">正在啟用章節按鈕…</output>}

          {navigation.phase !== 'idle' && (
            <output className={`player-status ${navigation.phase}`}>
              {navigation.phase === 'loading' && <>
                <span>正在載入影片{navigation.percent === null ? '…' : ` ${navigation.percent}%`}，完成後跳至 {formatTime(navigation.target)}</span>
                <progress max={100} value={navigation.percent ?? undefined} aria-label="影片載入進度" />
              </>}
              {navigation.phase === 'seeking' && <span>正在跳至 {formatTime(navigation.target)}…</span>}
              {navigation.phase === 'ready' && <span>已跳至 {formatTime(navigation.target)}</span>}
              {navigation.phase === 'blocked' && <>
                <span>已定位到 {formatTime(navigation.target)}，請按播放繼續。</span>
                <button type="button" onClick={() => navigatorRef.current?.resume()}>繼續播放</button>
              </>}
              {navigation.phase === 'error' && <>
                <span>影片載入或跳轉失敗，請重試，或使用下方「下載影片」。</span>
                <button type="button" onClick={() => jumpTo(navigation.target)}>重試跳轉</button>
              </>}
            </output>
          )}

          <div className="now-playing" aria-live="polite">
            <div className="now-icon"><Play size={18} aria-hidden="true" /></div>
            <div>
              <span>目前段落</span>
              <strong>{chapters[activeIndex].step}　{chapters[activeIndex].title}</strong>
            </div>
            <time>{formatTime(currentTime)} / 02:44</time>
          </div>

          <div className="quick-actions" aria-label="快速操作">
            <button type="button" disabled={!isInteractive} onClick={() => jumpTo(0)}>
              <RotateCcw size={17} aria-hidden="true" />從頭播放
            </button>
            <button type="button" disabled={!isInteractive} onClick={() => jumpTo(6)}>
              <MapPin size={17} aria-hidden="true" />步驟 4
            </button>
            <button type="button" disabled={!isInteractive} onClick={() => jumpTo(59.4583)}>
              <MapPin size={17} aria-hidden="true" />步驟 5
            </button>
            <a className="download-button" href="/media/training-v6-web.mp4" download>
              <Download size={17} aria-hidden="true" />下載影片
            </a>
          </div>

          <div className="info-strip">
            <div><Clock3 size={18} aria-hidden="true" /><span><strong>02:44</strong> 完整教學</span></div>
            <div><Captions size={18} aria-hidden="true" /><span>台灣口調旁白與畫面字幕</span></div>
            <a href="/media/重置與歸樓_V6_字幕.srt" download>下載字幕檔</a>
          </div>
        </div>

        <aside className="chapter-panel" aria-label="影片章節">
          <div className="chapter-heading">
            <div>
              <span className="eyebrow">快速定位</span>
              <h2>操作章節</h2>
            </div>
            <span className="chapter-count">19 段</span>
          </div>

          <nav className="chapter-list">
            {groups.map((group) => (
              <section className="chapter-group" key={group}>
                <h3>{group}</h3>
                {chapters.map((chapter, index) => chapter.group === group && (
                  <button
                    type="button"
                    disabled={!isInteractive}
                    key={`${chapter.at}-${chapter.title}`}
                    className={[index === activeIndex ? 'active' : '', isBusy && chapter.at === navigation.target ? 'pending' : ''].filter(Boolean).join(' ')}
                    aria-current={index === activeIndex ? 'true' : undefined}
                    onClick={() => jumpTo(chapter.at)}
                  >
                    <time>{formatTime(chapter.at)}</time>
                    <span>
                      <small>{chapter.step}</small>
                      <strong>{chapter.title}</strong>
                    </span>
                    <ChevronRight size={17} aria-hidden="true" />
                  </button>
                ))}
              </section>
            ))}
          </nav>
        </aside>
      </section>

      <footer>
        本影片以照片動畫合成模擬設備切換，並於畫面標示「操作模擬」。
      </footer>
    </main>
  );
}
