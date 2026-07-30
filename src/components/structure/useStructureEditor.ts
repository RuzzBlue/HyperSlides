import { useCallback, useState } from 'react';
import type { LoadedCourse, StructureDropTarget, StructureTarget } from '@shared/types';
import { apiFetch } from '../../api/client';
import type { StructureMenuNode } from './StructureModals';
import { usePrefs } from '../../prefs/PrefsProvider';

export type StructureResultPayload = {
  course: Omit<LoadedCourse, 'rootPath'>;
  focusKey: string | null;
};

const DRAG_MIME = 'application/x-hyperclass-structure';

export function serializeDrag(target: StructureTarget): string {
  return JSON.stringify(target);
}

export function parseDrag(raw: string | undefined): StructureTarget | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StructureTarget;
  } catch {
    return null;
  }
}

export { DRAG_MIME };

export function useStructureEditor(
  courseId: string | undefined,
  onApplied: (result: StructureResultPayload) => void,
  onError: (message: string) => void,
) {
  const { tr, trf } = usePrefs();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renameNode, setRenameNode] = useState<StructureMenuNode | null>(null);
  const [deleteNode, setDeleteNode] = useState<StructureMenuNode | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node: StructureMenuNode;
  } | null>(null);
  const [dragging, setDragging] = useState<StructureTarget | null>(null);
  const [dropHint, setDropHint] = useState<string | null>(null);

  const apply = useCallback(
    async (
      method: 'POST',
      action: 'rename' | 'delete' | 'duplicate' | 'move',
      body: Record<string, unknown>,
    ) => {
      if (!courseId) return;
      setBusy(true);
      setError(null);
      const res = await apiFetch<StructureResultPayload>({
        method,
        path: `/api/courses/${courseId}/structure/${action}`,
        body,
      });
      setBusy(false);
      if (!res.ok || !res.data) {
        const msg = res.error ?? 'Structure update failed';
        setError(msg);
        onError(msg);
        return false;
      }
      onApplied(res.data);
      setRenameNode(null);
      setDeleteNode(null);
      setError(null);
      return true;
    },
    [courseId, onApplied, onError],
  );

  const openRename = useCallback((node: StructureMenuNode) => {
    setRenameNode(node);
    setContextMenu(null);
  }, []);

  const openDelete = useCallback((node: StructureMenuNode) => {
    setDeleteNode(node);
    setContextMenu(null);
  }, []);

  const saveRename = useCallback(
    async (title: string) => {
      if (!renameNode) return;
      await apply('POST', 'rename', { target: renameNode.target, title });
    },
    [apply, renameNode],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteNode) return;
    await apply('POST', 'delete', { target: deleteNode.target });
  }, [apply, deleteNode]);

  const duplicate = useCallback(
    async (node: StructureMenuNode) => {
      if (node.target.kind !== 'item') return;
      await apply('POST', 'duplicate', { itemKey: node.target.itemKey });
    },
    [apply],
  );

  const move = useCallback(
    async (source: StructureTarget, dest: StructureDropTarget) => {
      await apply('POST', 'move', { source, dest });
      setDragging(null);
      setDropHint(null);
    },
    [apply],
  );

  const kindLabel = (node: StructureMenuNode) => {
    switch (node.nodeKind) {
      case 'module':
        return tr('structureKindModule');
      case 'unit':
        return tr('structureKindUnit');
      case 'lesson':
        return tr('structureKindLesson');
      case 'quiz':
        return tr('structureKindQuiz');
      case 'lab':
        return tr('structureKindLab');
    }
  };

  const deleteCopy = (node: StructureMenuNode) => {
    if (node.nodeKind === 'module') {
      return {
        title: tr('structureDeleteModuleTitle'),
        body: trf('structureDeleteModuleBody', { title: node.title }),
      };
    }
    if (node.nodeKind === 'unit') {
      return {
        title: tr('structureDeleteUnitTitle'),
        body: trf('structureDeleteUnitBody', { title: node.title }),
      };
    }
    return {
      title: tr('structureDeleteItemTitle'),
      body: trf('structureDeleteItemBody', { title: node.title }),
    };
  };

  return {
    busy,
    error,
    renameNode,
    deleteNode,
    contextMenu,
    dragging,
    dropHint,
    setContextMenu,
    setDragging,
    setDropHint,
    setRenameNode,
    setDeleteNode,
    openRename,
    openDelete,
    saveRename,
    confirmDelete,
    duplicate,
    move,
    kindLabel,
    deleteCopy,
  };
}
