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
  const triggerScrollToNow = useScheduleStore((state) => state.triggerScrollToNow);
  const setIsShortcutsOpen = useScheduleStore((state) => state.setIsShortcutsOpen);
  const setIsCreateWorkOrderOpen = useScheduleStore((state) => state.setIsCreateWorkOrderOpen);
  const setIsResourceManagerOpen = useScheduleStore((state) => state.setIsResourceManagerOpen);
  const setIsAddDowntimeOpen = useScheduleStore((state) => state.setIsAddDowntimeOpen);
  const setIsShiftManagerOpen = useScheduleStore((state) => state.setIsShiftManagerOpen);
  const setIsWorkOrderManagerOpen = useScheduleStore((state) => state.setIsWorkOrderManagerOpen);
  const setIsAutoScheduleOpen = useScheduleStore((state) => state.setIsAutoScheduleOpen);
  const setIsSplitModalOpen = useScheduleStore((state) => state.setIsSplitModalOpen);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Avoid shortcuts if typing in input, textarea, or select
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      // Undo: Ctrl+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // 'T' or 't' key: Jump to Now
      if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        triggerScrollToNow();
        return;
      }

      // '?' key: Open Shortcuts guide
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen(true);
        return;
      }

      // Escape: Deselect and close all active modals/drawers
      if (e.key === 'Escape') {
        setSelectedOperationId(null);
        setIsShortcutsOpen(false);
        setIsCreateWorkOrderOpen(false);
        setIsResourceManagerOpen(false);
        setIsAddDowntimeOpen(false);
        setIsShiftManagerOpen(false);
        setIsWorkOrderManagerOpen(false);
        setIsAutoScheduleOpen(false);
        setIsSplitModalOpen(false);
        return;
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
  }, [
    undo,
    redo,
    setSelectedOperationId,
    selectedOperationId,
    operations,
    locks,
    activeLockUser,
    triggerScrollToNow,
    setIsShortcutsOpen,
    setIsCreateWorkOrderOpen,
    setIsResourceManagerOpen,
    setIsAddDowntimeOpen,
    setIsShiftManagerOpen,
    setIsWorkOrderManagerOpen,
    setIsAutoScheduleOpen,
    setIsSplitModalOpen,
  ]);
}
