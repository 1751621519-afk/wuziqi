import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';

export default function DrawCat() {
  const phase = useGameStore(s => s.phase);
  const isDraw = useGameStore(s => s.isDraw);
  const isDrawLocked = useGameStore(s => s.isDrawLocked);
  const setDrawLocked = useGameStore(s => s.setDrawLocked);

  const visible = phase === 'finished' && isDraw;

  useEffect(() => {
    if (visible) {
      useGameStore.getState().setDrawLocked(true);
    }
  }, [visible]);

  const handleClose = () => {
    setDrawLocked(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" onClick={handleClose}>
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* 猫咪卡片 */}
      <div className="relative bg-white/95 backdrop-blur rounded-2xl shadow-2xl px-6 py-5 flex flex-col items-center gap-3 border border-amber-200 max-w-xs w-[80vw] animate-bounce-in">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-700 font-bold flex items-center justify-center text-sm transition-colors duration-150"
        >
          ✕
        </button>

        <span className="text-5xl">😺</span>
        <span className="text-amber-800 font-medium text-base text-center">
          平局也是一种缘分喵~
        </span>
        <button
          onClick={handleClose}
          className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md transition-all duration-150 active:scale-95"
        >
          知道了
        </button>
      </div>
    </div>
  );
}
