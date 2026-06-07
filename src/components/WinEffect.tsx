import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { FireworksEngine } from '@/utils/fireworks';

export default function WinEffect() {
  const phase = useGameStore(s => s.phase);
  const winner = useGameStore(s => s.winner);
  const playerColor = useGameStore(s => s.playerColor);
  const luckyStarsActive = useGameStore(s => s.luckyStarsActive);
  const luckyStarsWinCrown = useGameStore(s => s.luckyStarsWinCrown);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FireworksEngine | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showStarCrown, setShowStarCrown] = useState(false);
  const showStarCrownRef = useRef(false);

  useEffect(() => {
    if (phase === 'finished' && winner) {
      if (canvasRef.current && !engineRef.current) {
        engineRef.current = new FireworksEngine(canvasRef.current);
      }

      const isPlayerWin = winner === playerColor;

      const t1 = setTimeout(() => {
        if (isPlayerWin && luckyStarsActive) {
          engineRef.current?.startStarRain();
          showStarCrownRef.current = true;
          setShowStarCrown(true);
        } else {
          engineRef.current?.start();
        }
      }, 100);

      const t2 = setTimeout(() => {
        setShowModal(true);
      }, 1100);

      // 稀疏星星慰劳效果（输/平局 + luckyStarsActive）
      if (!isPlayerWin && luckyStarsActive) {
        const t3 = setTimeout(() => {
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight / 2;
          engineRef.current?.startSparseStars(cx, cy);
        }, 1500);
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
        };
      }

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else {
      setShowModal(false);
      setShowStarCrown(false);
      showStarCrownRef.current = false;
      if (engineRef.current) {
        engineRef.current.stop();
      }
    }
  }, [phase, winner, playerColor, luckyStarsActive]);

  useEffect(() => {
    return () => {
      engineRef.current?.stop();
    };
  }, []);

  const handleNewGame = () => {
    setShowModal(false);
    setShowStarCrown(false);
    showStarCrownRef.current = false;
    engineRef.current?.stop();
    engineRef.current = null;

    const state = useGameStore.getState();
    if (state.winner && state.winner !== state.playerColor && state.consecutiveLosses >= 3) {
      useGameStore.setState({ easterEggActive: true, consecutiveLosses: 0 });
    } else {
      state.resetGame();
    }
  };

  if (phase !== 'finished' || !winner) return null;

  const isPlayerWin = winner === playerColor;
  const winText = isPlayerWin ? '你赢了！' : 'AI 赢了！';

  return (
    <>
      {/* 烟花 / 星雨 Canvas 层 */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50"
        style={{ width: '100vw', height: '100vh' }}
      />

      {/* 星冠加冕文字 */}
      {showStarCrown && luckyStarsWinCrown && (
        <div className="fixed inset-0 z-[55] flex items-center justify-center pointer-events-none">
          <span
            className="text-5xl md:text-7xl font-bold animate-bounce-in"
            style={{
              color: '#FFD700',
              textShadow: '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 165, 0, 0.6), 0 4px 8px rgba(0,0,0,0.3)',
            }}
          >
            星冠加冕！
          </span>
        </div>
      )}

      {/* 胜利弹窗 */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.3)' }} />
          <div className="relative bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col items-center gap-4 animate-bounce-in w-[85vw] max-w-sm" style={{ maxWidth: 380 }}>
            <span className="text-6xl">{isPlayerWin ? '🎉' : '😅'}</span>
            <h2 className={`text-3xl font-bold ${isPlayerWin ? 'text-amber-700' : 'text-red-600'}`}>
              {winText}
            </h2>

            {/* 玩家输了 - 垂耳兔 + 鼓励文字 */}
            {!isPlayerWin && (
              <div className="flex flex-col items-center gap-1">
                <svg viewBox="0 0 100 120" className="w-20 h-24" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
                  <ellipse cx="50" cy="75" rx="22" ry="28" fill="#E8E0D8" stroke="#C4B5A5" strokeWidth="1.5"/>
                  <circle cx="50" cy="42" r="18" fill="#E8E0D8" stroke="#C4B5A5" strokeWidth="1.5"/>
                  <ellipse cx="38" cy="25" rx="6" ry="18" fill="#E8E0D8" stroke="#C4B5A5" strokeWidth="1.5" transform="rotate(-15 38 25)"/>
                  <ellipse cx="62" cy="25" rx="6" ry="18" fill="#E8E0D8" stroke="#C4B5A5" strokeWidth="1.5" transform="rotate(15 62 25)"/>
                  <circle cx="45" cy="40" r="2.5" fill="#5D4037"/>
                  <circle cx="55" cy="40" r="2.5" fill="#5D4037"/>
                  <ellipse cx="50" cy="47" rx="2" ry="1.5" fill="#C4B5A5"/>
                  <line x1="42" y1="50" x2="35" y2="52" stroke="#C4B5A5" strokeWidth="0.5"/>
                  <line x1="42" y1="53" x2="35" y2="54" stroke="#C4B5A5" strokeWidth="0.5"/>
                  <line x1="58" y1="50" x2="65" y2="52" stroke="#C4B5A5" strokeWidth="0.5"/>
                  <line x1="58" y1="53" x2="65" y2="54" stroke="#C4B5A5" strokeWidth="0.5"/>
                </svg>
                <p className="text-gray-500 text-sm">下局一定赢～</p>
              </div>
            )}

            <p className="text-gray-500 text-sm">
              {isPlayerWin ? '恭喜！你击败了AI！' : 'AI技高一筹，再试一次吧！'}
            </p>
            <button
              onClick={handleNewGame}
              className="mt-2 px-8 py-3 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200"
            >
              再来一局
            </button>
          </div>
        </div>
      )}
    </>
  );
}
