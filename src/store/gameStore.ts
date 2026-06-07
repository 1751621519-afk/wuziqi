import { create } from 'zustand';
import { Board, Stone, Difficulty, createEmptyBoard, checkWin, checkDraw } from '@/utils/rules';
import { getAIMove, getHintMove, getAIMovePinkMode } from '@/utils/ai';

type GamePhase = 'idle' | 'playing' | 'finished';

interface NextGameEffects {
  aiForceEasy: boolean;
  undoCount: number;
  luckyStars: boolean;
  pinkBoard: boolean;
}

interface GameState {
  board: Board;
  phase: GamePhase;
  playerColor: Stone;
  difficulty: Difficulty;
  currentTurn: 'black' | 'white';
  winner: Stone;
  winLine: [number, number][] | null;
  isDraw: boolean;
  isDrawLocked: boolean;
  isAIThinking: boolean;
  lastMove: [number, number] | null;

  // 提示系统
  hintCount: number;
  isHintComputing: boolean;
  hintPosition: [number, number] | null;
  hintPendingConfirm: boolean;
  hintAutoClearTimer: number | null;

  // 连败彩蛋
  consecutiveLosses: number;
  easterEggActive: boolean;
  nextGameEffects: NextGameEffects;

  // 悔棋
  undoCount: number;
  boardHistory: Board[];

  // 棋盘特效
  pinkBoardActive: boolean;
  pinkBoardPrankText: boolean;
  pinkBoardAIDodging: boolean;
  luckyStarsActive: boolean;
  starSparklePosition: [number, number] | null;
  luckyStarsWinCrown: boolean;

  // 移动端性能保险
  mobileDepthReduced: boolean;
  mobileStrainCount: number;

  // Actions
  setPlayerColor: (color: 'black' | 'white') => void;
  setDifficulty: (d: Difficulty) => void;
  startGame: () => void;
  placeStone: (row: number, col: number) => void;
  triggerAIMove: () => void;
  resetGame: () => void;

  // 提示
  requestHint: () => void;
  requestHintConfirm: () => void;
  cancelHintConfirm: () => void;
  executeHint: () => void;
  useHint: (pos: [number, number]) => void;
  clearHint: () => void;

  // 悔棋
  undoMove: () => void;

  // 彩蛋
  applyEasterEgg: (option: number) => void;

  // 棋盘特效
  setPinkBoardActive: (v: boolean) => void;

  // 平局锁定
  setDrawLocked: (v: boolean) => void;
}

function getAIColor(playerColor: 'black' | 'white'): 'black' | 'white' {
  return playerColor === 'black' ? 'white' : 'black';
}

function getHintCountByDifficulty(d: Difficulty): number {
  if (d === 'hard') return 2;
  if (d === 'medium') return 1;
  return 0;
}

export const useGameStore = create<GameState>((set, get) => ({
  board: createEmptyBoard(),
  phase: 'idle',
  playerColor: null,
  difficulty: 'medium',
  currentTurn: 'black',
  winner: null,
  winLine: null,
  isDraw: false,
  isDrawLocked: false,
  isAIThinking: false,
  lastMove: null,

  // 提示
  hintCount: 1,
  isHintComputing: false,
  hintPosition: null,
  hintPendingConfirm: false,
  hintAutoClearTimer: null,

  // 连败
  consecutiveLosses: 0,
  easterEggActive: false,
  nextGameEffects: { aiForceEasy: false, undoCount: 0, luckyStars: false, pinkBoard: false },

  // 悔棋
  undoCount: 0,
  boardHistory: [],

  // 特效
  pinkBoardActive: false,
  pinkBoardPrankText: false,
  pinkBoardAIDodging: false,
  luckyStarsActive: false,
  starSparklePosition: null,
  luckyStarsWinCrown: false,

  // 移动端性能
  mobileDepthReduced: false,
  mobileStrainCount: 0,

  // ========== 基础操作 ==========

  setPlayerColor: (color) => {
    const d = get().difficulty;
    set({ playerColor: color, hintCount: getHintCountByDifficulty(d) });
  },

  setDifficulty: (d) => {
    set({ difficulty: d, hintCount: getHintCountByDifficulty(d) });
  },

  startGame: () => {
    const { playerColor, nextGameEffects } = get();
    if (!playerColor) return;

    // 应用下一局效果
    const effects = { ...nextGameEffects };
    const newBoard = createEmptyBoard();
    const effectiveDifficulty = effects.aiForceEasy ? 'easy' : get().difficulty;

    set({
      board: newBoard,
      phase: 'playing',
      difficulty: effectiveDifficulty,
      currentTurn: 'black',
      winner: null,
      winLine: null,
      isDraw: false,
      isDrawLocked: false,
      isAIThinking: false,
      lastMove: null,
      hintPosition: null,
      isHintComputing: false,
      hintPendingConfirm: false,
      undoCount: effects.undoCount,
      boardHistory: [],
      pinkBoardActive: effects.pinkBoard,
      pinkBoardPrankText: effects.pinkBoard,
      pinkBoardAIDodging: false,
      luckyStarsActive: effects.luckyStars,
      starSparklePosition: null,
      luckyStarsWinCrown: false,
      nextGameEffects: { aiForceEasy: false, undoCount: 0, luckyStars: false, pinkBoard: false },
    });

    // 粉色飘字5秒后消失
    if (effects.pinkBoard) {
      setTimeout(() => set({ pinkBoardPrankText: false }), 5000);
    }

    // 玩家执白则AI先下
    if (playerColor === 'white') {
      setTimeout(() => get().triggerAIMove(), 50);
    }
  },

  placeStone: (row, col) => {
    if (get().isDrawLocked) return;
    const { board, phase, currentTurn, playerColor, boardHistory, luckyStarsActive, hintAutoClearTimer } = get();
    if (phase !== 'playing') return;
    if (board[row][col] !== null) return;

    const playerStone = playerColor;
    const aiColor = getAIColor(playerColor!);

    if (currentTurn !== playerStone) return;

    // 存储当前棋盘快照用于悔棋
    const newHistory = [...boardHistory, board.map(r => [...r])];

    const newBoard = board.map(r => [...r]);
    newBoard[row][col] = playerStone!;

    // 清除提示（玩家落子到提示位置则立即清除）
    const hintPos = get().hintPosition;

    // 取消提示自动清除定时器
    if (hintAutoClearTimer !== null) {
      clearTimeout(hintAutoClearTimer);
    }

    const winLine = checkWin(newBoard, row, col);
    const isDraw = !winLine && checkDraw(newBoard);

    if (winLine) {
      set({
        board: newBoard,
        phase: 'finished',
        winner: playerStone,
        winLine,
        lastMove: [row, col],
        boardHistory: newHistory,
        currentTurn: currentTurn === 'black' ? 'white' : 'black',
        hintPosition: null,
        hintAutoClearTimer: null,
        consecutiveLosses: 0,
        luckyStarsWinCrown: luckyStarsActive ? true : get().luckyStarsWinCrown,
      });
      return;
    }

    if (isDraw) {
      set({
        board: newBoard,
        phase: 'finished',
        isDraw: true,
        lastMove: [row, col],
        boardHistory: newHistory,
        currentTurn: currentTurn === 'black' ? 'white' : 'black',
        hintPosition: null,
        hintAutoClearTimer: null,
      });
      return;
    }

    // 幸运星闪烁效果
    let sparklePos: [number, number] | null = null;
    if (luckyStarsActive) {
      sparklePos = [row, col];
    }

    set({
      board: newBoard,
      currentTurn: aiColor,
      lastMove: [row, col],
      boardHistory: newHistory,
      hintPosition: hintPos && hintPos[0] === row && hintPos[1] === col ? null : hintPos,
      hintAutoClearTimer: hintPos && hintPos[0] === row && hintPos[1] === col ? null : hintAutoClearTimer,
      starSparklePosition: sparklePos,
    });

    // 星星闪烁500ms后消失
    if (sparklePos) {
      setTimeout(() => set({ starSparklePosition: null }), 500);
    }

    setTimeout(() => get().triggerAIMove(), 100);
  },

  triggerAIMove: () => {
    const { board, phase, playerColor, difficulty, currentTurn, boardHistory } = get();
    if (phase !== 'playing') return;

    const aiColor = getAIColor(playerColor!);
    if (currentTurn !== aiColor) return;

    // 存储AI移动前的棋盘快照用于悔棋
    const newHistory = [...boardHistory, board.map(r => [...r])];

    if (difficulty === 'hard') {
      set({ isAIThinking: true, boardHistory: newHistory });
    } else {
      set({ boardHistory: newHistory });
    }

    // 使用闭包捕获的board，避免setTimeout中状态变化
    const capturedBoard = board.map(r => [...r]);

    setTimeout(() => {
      const state = get();
      if (state.phase !== 'playing') {
        set({ isAIThinking: false });
        return;
      }
      try {
        // 移动端性能保险
        const isMobile = window.innerWidth <= 768;
        const depthReduction = (isMobile && state.difficulty === 'hard' && state.mobileDepthReduced) ? 2 : 0;
        const t0 = performance.now();

        const result = state.pinkBoardActive
          ? getAIMovePinkMode(capturedBoard)
          : getAIMove(
              capturedBoard,
              aiColor,
              state.playerColor!,
              state.difficulty,
              depthReduction
            );

        const elapsed = performance.now() - t0;

        // 移动端高难度：检测性能压力
        let newStrainCount = state.mobileStrainCount;
        let newDepthReduced = state.mobileDepthReduced;
        if (isMobile && state.difficulty === 'hard') {
          if (elapsed > 2000) {
            newStrainCount++;
            if (newStrainCount >= 2) {
              newDepthReduced = true;
            }
          }
        }

        const newBoard = capturedBoard.map(r => [...r]);
        newBoard[result.row][result.col] = aiColor;

        const winLine = checkWin(newBoard, result.row, result.col);
        const isDraw = !winLine && checkDraw(newBoard);

        if (winLine) {
          set({
            board: newBoard,
            phase: 'finished',
            winner: aiColor,
            winLine,
            isAIThinking: false,
            lastMove: [result.row, result.col],
            consecutiveLosses: state.consecutiveLosses + 1,
            mobileStrainCount: newStrainCount,
            mobileDepthReduced: newDepthReduced,
          });
          return;
        }

        if (isDraw) {
          set({
            board: newBoard,
            phase: 'finished',
            isDraw: true,
            isAIThinking: false,
            lastMove: [result.row, result.col],
            mobileStrainCount: newStrainCount,
            mobileDepthReduced: newDepthReduced,
          });
          return;
        }

        // 粉板AI闪避提示
        const dodgingFlag = state.pinkBoardActive;

        set({
          board: newBoard,
          currentTurn: state.playerColor!,
          isAIThinking: false,
          lastMove: [result.row, result.col],
          mobileStrainCount: newStrainCount,
          mobileDepthReduced: newDepthReduced,
          pinkBoardAIDodging: dodgingFlag ? true : state.pinkBoardAIDodging,
        });

        // 闪避文字1.5秒后消失
        if (dodgingFlag) {
          setTimeout(() => set({ pinkBoardAIDodging: false }), 1500);
        }
      } catch {
        set({ isAIThinking: false });
      }
    }, 50);
  },

  resetGame: () => {
    // 清除提示自动清除定时器
    const timer = get().hintAutoClearTimer;
    if (timer !== null) {
      clearTimeout(timer);
    }

    set({
      board: createEmptyBoard(),
      phase: 'idle',
      playerColor: null,
      currentTurn: 'black',
      winner: null,
      winLine: null,
      isDraw: false,
      isDrawLocked: false,
      isAIThinking: false,
      lastMove: null,
      hintPosition: null,
      isHintComputing: false,
      hintPendingConfirm: false,
      hintAutoClearTimer: null,
      undoCount: 0,
      boardHistory: [],
      pinkBoardActive: false,
      pinkBoardPrankText: false,
      pinkBoardAIDodging: false,
      luckyStarsActive: false,
      starSparklePosition: null,
      luckyStarsWinCrown: false,
      nextGameEffects: { aiForceEasy: false, undoCount: 0, luckyStars: false, pinkBoard: false },
      hintCount: getHintCountByDifficulty(get().difficulty),
    });
  },

  // ========== 提示 ==========

  requestHint: () => {
    const { hintPendingConfirm } = get();

    if (hintPendingConfirm) {
      // 第二步：确认执行
      get().executeHint();
    } else {
      // 第一步：请求确认
      get().requestHintConfirm();
    }
  },

  requestHintConfirm: () => {
    set({ hintPendingConfirm: true });
  },

  cancelHintConfirm: () => {
    set({ hintPendingConfirm: false });
  },

  executeHint: () => {
    const { board, playerColor, phase, isHintComputing, hintCount, difficulty, currentTurn } = get();
    if (phase !== 'playing') return;
    if (isHintComputing) return;
    if (hintCount <= 0) return;
    if (currentTurn !== playerColor) return;

    // 100ms后如果还没完成，显示"计算中…"
    let computingTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      set({ isHintComputing: true });
    }, 100);

    // 异步计算
    setTimeout(() => {
      const state = get();
      try {
        const result = getHintMove(
          state.board.map(r => [...r]),
          state.playerColor!,
          getAIColor(state.playerColor!),
          state.difficulty
        );
        if (computingTimer) { clearTimeout(computingTimer); computingTimer = null; }
        set({
          isHintComputing: false,
          hintPosition: [result.row, result.col],
          hintCount: state.hintCount - 1,
          hintPendingConfirm: false,
        });

        // 5秒后自动清除高亮
        const autoClearTimer = setTimeout(() => {
          get().clearHint();
        }, 5000);
        set({ hintAutoClearTimer: autoClearTimer as unknown as number });
      } catch {
        if (computingTimer) { clearTimeout(computingTimer); computingTimer = null; }
        set({ isHintComputing: false, hintPendingConfirm: false });
      }
    }, 0);
  },

  useHint: (pos) => {
    set({ hintPosition: null });
  },

  clearHint: () => {
    const timer = get().hintAutoClearTimer;
    if (timer !== null) {
      clearTimeout(timer);
    }
    set({ hintPosition: null, hintAutoClearTimer: null });
  },

  // ========== 悔棋 ==========

  undoMove: () => {
    const { undoCount, boardHistory, phase, playerColor, currentTurn, isAIThinking, board } = get();
    if (phase !== 'playing') return;
    if (undoCount <= 0) return;
    if (currentTurn !== playerColor) return;
    if (isAIThinking) return;
    // 至少需要2个历史条目才能撤销一对（玩家+AI各一步）
    if (boardHistory.length < 2) return;

    // 棋盘上至少要有2颗棋子
    let stoneCount = 0;
    for (let r = 0; r < 15; r++)
      for (let c = 0; c < 15; c++)
        if (board[r][c]) stoneCount++;
    if (stoneCount < 2) return;

    // 弹出2个条目：撤消玩家上一步和AI上一步
    const newHistory = boardHistory.slice(0, -2);
    const prevBoard = boardHistory[boardHistory.length - 2];

    set({
      board: prevBoard,
      currentTurn: playerColor!,
      boardHistory: newHistory,
      undoCount: undoCount - 1,
      isAIThinking: false,
      lastMove: null,
      hintPosition: null,
    });
  },

  // ========== 彩蛋 ==========

  applyEasterEgg: (option: number) => {
    const state = get();
    const updates: Partial<GameState> = { easterEggActive: false };

    switch (option) {
      case 1: // 再给点提示 hintCount + 1
        updates.hintCount = state.hintCount + 1;
        break;
      case 2: // AI放放水 aiForceEasy
        updates.nextGameEffects = {
          ...state.nextGameEffects,
          aiForceEasy: true,
        };
        break;
      case 3: // 悔两步 undoCount = 2
        updates.nextGameEffects = {
          ...state.nextGameEffects,
          undoCount: 2,
        };
        break;
      case 4: // 幸运星指引 luckyStars = true
        updates.nextGameEffects = {
          ...state.nextGameEffects,
          luckyStars: true,
        };
        break;
      case 5: // 棋盘恶作剧 pinkBoard = true
        updates.nextGameEffects = {
          ...state.nextGameEffects,
          pinkBoard: true,
        };
        break;
    }

    // 重置游戏到空闲状态，让玩家设置并开始新一局
    set({
      ...updates,
      board: createEmptyBoard(),
      phase: 'idle',
      playerColor: null,
      currentTurn: 'black',
      winner: null,
      winLine: null,
      isDraw: false,
      isAIThinking: false,
      lastMove: null,
      hintPosition: null,
      isHintComputing: false,
      hintPendingConfirm: false,
      undoCount: 0,
      boardHistory: [],
      pinkBoardActive: false,
      pinkBoardPrankText: false,
      pinkBoardAIDodging: false,
      luckyStarsActive: false,
      starSparklePosition: null,
      luckyStarsWinCrown: false,
    });
  },

  setPinkBoardActive: (v) => set({ pinkBoardActive: v }),

  setDrawLocked: (v) => set({ isDrawLocked: v }),
}));
