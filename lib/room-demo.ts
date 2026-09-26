// Isolated room-exploration prototype. Never reads or writes an adventure save.
export type RoomDemo = {
  room: number;
  visited: number[];
  searched: boolean;
  pad: 'none' | 'item' | 'card';
  glue: number;
  scanner: number;
  valves: number[];
  moves: number;
  assisted: boolean;
  repaired: boolean;
  cleared: boolean;
  weapon: boolean;
  returned: boolean;
};
export const newRoomDemo = (): RoomDemo => ({
  room: 0,
  visited: [0],
  searched: false,
  pad: 'none',
  glue: 0,
  scanner: 0,
  valves: [0, 1, 0],
  moves: 8,
  assisted: false,
  repaired: false,
  cleared: false,
  weapon: false,
  returned: false,
});
export type RoomAction =
  | { type: 'travel'; room: number }
  | {
      type:
        | 'search'
        | 'assist'
        | 'reset-pipes'
        | 'repair'
        | 'identify'
        | 'victory'
        | 'return';
    }
  | { type: 'turn'; index: number };
export function roomAction(s: RoomDemo, a: RoomAction): RoomDemo {
  switch (a.type) {
    case 'travel': {
      if (
        !Number.isInteger(a.room) ||
        a.room < 0 ||
        a.room > 3 ||
        Math.abs(a.room - s.room) !== 1
      )
        return s;
      if (s.returned || (s.room === 2 && a.room === 3 && !s.repaired)) return s;
      return {
        ...s,
        room: a.room,
        visited: [...new Set([...s.visited, a.room])],
      };
    }
    case 'search':
      return s.room === 1 && !s.searched
        ? { ...s, searched: true, pad: 'item', glue: 1 }
        : s;
    case 'turn':
      return s.room === 2 &&
        !s.repaired &&
        s.moves > 0 &&
        Number.isInteger(a.index) &&
        a.index >= 0 &&
        a.index < 3
        ? {
            ...s,
            moves: s.moves - 1,
            valves: s.valves.map((x, i) => (i === a.index ? 1 - x : x)),
          }
        : s;
    case 'assist':
      return s.room === 2 && !s.repaired && s.glue > 0 && !s.assisted
        ? { ...s, glue: s.glue - 1, moves: s.moves + 4, assisted: true }
        : s;
    case 'reset-pipes':
      return s.room === 2 && !s.repaired
        ? { ...s, valves: [0, 1, 0], moves: s.assisted ? 12 : 8 }
        : s;
    case 'repair':
      return s.room === 2 && !s.repaired && s.valves.every(Boolean)
        ? { ...s, repaired: true, scanner: s.scanner + 1 }
        : s;
    case 'identify':
      return s.pad === 'item' && s.scanner > 0
        ? { ...s, pad: 'card', scanner: s.scanner - 1 }
        : s;
    case 'victory':
      return s.room === 3 && !s.cleared
        ? { ...s, cleared: true, weapon: true }
        : s;
    case 'return':
      return s.room === 0 && s.cleared ? { ...s, returned: true } : s;
  }
}
export const ROOM_INFO = [
  {
    title: '电梯前厅',
    tag: 'THRESHOLD',
    number: '00',
    description: '门外没有风，灯却一直在晃。',
    goal: '穿过前厅，进入储物间。',
  },
  {
    title: '遗落的储物间',
    tag: 'SCAVENGE',
    number: '01',
    description: '有人匆忙离开，留下了一只工具箱。',
    goal: '搜刮物资，或继续前往泵房。',
  },
  {
    title: '低压泵房',
    tag: 'RESTORE',
    number: '02',
    description: '蒸汽堵住了通道。把管道接通，让房间安静下来。',
    goal: '旋转三段管道，使水流从左侧通向右侧。',
  },
  {
    title: '守卫的房间',
    tag: 'ENCOUNTER',
    number: '03',
    description: '装备台后面，那个东西还在呼吸。',
    goal: '调查装备台，击退守卫。',
  },
] as const;
