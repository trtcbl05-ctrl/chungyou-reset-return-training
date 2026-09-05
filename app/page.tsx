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
import { useMemo, useRef, useState } from 'react';

type Chapter = {
  at: number;
  group: '開場' | '步驟 4｜重置' | '步驟 5｜緩速歸樓';
  step: string;
  title: string;
};

const chapters: Chapter[] = [
  { at: 0, group: '開場', step: '操作教學', title: '控制箱遠照' },
  { at: 6, group: '步驟 4｜重置', step: '操作位置', title: '步驟四導引圖' },
  { at: 14, group: '步驟 4｜重置', step: '4.1', title: 'SW4：NOR → STP' },
  { at: 25.25, group: '步驟 4｜重置', step: '4.1', title: 'SW2、SW3 同時上撥' },
  { at: 38.0417, group: '步驟 4｜重置', step: '4.1', title: '復歸開關' },
  { at: 54.2917, group: '步驟 4｜重置', step: '4.1', title: 'SW4：STP → NOR' },
  { at: 65.0833, group: '步驟 4｜重置', step: '4.2', title: '就近樓層水平' },
  { at: 81.2083, group: '步驟 5｜緩速歸樓', step: '操作位置', title: '控制箱遠照' },
  { at: 87.2083, group: '步驟 5｜緩速歸樓', step: '操作位置', title: '步驟五導引圖' },
  { at: 96.2083, group: '步驟 5｜緩速歸樓', step: '5.1', title: 'ECSW：正常 → 緊急' },
  { at: 107.75, group: '步驟 5｜緩速歸樓', step: '5.2', title: '蓄電池開關：ON' },
  { at: 120.7083, group: '步驟 5｜緩速歸樓', step: '5.3', title: '救援裝置盒保護蓋' },
  { at: 133.125, group: '步驟 5｜緩速歸樓', step: '5.3', title: '紅色停止鈕' },
  { at: 143.125, group: '步驟 5｜緩速歸樓', step: '5.4', title: '對講機告知乘客' },
  { at: 156.4167, group: '步驟 5｜緩速歸樓', step: '5.4 A', title: 'A 步驟' },
  { at: 172.5417, group: '步驟 5｜緩速歸樓', step: '5.4 B', title: 'B 步驟' },
  { at: 188.75, group: '步驟 5｜緩速歸樓', step: '5.5', title: '門區「水平燈」' },
  { at: 200.125, group: '步驟 5｜緩速歸樓', step: '5.6', title: '主電源開關' },
  { at: 212.125, group: '步驟 5｜緩速歸樓', step: '5.6', title: '乘場門' },
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
  const [currentTime, setCurrentTime] = useState(0);

  const activeIndex = useMemo(() => {
    for (let index = chapters.length - 1; index >= 0; index -= 1) {
      if (currentTime >= chapters[index].at) return index;
    }
    return 0;
  }, [currentTime]);

  const jumpTo = (seconds: number) => {
    const player = playerRef.current;
    if (!player) return;
    player.currentTime = seconds;
    setCurrentTime(seconds);
    void player.play().catch(() => undefined);
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
          <div className="video-card">
            <video
              ref={playerRef}
              controls
              playsInline
              preload="metadata"
              poster="/media/01_intro.png"
              onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
              aria-label="崇友重置與緩速歸樓操作模擬影片"
            >
              <source src="/media/training-v4-web.mp4" type="video/mp4" />
              <track
                kind="captions"
                src="/media/重置與歸樓_字幕.vtt"
                srcLang="zh-TW"
                label="繁體中文"
                default
              />
              您的瀏覽器無法播放此影片，請改用下方下載連結觀看。
            </video>
          </div>

          <div className="now-playing" aria-live="polite">
            <div className="now-icon"><Play size={18} aria-hidden="true" /></div>
            <div>
              <span>目前段落</span>
              <strong>{chapters[activeIndex].step}　{chapters[activeIndex].title}</strong>
            </div>
            <time>{formatTime(currentTime)} / 03:43</time>
          </div>

          <div className="quick-actions" aria-label="快速操作">
            <button type="button" onClick={() => jumpTo(0)}>
              <RotateCcw size={17} aria-hidden="true" />從頭播放
            </button>
            <button type="button" onClick={() => jumpTo(6)}>
              <MapPin size={17} aria-hidden="true" />步驟 4
            </button>
            <button type="button" onClick={() => jumpTo(81.2083)}>
              <MapPin size={17} aria-hidden="true" />步驟 5
            </button>
            <a className="download-button" href="/media/training-v4-web.mp4" download>
              <Download size={17} aria-hidden="true" />下載影片
            </a>
          </div>

          <div className="info-strip">
            <div><Clock3 size={18} aria-hidden="true" /><span><strong>03:43</strong> 完整教學</span></div>
            <div><Captions size={18} aria-hidden="true" /><span>台灣口調旁白與畫面字幕</span></div>
            <a href="/media/重置與歸樓_字幕.srt" download>下載字幕檔</a>
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
                    key={`${chapter.at}-${chapter.title}`}
                    className={index === activeIndex ? 'active' : ''}
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
