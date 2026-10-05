'use client';
import type { OpeningState, OpeningAction } from '@/lib/survival-opening';
import type { SurvivalAction } from '@/lib/survival-room';
import InventoryDrag from './inventory-drag';
import EquipmentBoard from './equipment';
import CargoGrid from './cargo';
export default function LiftTerminal({
  state,
  act,
}: {
  state: OpeningState;
  act: (a: OpeningAction) => void;
}) {
  const inventory = (action: SurvivalAction) =>
    act({ type: 'inventory', action });
  return (
    <div className="lift-terminal-inventory">
      {state.afterlight.phase === 'equip-module' && (
        <p className="module-lesson">
          拖入增幅模块，紧贴手机或电筒。空格会断开连接。
        </p>
      )}
      <InventoryDrag state={state.room} act={inventory}>
        <EquipmentBoard state={state.room} editing minimal act={inventory} />
        <CargoGrid
          state={state.room}
          minimal
          act={inventory}
          focusBread={state.afterlight.phase === 'eat-food'}
          allowStorage={state.stage === 'home'}
        />
      </InventoryDrag>
    </div>
  );
}
