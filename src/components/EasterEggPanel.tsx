import { useGameStore } from '@/store/gameStore';

const OPTIONS = [
  { id: 1, label: '额外提示', desc: '嘘，偷偷多给你一次～' },
  { id: 2, label: 'AI 放水', desc: '让它歇一局～' },
  { id: 3, label: '悔棋特权', desc: '给你两次反悔的机会' },
  { id: 4, label: '幸运星', desc: '或许好运藏在星星里？' },
  { id: 5, label: '棋盘恶作剧', desc: '这局棋盘会不太一样哦～' },
];

export default function EasterEggPanel() {
  const easterEggActive = useGameStore(s => s.easterEggActive);
  const applyEasterEgg = useGameStore(s => s.applyEasterEgg);

  if (!easterEggActive) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      {/* 半透明遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* 彩蛋面板 */}
      <div className="relative bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-4 md:p-6 w-[85vw] max-w-sm animate-bounce-in">
        <h2 className="text-xl font-bold text-center text-amber-800 mb-1">
          连败安慰～选一个礼物吧 🎁
        </h2>
        <p className="text-xs text-center text-gray-400 mb-4">
          选择一个彩蛋，效果将在下一局（或立即）生效
        </p>

        <div className="flex flex-col gap-2">
          {OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => applyEasterEgg(opt.id)}
              className="flex flex-col items-start px-4 py-3 rounded-xl border border-amber-200 hover:bg-amber-50 hover:border-amber-400 hover:shadow-md active:scale-[0.98] transition-all duration-150 text-left"
            >
              <span className="font-bold text-amber-900 text-sm">{opt.label}</span>
              <span className="text-xs text-gray-500">{opt.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
