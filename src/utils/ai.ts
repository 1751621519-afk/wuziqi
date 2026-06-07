import { Board, Stone, BOARD_SIZE, checkWin, getNearbyEmptyCells, getEmptyCells } from './rules';

export interface AIMoveResult { row: number; col: number; }

const DIRS: [number, number][] = [[0, 1], [1, 0], [1, 1], [1, -1]];
const WIN_SCORE = 1000000;

// ========== Pattern evaluation ==========

const PAT: Record<string, number> = {
  '5': 1000000,
  '4,2': 500000, '4,1': 10000,
  '3,2': 5000, '3,1': 500,
  '2,2': 200, '2,1': 50,
};

function analyzeDir(
  board: Board, r: number, c: number, dr: number, dc: number, stone: Stone
): { count: number; open: number } | null {
  const pr = r - dr, pc = c - dc;
  if (pr >= 0 && pr < BOARD_SIZE && pc >= 0 && pc < BOARD_SIZE && board[pr][pc] === stone) return null;
  let count = 1;
  for (let i = 1; i < 5; i++) {
    const nr = r + dr * i, nc = c + dc * i;
    if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === stone) count++;
    else break;
  }
  let open = 0;
  if (pr >= 0 && pr < BOARD_SIZE && pc >= 0 && pc < BOARD_SIZE && board[pr][pc] === null) open++;
  const nr2 = r + dr * count, nc2 = c + dc * count;
  if (nr2 >= 0 && nr2 < BOARD_SIZE && nc2 >= 0 && nc2 < BOARD_SIZE && board[nr2][nc2] === null) open++;
  return { count, open };
}

function evaluateBoard(board: Board, aiStone: Stone, playerStone: Stone): number {
  let score = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const stone = board[r][c];
      if (!stone) continue;
      const sign = stone === aiStone ? 1 : -1;
      let open4 = 0, closed4 = 0, open3 = 0;
      for (const [dr, dc] of DIRS) {
        const res = analyzeDir(board, r, c, dr, dc, stone);
        if (!res) continue;
        const key = `${res.count},${res.open}`;
        const s = PAT[key];
        if (s) score += sign * s;
        if (res.count >= 5) { /* already scored */ }
        else if (res.count === 4 && res.open === 2) open4++;
        else if (res.count === 4 && res.open === 1) closed4++;
        else if (res.count === 3 && res.open === 2) open3++;
      }
      if (open3 >= 2) score += sign * 50000;
      if (open4 >= 1 && open3 >= 1) score += sign * 100000;
      if (open4 >= 2) score += sign * 100000;
      if (closed4 >= 1 && open3 >= 1) score += sign * 50000;
    }
  }
  return score;
}

// ========== Simple evaluation for medium/easy (no combos) ==========
function evaluateBoardSimple(board: Board, aiStone: Stone, playerStone: Stone): number {
  let score = 0;
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const stone = board[r][c];
      if (!stone) continue;
      const sign = stone === aiStone ? 1 : -1;
      for (const [dr, dc] of DIRS) {
        const res = analyzeDir(board, r, c, dr, dc, stone);
        if (!res) continue;
        const s = PAT[`${res.count},${res.open}`];
        if (s) score += sign * s;
      }
    }
  }
  return score;
}

// ========== Move ordering heuristic ==========

function moveScore(board: Board, r: number, c: number, stone: Stone, opponent: Stone): number {
  let score = 0;
  for (const [dr, dc] of DIRS) {
    let count = 1, openEnds = 0;
    for (let i = 1; i <= 4; i++) {
      const nr = r + dr * i, nc = c + dc * i;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === stone) count++;
      else {
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === null) openEnds++;
        break;
      }
    }
    for (let i = 1; i <= 4; i++) {
      const nr = r - dr * i, nc = c - dc * i;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === stone) count++;
      else {
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === null) openEnds++;
        break;
      }
    }
    if (count >= 5) score += 100000;
    else if (count === 4 && openEnds >= 1) score += 10000;
    else if (count === 4) score += 1000;
    else if (count === 3 && openEnds >= 2) score += 5000;
    else if (count === 3 && openEnds === 1) score += 500;
    else if (count === 2 && openEnds >= 2) score += 200;
    else if (count === 2 && openEnds === 1) score += 50;
    else if (count === 1 && openEnds >= 2) score += 10;
  }
  return score;
}

// ========== Threat detection ==========

function findWin(board: Board, stone: Stone): [number, number] | null {
  for (const [r, c] of getEmptyCells(board)) {
    board[r][c] = stone;
    if (checkWin(board, r, c)) { board[r][c] = null; return [r, c]; }
    board[r][c] = null;
  }
  return null;
}

function findOpen4(board: Board, stone: Stone): [number, number][] {
  const results: [number, number][] = [];
  for (const [r, c] of getEmptyCells(board)) {
    board[r][c] = stone;
    for (const [dr, dc] of DIRS) {
      let count = 1, openEnds = 0;
      for (let i = 1; i <= 4; i++) {
        const nr = r + dr * i, nc = c + dc * i;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === stone) count++;
        else { if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === null) openEnds++; break; }
      }
      for (let i = 1; i <= 4; i++) {
        const nr = r - dr * i, nc = c - dc * i;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === stone) count++;
        else { if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === null) openEnds++; break; }
      }
      if (count === 4 && openEnds === 2) {
        board[r][c] = null;
        results.push([r, c]);
        break;
      }
    }
    board[r][c] = null;
  }
  return results;
}

function findBlockOpen4(board: Board, stone: Stone): [number, number] | null {
  const open4s = findOpen4(board, stone);
  if (open4s.length === 0) return null;
  const [tr, tc] = open4s[0];
  board[tr][tc] = stone;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = tr + dr, nc = tc + dc;
      if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === null) {
        board[tr][tc] = null;
        return [nr, nc];
      }
    }
  }
  board[tr][tc] = null;
  return null;
}

// ========== Minimax + Alpha-Beta + Null-move ==========

interface SearchResult {
  move: [number, number] | null;
  score: number;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  maxStone: Stone,
  minStone: Stone,
  startTime: number,
  timeLimit: number,
  evaluator: (board: Board, ai: Stone, pl: Stone) => number,
): SearchResult {
  if (performance.now() - startTime > timeLimit) {
    return { move: null, score: 0 };
  }

  const curStone = isMaximizing ? maxStone : minStone;
  const oppStone = isMaximizing ? minStone : maxStone;

  if (depth === 0) {
    return { move: null, score: evaluator(board, maxStone, minStone) };
  }

  // Null-move pruning
  if (depth >= 3) {
    const inCheck = findWin(board, oppStone) !== null;
    if (!inCheck) {
      const nullResult = minimax(board, depth - 3, -beta, -beta + 1, !isMaximizing, maxStone, minStone, startTime, timeLimit, evaluator);
      if (isMaximizing && nullResult.score >= beta) return { move: null, score: beta };
      if (!isMaximizing && nullResult.score <= alpha) return { move: null, score: alpha };
    }
  }

  const candidates = getNearbyEmptyCells(board, 2);
  if (candidates.length === 0) {
    return { move: null, score: 0 };
  }

  candidates.sort((a, b) => {
    const sa = moveScore(board, a[0], a[1], curStone, oppStone) +
               moveScore(board, a[0], a[1], oppStone, curStone) * 0.5;
    const sb = moveScore(board, b[0], b[1], curStone, oppStone) +
               moveScore(board, b[0], b[1], oppStone, curStone) * 0.5;
    return sb - sa;
  });

  let bestMove: [number, number] | null = null;

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const [r, c] of candidates) {
      if (performance.now() - startTime > timeLimit) break;
      board[r][c] = curStone;
      if (checkWin(board, r, c)) {
        board[r][c] = null;
        return { move: [r, c], score: WIN_SCORE + depth };
      }
      const result = minimax(board, depth - 1, alpha, beta, false, maxStone, minStone, startTime, timeLimit, evaluator);
      board[r][c] = null;
      if (result.score > maxScore) { maxScore = result.score; bestMove = [r, c]; }
      alpha = Math.max(alpha, maxScore);
      if (alpha >= beta) break;
    }
    return { move: bestMove, score: maxScore };
  } else {
    let minScore = Infinity;
    for (const [r, c] of candidates) {
      if (performance.now() - startTime > timeLimit) break;
      board[r][c] = curStone;
      if (checkWin(board, r, c)) {
        board[r][c] = null;
        return { move: [r, c], score: -WIN_SCORE - depth };
      }
      const result = minimax(board, depth - 1, alpha, beta, true, maxStone, minStone, startTime, timeLimit, evaluator);
      board[r][c] = null;
      if (result.score < minScore) { minScore = result.score; bestMove = [r, c]; }
      beta = Math.min(beta, minScore);
      if (alpha >= beta) break;
    }
    return { move: bestMove, score: minScore };
  }
}

// ========== Iterative deepening search ==========

function search(
  board: Board,
  maxStone: Stone,
  minStone: Stone,
  maxDepth: number,
  timeLimit: number,
  startTime: number,
  evaluator: (board: Board, ai: Stone, pl: Stone) => number,
): AIMoveResult {
  const maxWin = findWin(board, maxStone);
  if (maxWin) return { row: maxWin[0], col: maxWin[1] };
  const minWin = findWin(board, minStone);
  if (minWin) return { row: minWin[0], col: minWin[1] };

  let candidates = getNearbyEmptyCells(board, 2);
  if (candidates.length === 0) {
    const all = getEmptyCells(board);
    if (all.length === 0) {
      const center = Math.floor(BOARD_SIZE / 2);
      return { row: center, col: center };
    }
    const [r, c] = all[Math.floor(Math.random() * all.length)];
    return { row: r, col: c };
  }

  candidates.sort((a, b) => {
    const sa = moveScore(board, a[0], a[1], maxStone, minStone) +
               moveScore(board, a[0], a[1], minStone, maxStone) * 0.5;
    const sb = moveScore(board, b[0], b[1], maxStone, minStone) +
               moveScore(board, b[0], b[1], minStone, maxStone) * 0.5;
    return sb - sa;
  });

  const topN = candidates.slice(0, 20);
  let bestMove: [number, number] | null = null;

  for (let d = 2; d <= maxDepth; d += 2) {
    if (performance.now() - startTime > timeLimit) break;
    let bestScore = -Infinity;
    let currentBest: [number, number] | null = topN[0];

    for (const [r, c] of topN) {
      if (performance.now() - startTime > timeLimit) break;
      if (board[r][c] !== null) continue;
      board[r][c] = maxStone;
      if (checkWin(board, r, c)) {
        board[r][c] = null;
        return { row: r, col: c };
      }
      const result = minimax(board, d - 1, -Infinity, Infinity, false, maxStone, minStone, startTime, timeLimit, evaluator);
      board[r][c] = null;
      if (result.score > bestScore) { bestScore = result.score; currentBest = [r, c]; }
    }
    if (currentBest) bestMove = currentBest;
  }

  if (bestMove) return { row: bestMove[0], col: bestMove[1] };
  const [r, c] = topN[Math.floor(Math.random() * Math.min(5, topN.length))];
  return { row: r, col: c };
}

// ========== Public API ==========

export function getHintMove(
  board: Board,
  playerStone: Stone,
  aiStone: Stone,
  difficulty: 'easy' | 'medium' | 'hard',
): AIMoveResult {
  const all = getEmptyCells(board);
  if (all.length === BOARD_SIZE * BOARD_SIZE) {
    return { row: 7, col: 7 };
  }

  const pw = findWin(board, playerStone);
  if (pw) return { row: pw[0], col: pw[1] };
  const aw = findWin(board, aiStone);
  if (aw) return { row: aw[0], col: aw[1] };

  const depth = difficulty === 'hard' ? 8 : difficulty === 'medium' ? 4 : 2;
  const evalFn = difficulty === 'hard' ? evaluateBoard : evaluateBoardSimple;
  const startTime = performance.now();
  return search(board, playerStone, aiStone, depth, 500, startTime, evalFn);
}

export function getAIMove(
  board: Board,
  aiStone: Stone,
  playerStone: Stone,
  difficulty: 'easy' | 'medium' | 'hard',
  depthReduction: number = 0,
): AIMoveResult {
  const all = getEmptyCells(board);

  if (all.length === BOARD_SIZE * BOARD_SIZE) {
    return { row: 7, col: 7 };
  }

  const aiWin = findWin(board, aiStone);
  if (aiWin) return { row: aiWin[0], col: aiWin[1] };
  const plWin = findWin(board, playerStone);
  if (plWin) return { row: plWin[0], col: plWin[1] };

  // Easy: block opponent open-4, then 30% random
  if (difficulty === 'easy') {
    const block = findBlockOpen4(board, playerStone);
    if (block) return { row: block[0], col: block[1] };
    if (Math.random() < 0.3) {
      const nearby = getNearbyEmptyCells(board, 1);
      if (nearby.length > 0) {
        const [r, c] = nearby[Math.floor(Math.random() * nearby.length)];
        return { row: r, col: c };
      }
    }
  }

  let depth: number, timeLimit: number;
  switch (difficulty) {
    case 'easy': depth = 2; timeLimit = 200; break;
    case 'medium': depth = 4; timeLimit = 200; break;
    case 'hard': depth = 8; timeLimit = 2000; break;
  }

  depth = Math.max(2, depth - depthReduction);
  const evalFn = difficulty === 'hard' ? evaluateBoard : evaluateBoardSimple;
  const startTime = performance.now();
  return search(board, aiStone, playerStone, depth, timeLimit, startTime, evalFn);
}

export function getAIMovePinkMode(board: Board): AIMoveResult {
  const center = Math.floor(BOARD_SIZE / 2);
  const empty = getEmptyCells(board);
  let best: [number, number] = [0, 0];
  let bestDist = -1;
  for (const [r, c] of empty) {
    const dist = Math.abs(r - center) + Math.abs(c - center);
    if (dist > bestDist) { bestDist = dist; best = [r, c]; }
  }
  return { row: best[0], col: best[1] };
}
