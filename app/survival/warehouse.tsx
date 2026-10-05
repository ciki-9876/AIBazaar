'use client';
import type { OpeningAction, OpeningState } from '@/lib/survival-opening';
import type { SurvivalAction } from '@/lib/survival-room';
import InventoryDrag from './inventory-drag';
import CargoGrid from './cargo';

export default function Warehouse({
  state,
  act,
}: {
  state: OpeningState;
  act: (a: OpeningAction) => void;
}) {
  const inventory = (action: SurvivalAction) =>
    act({ type: 'inventory', action });
  return (
    <InventoryDrag state={state.room} act={inventory}>
      <div className="warehouse-layout">
        <CargoGrid state={state.room} act={inventory} minimal allowStorage />
        <CargoGrid
          state={state.room}
          act={inventory}
          minimal
          zone="warehouse"
          allowStorage
        />
      </div>
      <small className="warehouse-note">电梯内保管 · 每升一级增加4格</small>
    </InventoryDrag>
  );
}
