import { useCallback, useRef, useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { BOARD_SIZE } from '@/utils/rules';

const STAR_POINTS = [
  [3, 3], [3, 7], [3, 11],
  [7, 3], [7, 7], [7, 11],
  [11, 3], [11, 7], [11, 11],
];

const RAINBOW_COLORS = ['#FF0000', '#FF7F00', '#FFD700', '#00CC00', '#3366FF'];

export default function GomokuBoard() {
  const board = useGameStore(s => s.board);
  const phase = useGameStore(s => s.phase);
  const currentTurn = useGameStore(s => s.currentTurn);
  const playerColor = useGameStore(s => s.playerColor);
  const isAIThinking = useGameStore(s => s.isAIThinking);
  const winLine = useGameStore(s => s.winLine);
  const lastMove = useGameStore(s => s.lastMove);
  const winner = useGameStore(s => s.winner);
  const hintPosition = useGameStore(s => s.hintPosition);
  const pinkBoardActive = useGameStore(s => s.pinkBoardActive);
  const starSparklePosition = useGameStore(s => s.starSparklePosition);
  const luckyStarsWinCrown = useGameStore(s => s.luckyStarsWinCrown);
  const pinkBoardPrankText = useGameStore(s => s.pinkBoardPrankText);
  const pinkBoardAIDodging = useGameStore(s => s.pinkBoardAIDodging);
  const isDrawLocked = useGameStore(s => s.isDrawLocked);
  const placeStone = useGameStore(s => s.placeStone);
  const boardRef = useRef<HTMLDivElement>(null);

  // 响应式棋盘尺寸
  const [boardPX, setBoardPX] = useState(544);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      if (w > 0) setBoardPX(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const padding = Math.max(10, boardPX * 0.045);
  const cellSize = (boardPX - padding * 2) / (BOARD_SIZE - 1);
  const stoneR = cellSize * 0.42;

  const canPlay = phase === 'playing' && currentTurn === playerColor && !isAIThinking && !isDrawLocked;

  // 200ms 防抖
  const lastClickRef = useRef<{ row: number; col: number; time: number } | null>(null);
  const handleClick = useCallback((row: number, col: number) => {
    if (!canPlay) return;
    if (board[row][col] !== null) return;
    const now = Date.now();
    const last = lastClickRef.current;
    if (last && last.row === row && last.col === col && now - last.time < 200) return;
    lastClickRef.current = { row, col, time: now };
    placeStone(row, col);
  }, [canPlay, board, placeStone]);

  // 统一 pointerdown 处理（鼠标 + 触摸），防止双击触发两次
  const touchedRef = useRef(false);
  const handlePointerDown = useCallback((e: React.PointerEvent, row: number, col: number) => {
    // 阻止默认行为避免后续 click 事件重复触发
    e.preventDefault();
    if (e.pointerType === 'touch') {
      touchedRef.current = true;
    }
    handleClick(row, col);
  }, [handleClick]);

  // 同时也处理 onClick 以兼容某些环境
  const handleCellClick = useCallback((e: React.MouseEvent, row: number, col: number) => {
    // 如果刚刚通过 touch 触发了，忽略 mouse click
    if (touchedRef.current) {
      touchedRef.current = false;
      return;
    }
    e.preventDefault();
    handleClick(row, col);
  }, [handleClick]);

  const winMap = new Map<string, number>();
  if (winLine) {
    for (let i = 0; i < winLine.length; i++) {
      const [r, c] = winLine[i];
      winMap.set(`${r},${c}`, i);
    }
  }

  return (
    <div className="relative select-none" ref={boardRef}>
      {/* 粉色背景标注 */}
      {pinkBoardActive && (
        <div className="absolute -inset-3 pointer-events-none z-0">
          <div className="absolute top-2 right-2 text-pink-600 font-bold text-sm animate-bounce bg-white/70 px-2 py-1 rounded-lg">
            幸运粉加持～
          </div>
        </div>
      )}

      {/* 粉色棋盘 - 全视口浮动文字 */}
      {pinkBoardPrankText && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          <div
            className="absolute font-bold text-3xl md:text-4xl"
            style={{
              color: '#FF69B4',
              textShadow: '0 0 6px #FF69B4, 0 0 12px #FFB6C1, 2px 2px 4px rgba(0,0,0,0.2)',
              animation: 'prank-float 4s ease-in-out infinite',
              left: '10%',
              top: '20%',
            }}
          >
            幸运粉加持～
          </div>
          <div
            className="absolute font-bold text-2xl md:text-3xl"
            style={{
              color: '#FF69B4',
              textShadow: '0 0 6px #FF69B4, 0 0 12px #FFB6C1, 2px 2px 4px rgba(0,0,0,0.2)',
              animation: 'prank-float 5s ease-in-out infinite 1s',
              left: '55%',
              top: '60%',
            }}
          >
            幸运粉加持～
          </div>
        </div>
      )}

      {/* 粉色棋盘 - AI躲避提示 */}
      {pinkBoardAIDodging && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none z-10 whitespace-nowrap">
          <span
            className="text-sm font-bold px-3 py-1 rounded-full animate-fade-in-out"
            style={{
              color: '#FF69B4',
              backgroundColor: 'rgba(255, 105, 180, 0.15)',
              border: '1px solid rgba(255, 105, 180, 0.3)',
            }}
          >
            棋盘恶作剧生效～
          </span>
        </div>
      )}

      {/* 棋盘容器 - 响应式正方形 */}
      <div
        className="relative rounded-lg shadow-2xl transition-colors duration-1000"
        style={{
          width: 'min(calc(100vw - 32px), 600px)',
          height: 'min(calc(100vw - 32px), 600px)',
          maxWidth: 600,
          maxHeight: 600,
          aspectRatio: '1 / 1',
          background: pinkBoardActive
            ? 'linear-gradient(135deg, #FFB6C1 0%, #FFC0CB 50%, #FFD1DC 100%)'
            : 'linear-gradient(135deg, #F5E6C8 0%, #E8D5A3 50%, #F0DCB0 100%)',
          border: `3px solid ${pinkBoardActive ? '#FF69B4' : '#5D4037'}`,
        }}
      >
        {/* 网格线 */}
        <svg
          className="absolute inset-0"
          width={boardPX}
          height={boardPX}
          style={{ pointerEvents: 'none' }}
        >
          {Array.from({ length: BOARD_SIZE }, (_, i) => {
            const pos = padding + i * cellSize;
            return (
              <g key={i}>
                <line
                  x1={padding} y1={pos} x2={padding + (BOARD_SIZE - 1) * cellSize} y2={pos}
                  stroke={pinkBoardActive ? '#FF69B4' : '#5D4037'} strokeWidth={0.8} opacity={0.6}
                />
                <line
                  x1={pos} y1={padding} x2={pos} y2={padding + (BOARD_SIZE - 1) * cellSize}
                  stroke={pinkBoardActive ? '#FF69B4' : '#5D4037'} strokeWidth={0.8} opacity={0.6}
                />
              </g>
            );
          })}

          {STAR_POINTS.map(([r, c]) => (
            <circle
              key={`star-${r}-${c}`}
              cx={padding + c * cellSize}
              cy={padding + r * cellSize}
              r={Math.max(2, cellSize * 0.1)}
              fill={pinkBoardActive ? '#FF69B4' : '#5D4037'}
            />
          ))}
        </svg>

        {/* 可点击区域 */}
        <div
          className="absolute inset-0"
          style={{ touchAction: 'manipulation' }}
        >
          {Array.from({ length: BOARD_SIZE }, (_, row) =>
            Array.from({ length: BOARD_SIZE }, (_, col) => {
              const posX = padding + col * cellSize;
              const posY = padding + row * cellSize;
              const isWinStone = winMap.has(`${row},${col}`);
              const winIndex = winMap.get(`${row},${col}`);
              const rainbowColor = winIndex !== undefined ? RAINBOW_COLORS[Math.min(winIndex, RAINBOW_COLORS.length - 1)] : null;
              const stone = board[row][col];
              const isLast = lastMove && lastMove[0] === row && lastMove[1] === col;
              const isHint = hintPosition && hintPosition[0] === row && hintPosition[1] === col;

              return (
                <div
                  key={`${row}-${col}`}
                  onClick={(e) => handleCellClick(e, row, col)}
                  onPointerDown={(e) => handlePointerDown(e, row, col)}
                  className="absolute flex items-center justify-center cursor-pointer group"
                  style={{
                    left: posX - cellSize / 2,
                    top: posY - cellSize / 2,
                    width: cellSize,
                    height: cellSize,
                    zIndex: stone ? 2 : 1,
                  }}
                >
                  {/* 提示高亮圆圈 */}
                  {isHint && !stone && (
                    <div
                      className="absolute rounded-full animate-pulse pointer-events-none"
                      style={{
                        width: stoneR * 2.2,
                        height: stoneR * 2.2,
                        background: 'rgba(255, 215, 0, 0.5)',
                        boxShadow: '0 0 12px rgba(255, 215, 0, 0.7)',
                      }}
                    />
                  )}

                  {/* 幸运星星闪 - 落子位置粒子 */}
                  {starSparklePosition && starSparklePosition[0] === row && starSparklePosition[1] === col && stone && (
                    <div className="absolute inset-0 pointer-events-none z-30 flex items-center justify-center">
                      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
                        <div
                          key={i}
                          className="absolute rounded-full animate-star-sparkle"
                          style={{
                            width: Math.max(3, stoneR * 0.25),
                            height: Math.max(3, stoneR * 0.25),
                            background: '#FFD700',
                            boxShadow: '0 0 6px 2px rgba(255, 215, 0, 0.9)',
                            animationDelay: `${i * 50}ms`,
                            animationDuration: '500ms',
                            transform: `rotate(${angle}deg) translateY(-${stoneR * 1.6}px)`,
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Hover 指示器 */}
                  {!stone && !isHint && canPlay && (
                    <div
                      className="absolute rounded-full opacity-0 group-hover:opacity-30 transition-opacity duration-150"
                      style={{
                        width: stoneR * 2,
                        height: stoneR * 2,
                        background: playerColor === 'black'
                          ? 'radial-gradient(circle at 35% 35%, #555, #111)'
                          : 'radial-gradient(circle at 35% 35%, #fff, #ccc)',
                      }}
                    />
                  )}

                  {/* 最后一步落子高亮闪烁 */}
                  {isLast && !winner && stone && (
                    <div
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        width: stoneR * 2 + 4,
                        height: stoneR * 2 + 4,
                        border: `2.5px solid #FFD700`,
                        animation: 'lastmove-flash 0.8s ease-out 1',
                      }}
                    />
                  )}

                  {/* 棋子 */}
                  {stone && (
                    <div
                      className={`
                        rounded-full transition-all duration-200
                        ${isWinStone ? 'animate-shake' : ''}
                      `}
                      style={{
                        width: stoneR * 2,
                        height: stoneR * 2,
                        background: isWinStone && rainbowColor
                          ? `radial-gradient(circle at 35% 35%, ${rainbowColor}, ${rainbowColor}88)`
                          : stone === 'black'
                            ? 'radial-gradient(circle at 35% 35%, #555, #111)'
                            : 'radial-gradient(circle at 35% 35%, #fff, #ccc)',
                        boxShadow: stone === 'black'
                          ? '2px 3px 6px rgba(0,0,0,0.5), inset -2px -2px 4px rgba(0,0,0,0.3)'
                          : '2px 3px 6px rgba(0,0,0,0.3), inset -2px -2px 4px rgba(0,0,0,0.15)',
                      }}
                    />
                  )}

                  {/* 星冠 - 玩家棋子上的金色星辉 */}
                  {luckyStarsWinCrown && stone === playerColor && (
                    <div
                      className="absolute inset-0 pointer-events-none z-25 flex items-center justify-center"
                      style={{
                        animation: 'crown-shimmer 2s ease-in-out infinite',
                      }}
                    >
                      <span
                        style={{
                          fontSize: Math.max(10, stoneR * 0.8),
                          color: '#FFD700',
                          textShadow: '0 0 8px rgba(255, 215, 0, 0.9), 0 0 16px rgba(255, 165, 0, 0.7)',
                          filter: 'drop-shadow(0 0 4px gold)',
                        }}
                      >
                        ⭐
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
