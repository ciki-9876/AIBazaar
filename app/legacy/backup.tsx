'use client';
/* oxlint-disable next/no-html-link-for-pages -- Native navigation is used by the existing portable Sites build. */
import { useState } from 'react';
import '../demo/demo.css';
import '../design/current.css';
export default function LegacyBackup() {
  const [message, setMessage] = useState(
    '旧午夜集市玩法已退役。原存档仍保留在当前浏览器，没有改写或删除。',
  );
  function download() {
    const raw = localStorage.getItem('f9.game.run.v1');
    if (!raw) {
      setMessage('当前浏览器没有旧午夜集市存档。');
      return;
    }
    const url = URL.createObjectURL(
      new Blob([raw], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'f9-midnight-legacy-backup.json';
    a.click();
    URL.revokeObjectURL(url);
    setMessage('备份已导出。此格式与电梯冒险不同，请保留文件。');
  }
  return (
    <main className="elevator-demo object-handbook">
      <a href="/">← 返回电梯</a>
      <h1>旧档备份</h1>
      <p>{message}</p>
      <button onClick={download}>导出旧午夜集市存档</button>
      <p>现在的冒险、图鉴和试验场统一使用12张卡牌。</p>
      <a href="/design">查看实体工具与卡牌手册 ↗</a>
    </main>
  );
}
