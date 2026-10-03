'use client';
import { ChevronsRight, Pause, Play, Bot } from 'lucide-react';
export type DialogueControls = {
  auto: boolean;
  toggle: () => void;
  skip: () => void;
};
export default function DialogueBubble({
  text,
  speaker = 'robot',
  controls,
  className = '',
  portrait = true,
}: {
  text: string;
  speaker?: 'robot' | 'player';
  controls: DialogueControls;
  className?: string;
  portrait?: boolean;
}) {
  return (
    <div
      className={`dialogue-bubble dialogue-${speaker} ${className}`}
      aria-live="polite"
    >
      <button
        className="dialogue-hit-area"
        onClick={controls.skip}
        aria-label={`跳过${speaker === 'robot' ? '机器人对话' : '独白'}：${text}`}
      />
      <div className="dialogue-line">
        {speaker === 'robot' && portrait && (
          <Bot className="dialogue-head" size={22} />
        )}
        <span>{text}</span>
        <ChevronsRight className="dialogue-next" size={17} aria-hidden="true" />
      </div>
      <button
        className="dialogue-auto"
        aria-pressed={controls.auto}
        onClick={controls.toggle}
        title="自动播放对话"
      >
        {controls.auto ? <Pause size={12} /> : <Play size={12} />} 自动{' '}
        {controls.auto ? '开' : '关'}
      </button>
    </div>
  );
}
