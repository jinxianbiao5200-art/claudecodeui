import { useEffect, useState } from 'react';

import { api } from '@/shared/api';
import type { LLMProvider, ProviderModelsDefinition } from '@/shared/types';

const PROVIDERS: { id: LLMProvider; label: string }[] = [
  { id: 'claude', label: 'Claude Code' },
  { id: 'codex', label: 'Codex' },
  { id: 'cursor', label: 'Cursor Agent' },
  { id: 'opencode', label: 'OpenCode' },
];

type Props = {
  projectName: string;
  onStart: (provider: LLMProvider, model: string) => void;
};

/** mine: pre-launch screen for a new session in the Shell tab (no chat composer). */
export default function ShellNewSessionPicker({ projectName, onStart }: Props) {
  const [provider, setProvider] = useState<LLMProvider>('claude');
  const [catalog, setCatalog] = useState<ProviderModelsDefinition | null>(null);
  const [model, setModel] = useState<string>('opus');

  useEffect(() => {
    let cancelled = false;
    setCatalog(null);
    (async () => {
      try {
        const response = await api.providers.models(provider);
        const body = await response.json();
        const models: ProviderModelsDefinition | undefined = body?.success ? body.data?.models : undefined;
        if (cancelled || !models) return;
        setCatalog(models);
        // mine: new sessions always default to Claude Code + Opus.
        const stored = provider === 'claude' ? 'opus' : localStorage.getItem(`${provider}-model`);
        const valid = models.OPTIONS.some((o) => o.value === stored);
        setModel(valid && stored ? stored : models.DEFAULT || models.OPTIONS[0]?.value || 'default');
      } catch {
        if (!cancelled) setModel('default');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider]);

  return (
    <div className="flex h-full items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-border bg-card p-5 shadow-sm">
        <div>
          <h3 className="text-base font-semibold text-foreground">新会话</h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{projectName}</p>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">工具</span>
          <select
            className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
            value={provider}
            onChange={(e) => setProvider(e.target.value as LLMProvider)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">模型</span>
          <select
            className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm text-foreground"
            value={model}
            disabled={!catalog}
            onChange={(e) => setModel(e.target.value)}
          >
            {!catalog && <option value={model}>加载中…</option>}
            {catalog?.OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => onStart(provider, model)}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          在终端开始
        </button>
      </div>
    </div>
  );
}
