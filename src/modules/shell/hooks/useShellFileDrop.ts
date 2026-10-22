import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';

import {
  SHELL_PASTE_FILES_EVENT,
  ensureNamedFile,
  uploadFilesForShell,
} from '@/modules/shell/utils/shellUpload';

export type ShellUploadStatus =
  | { kind: 'uploading'; count: number }
  | { kind: 'done'; count: number }
  | { kind: 'error'; message: string };

type Options = {
  containerRef: RefObject<HTMLElement | null>;
  sendInput: (data: string) => void;
  enabled: boolean;
};

const hasFiles = (dt: DataTransfer | null) => Boolean(dt && Array.from(dt.types || []).includes('Files'));

/** Paste / drag-drop / file-picker uploads for the Shell tab; inserts quoted paths without pressing Enter. */
export function useShellFileDrop({ containerRef, sendInput, enabled }: Options) {
  const [status, setStatus] = useState<ShellUploadStatus | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDepth = useRef(0);
  const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(enabled);
  const sendRef = useRef(sendInput);
  useEffect(() => {
    enabledRef.current = enabled;
    sendRef.current = sendInput;
  }, [enabled, sendInput]);

  const showStatus = useCallback((next: ShellUploadStatus, autoClearMs?: number) => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
    setStatus(next);
    if (autoClearMs) clearTimer.current = setTimeout(() => setStatus(null), autoClearMs);
  }, []);

  const uploadAndInsert = useCallback(async (input: Array<File | Blob>) => {
    const files = input.map((f, i) => ensureNamedFile(f, i));
    if (files.length === 0) return;
    if (!enabledRef.current) {
      showStatus({ kind: 'error', message: '终端未连接' }, 4000);
      return;
    }
    showStatus({ kind: 'uploading', count: files.length });
    try {
      const text = await uploadFilesForShell(files);
      sendRef.current(text);
      showStatus({ kind: 'done', count: files.length }, 2500);
    } catch (error) {
      showStatus({ kind: 'error', message: error instanceof Error ? error.message : '上传失败' }, 5000);
    }
  }, [showStatus]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Capture phase so we run before xterm's textarea paste handler; text-only pastes fall through untouched.
    const onPaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files || []);
      if (files.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      void uploadAndInsert(files);
    };
    const onCustom = (event: Event) => {
      const files = (event as CustomEvent<{ files: Array<File | Blob> }>).detail?.files || [];
      void uploadAndInsert(files);
    };
    el.addEventListener('paste', onPaste, true);
    el.addEventListener(SHELL_PASTE_FILES_EVENT, onCustom);
    return () => {
      el.removeEventListener('paste', onPaste, true);
      el.removeEventListener(SHELL_PASTE_FILES_EVENT, onCustom);
    };
  }, [containerRef, uploadAndInsert]);

  const dropHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      dragDepth.current += 1;
      setIsDragging(true);
    },
    onDragOver: (e: React.DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDragLeave: (e: React.DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return;
      dragDepth.current = Math.max(0, dragDepth.current - 1);
      if (dragDepth.current === 0) setIsDragging(false);
    },
    onDrop: (e: React.DragEvent) => {
      if (!hasFiles(e.dataTransfer)) return;
      e.preventDefault();
      dragDepth.current = 0;
      setIsDragging(false);
      void uploadAndInsert(Array.from(e.dataTransfer.files || []));
    },
  };

  const handlePickedFiles = useCallback((list: FileList | null) => {
    void uploadAndInsert(Array.from(list || []));
  }, [uploadAndInsert]);

  useEffect(() => () => {
    if (clearTimer.current) clearTimeout(clearTimer.current);
  }, []);

  return { status, isDragging, dropHandlers, handlePickedFiles };
}
