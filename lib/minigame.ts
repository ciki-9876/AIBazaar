import { initialPipes, PIPE_SHAPES, pipeConnected } from './tutorial-pipes.ts';
export type MinigameState = {
  key: string;
  moves: number;
  bonus: number;
  used: number;
  board: number[];
  status: 'playing' | 'completed' | 'skipped';
  stars: number;
};
export const rewardStars = (remaining: number) =>
  remaining < 2 ? 1 : remaining < 4 ? 2 : 3;
// The shell owns budgets and rewards; adapters own board input and completion.
export const MINIGAMES = {
  pressure: {
    title: '泄压气室',
    moves: 12,
    initial: initialPipes,
    complete: pipeConnected,
    play(board: number[], index: number) {
      if (!Number.isInteger(index) || !PIPE_SHAPES[index])
        throw Error('请选择可转动的管道');
      return board.map((v, i) => (i === index ? (v + 1) % 4 : v));
    },
  },
};
export function startMinigame(
  seed: number,
  key: keyof typeof MINIGAMES = 'pressure',
): MinigameState {
  const game = MINIGAMES[key];
  return {
    key,
    moves: game.moves,
    bonus: 0,
    used: 0,
    board: game.initial(seed),
    status: 'playing',
    stars: 0,
  };
}
