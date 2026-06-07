import { useGameStore } from '@/store/gameStore';
import type { Difficulty } from '@/utils/rules';

export default function GameControl() {
  const phase = useGameStore(s => s.phase);
  const playerColor = useGameStore(s => s.playerColor);
  const difficulty = useGameStore(s => s.difficulty);
  const currentTurn = useGameStore(s => s.currentTurn);
  const isAIThinking = useGameStore(s => s.isAIThinking);
  const isHintComputing = useGameStore(s => s.isHintComputing);
  const winner = useGameStore(s => s.winner);
  const isDraw = useGameStore(s => s.isDraw);
  const hintCount = useGameStore(s => s.hintCount);
  const undoCount = useGameStore(s => s.undoCount);
  const hintPendingConfirm = useGameStore(s => s.hintPendingConfirm);

  const setPlayerColor = useGameStore(s => s.setPlayerColor);
  const setDifficulty = useGameStore(s => s.setDifficulty);
  const startGame = useGameStore(s => s.startGame);
  const resetGame = useGameStore(s => s.resetGame);
  const requestHint = useGameStore(s => s.requestHint);
  const cancelHintConfirm = useGameStore(s => s.cancelHintConfirm);
  const undoMove = useGameStore(s => s.undoMove);

  const isIdle = phase === 'idle';
  const canStart = isIdle && playerColor !== null;
  const showHintBtn = hintCount > 0;
  const showUndoBtn = undoCount > 0 && phase === 'playing' && currentTurn === playerColor && !isAIThinking;
  const canUndo = showUndoBtn;

  const difficulties: { key: Difficulty; label: string; desc: string }[] = [
    { key: 'easy', label: '低', desc: '简单' },
    { key: 'medium', label: '中', desc: '普通' },
    { key: 'hard', label: '高', desc: '困难' },
  ];

  const getStatusText = () => {
    if (winner) {
      return winner === playerColor ? '你赢了！' : 'AI赢了！';
    }
    if (isDraw) return '平局！';
    if (isHintComputing) return '计算中…';
    if (isAIThinking) return 'AI 思考中…';
    if (phase === 'playing') {
      return currentTurn === playerColor ? '轮到你落子' : 'AI 回合';
    }
    if (phase === 'idle') {
      return playerColor ? '请点击「开始游戏」' : '请选择执棋颜色';
    }
    return '';
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-xs">
      {/* 标题 */}
      <h1 className="text-3xl font-serif font-bold text-amber-900 tracking-wider select-none"
        style={{ fontFamily: '"Noto Serif SC", "KaiTi", "STKaiti", serif' }}>
        五子棋
      </h1>

      {/* 颜色选择 */}
      {isIdle && (
        <div className="flex flex-col items-center gap-2 w-full">
          <span className="text-sm text-amber-700 font-medium">选择执棋颜色</span>
          <div className="flex gap-3">
            <button
              onClick={() => setPlayerColor('black')}
              className={`
                flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm md:text-base
                ${playerColor === 'black'
                  ? 'bg-amber-900 text-amber-100 shadow-lg scale-105 ring-2 ring-amber-500'
                  : 'bg-white/80 text-gray-700 hover:bg-amber-100 hover:shadow-md border border-amber-300'}
              `}
            >
              <span
                className="inline-block rounded-full w-5 h-5"
                style={{ background: 'radial-gradient(circle at 35% 35%, #555, #111)', boxShadow: '1px 1px 3px rgba(0,0,0,0.4)' }}
              />
              执黑先手
            </button>
            <button
              onClick={() => setPlayerColor('white')}
              className={`
                flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-xl font-medium transition-all duration-200 text-sm md:text-base
                ${playerColor === 'white'
                  ? 'bg-amber-900 text-amber-100 shadow-lg scale-105 ring-2 ring-amber-500'
                  : 'bg-white/80 text-gray-700 hover:bg-amber-100 hover:shadow-md border border-amber-300'}
              `}
            >
              <span
                className="inline-block rounded-full w-5 h-5 border border-gray-300"
                style={{ background: 'radial-gradient(circle at 35% 35%, #fff, #ddd)', boxShadow: '1px 1px 3px rgba(0,0,0,0.2)' }}
              />
              执白后手
            </button>
          </div>
        </div>
      )}

      {/* 难度选择 */}
      {isIdle && (
        <div className="flex flex-col items-center gap-2 w-full">
          <span className="text-sm text-amber-700 font-medium">AI 难度</span>
          <div className="flex gap-2">
            {difficulties.map(d => (
              <button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                className={`
                  px-4 py-2 rounded-xl font-medium transition-all duration-200 text-sm
                  ${difficulty === d.key
                    ? 'bg-amber-700 text-white shadow-md scale-105'
                    : 'bg-white/70 text-gray-600 hover:bg-amber-100 border border-amber-300'}
                `}
                title={d.desc}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 游戏按钮 */}
      <div className="flex gap-2 md:gap-3 flex-wrap justify-center">
        {isIdle && (
          <button
            onClick={startGame}
            disabled={!canStart}
            className={`
              px-4 md:px-6 py-2.5 rounded-xl font-bold text-white transition-all duration-200 text-sm md:text-base
              ${canStart
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg hover:shadow-xl active:scale-95'
                : 'bg-gray-400 cursor-not-allowed'}
            `}
          >
            开始游戏
          </button>
        )}
        <button
          onClick={resetGame}
          className="px-4 md:px-6 py-2.5 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 text-sm md:text-base"
        >
          新一局
        </button>

        {/* 提示按钮 */}
        {showHintBtn && phase === 'playing' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => requestHint()}
              disabled={isHintComputing || currentTurn !== playerColor || isAIThinking}
              className={`
                px-3 md:px-4 py-2.5 rounded-xl font-bold text-white transition-all duration-200 flex items-center gap-1 md:gap-1.5 text-sm md:text-base relative
                ${isHintComputing
                  ? 'bg-yellow-500 cursor-wait'
                  : hintPendingConfirm
                    ? 'bg-yellow-600 hover:bg-yellow-700 shadow-lg hover:shadow-xl'
                    : 'bg-yellow-500 hover:bg-yellow-600 shadow-lg hover:shadow-xl active:scale-95'}
              `}
            >
              {isHintComputing 
                ? '计算中…' 
                : hintPendingConfirm 
                  ? '确定使用提示？' 
                  : '💡提示'}
              <span className={`
                rounded-full px-2 py-0.5 text-xs
                ${hintPendingConfirm 
                  ? 'bg-white/30 animate-pulse' 
                  : 'bg-white/30'}
              `}>{hintCount}</span>
            </button>
            {hintPendingConfirm && (
              <button
                onClick={cancelHintConfirm}
                className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold flex items-center justify-center text-sm shadow-md transition-all duration-150"
                title="取消"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* 悔棋按钮 - 手机端最小48x48 */}
        {showUndoBtn && (
          <button
            onClick={undoMove}
            disabled={!canUndo}
            className="px-3 md:px-4 py-2.5 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 flex items-center gap-1 md:gap-1.5 min-w-[48px] min-h-[48px] justify-center text-sm md:text-base"
          >
            ↩悔棋
            <span className="bg-white/30 rounded-full px-2 py-0.5 text-xs">{undoCount}</span>
          </button>
        )}
      </div>

      {/* 状态栏 */}
      <div className={`
        px-5 py-2 rounded-xl text-center font-medium transition-all duration-300
        ${winner
          ? winner === playerColor
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : 'bg-red-100 text-red-800 border border-red-300'
          : isDraw
            ? 'bg-blue-100 text-blue-800 border border-blue-300'
            : (isAIThinking || isHintComputing)
              ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
              : 'bg-amber-50 text-amber-800 border border-amber-200'}
      `}>
        {(isAIThinking || isHintComputing) && (
          <span className="inline-block mr-2">
            <svg className="animate-spin h-4 w-4 inline" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        )}
        {getStatusText()}
      </div>
    </div>
  );
}
