export type Stone = 'black' | 'white' | null;
export type Board = Stone[][];
export type Difficulty = 'easy' | 'medium' | 'hard';

export const BOARD_SIZE = 15;

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

/** 检测在(row,col)落子后是否形成五连，返回获胜的五子坐标数组 */
export function checkWin(board: Board, row: number, col: number): [number, number][] | null {
  const stone = board[row][col];
  if (!stone) return null;

  const directions = [
    [0, 1],   // 水平
    [1, 0],   // 垂直
    [1, 1],   // 对角线
    [1, -1],  // 反对角线
  ];

  for (const [dr, dc] of directions) {
    const line: [number, number][] = [[row, col]];

    // 正方向延伸
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === stone) {
        line.push([r, c]);
      } else break;
    }

    // 反方向延伸
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === stone) {
        line.unshift([r, c]);
      } else break;
    }

    if (line.length >= 5) {
      return line.slice(0, 5);
    }
  }
  return null;
}

/** 检测棋盘是否已满（平局） */
export function checkDraw(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) return false;
    }
  }
  return true;
}

/** 获取所有空位 */
export function getEmptyCells(board: Board): [number, number][] {
  const cells: [number, number][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] === null) cells.push([r, c]);
    }
  }
  return cells;
}

/** 获取靠近已有棋子的空位（用于缩小搜索范围） */
export function getNearbyEmptyCells(board: Board, radius: number = 2): [number, number][] {
  const candidateSet = new Set<string>();
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== null) {
        for (let dr = -radius; dr <= radius; dr++) {
          for (let dc = -radius; dc <= radius; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === null) {
              candidateSet.add(`${nr},${nc}`);
            }
          }
        }
      }
    }
  }

  const result: [number, number][] = [];
  for (const key of candidateSet) {
    const [r, c] = key.split(',').map(Number);
    result.push([r, c]);
  }
  return result;
}
