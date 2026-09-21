import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_TOOL_SETTINGS,
  type Annotation,
  type PresenterToolId,
  type PresenterToolSettings,
} from './presenterToolsTypes';

type PresenterToolsContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  tool: PresenterToolId;
  setTool: (t: PresenterToolId) => void;
  settings: PresenterToolSettings;
  patchSettings: (partial: Partial<PresenterToolSettings>) => void;
  annotations: Annotation[];
  setAnnotations: React.Dispatch<React.SetStateAction<Annotation[]>>;
  clearAnnotations: () => void;
  clearToken: number;
  removeAnnotation: (id: string) => void;
  editingTextId: string | null;
  setEditingTextId: (id: string | null) => void;
};

const PresenterToolsContext = createContext<PresenterToolsContextValue | null>(null);

export function PresenterToolsProvider({
  active,
  slideKey,
  children,
}: {
  active: boolean;
  slideKey?: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [tool, setTool] = useState<PresenterToolId>('pointer');
  const [settings, setSettings] = useState<PresenterToolSettings>(DEFAULT_TOOL_SETTINGS);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [clearToken, setClearToken] = useState(0);

  useEffect(() => {
    if (!active) {
      setOpen(false);
      setTool('pointer');
      setEditingTextId(null);
      setAnnotations([]);
    }
  }, [active]);

  useEffect(() => {
    setAnnotations([]);
    setEditingTextId(null);
  }, [slideKey]);

  const patchSettings = useCallback((partial: Partial<PresenterToolSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
    setEditingTextId(null);
    setClearToken((n) => n + 1);
  }, []);
  const removeAnnotation = useCallback((id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      expanded,
      setExpanded,
      tool,
      setTool,
      settings,
      patchSettings,
      annotations,
      setAnnotations,
      clearAnnotations,
      clearToken,
      removeAnnotation,
      editingTextId,
      setEditingTextId,
    }),
    [
      open,
      expanded,
      tool,
      settings,
      patchSettings,
      annotations,
      clearAnnotations,
      clearToken,
      removeAnnotation,
      editingTextId,
    ],
  );

  return (
    <PresenterToolsContext.Provider value={value}>{children}</PresenterToolsContext.Provider>
  );
}

export function usePresenterTools() {
  const ctx = useContext(PresenterToolsContext);
  if (!ctx) throw new Error('usePresenterTools must be used within PresenterToolsProvider');
  return ctx;
}

export function usePresenterToolsOptional() {
  return useContext(PresenterToolsContext);
}
