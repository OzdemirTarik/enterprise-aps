import { useEffect } from 'react';
import { useScheduleStore } from '../store/useScheduleStore';
import { scheduleApi } from '../services/api';

export function useKeyboardShortcuts() {
  const undo = useScheduleStore((state) => state.undo);
  const redo = useScheduleStore((state) => state.redo);
  const setSelectedOperationId = useScheduleStore((state) => state.setSelectedOperationId);
  const selectedOperationId = useScheduleStore((state) => state.selectedOperationId);
  const operations = useScheduleStore((state) => state.operations);
  const locks = useScheduleStore((state) => state.locks);
  const activeLockUser = useScheduleStore((state) => state.activeLockUser);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Avoid shortcuts if typing in input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        redo();
      }

      // Escape: Deselect
      if (e.key === 'Escape') {
        setSelectedOperationId(null);
      }

      // 'L' key: Toggle lock on selected operation's machine
      if (e.key.toLowerCase() === 'l' && selectedOperationId) {
        const op = operations[selectedOperationId];
        if (op) {
          const currentLock = locks[op.requiredResourceId];
          if (currentLock && currentLock.lockedByUserId === activeLockUser.userId) {
            await scheduleApi.releaseLock(op.requiredResourceId, activeLockUser.userId);
          } else if (!currentLock) {
            await scheduleApi.acquireLock(
              op.requiredResourceId,
              activeLockUser.userId,
              activeLockUser.userName,
              activeLockUser.userColor
            );
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, setSelectedOperationId, selectedOperationId, operations, locks, activeLockUser]);
}
