'use client';

import { useState } from 'react';
import type { ClientProfile } from '@/lib/clients';

type Props = {
  clients: ClientProfile[];
  activeId: string | null;
  suggestedName: string;
  isDirty: boolean;
  hasUnsavedDraft: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onSave: (label: string) => void;
  onUpdate: () => void;
  onDelete: (id: string) => void;
};

type Pending =
  | { kind: 'none' }
  | { kind: 'naming'; label: string }
  | { kind: 'deleting'; id: string }
  | { kind: 'switching'; id: string };

const chipBase =
  'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
const chipIdle =
  `${chipBase} bg-white text-slate-700 ring-1 ring-slate-200 hover:-translate-y-0.5 hover:ring-slate-300 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:ring-slate-600`;
const chipActive =
  `${chipBase} bg-slate-900 text-white ring-1 ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white`;
const chipDashed =
  `${chipBase} border border-dashed border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white`;
const linkButton =
  'text-sm font-semibold text-brand-600 underline-offset-4 hover:underline dark:text-brand-300';
const mutedButton =
  'text-sm font-semibold text-slate-500 underline-offset-4 hover:underline dark:text-slate-400';

export function ClientChips({
  clients,
  activeId,
  suggestedName,
  isDirty,
  hasUnsavedDraft,
  onSelect,
  onNew,
  onSave,
  onUpdate,
  onDelete,
}: Props) {
  const [pending, setPending] = useState<Pending>({ kind: 'none' });
  const active = clients.find((client) => client.id === activeId);
  const labelFor = (id: string) => clients.find((client) => client.id === id)?.label ?? '';

  const handleSelect = (id: string) => {
    if (hasUnsavedDraft) {
      setPending({ kind: 'switching', id });
      return;
    }
    setPending({ kind: 'none' });
    onSelect(id);
  };

  const submitName = () => {
    if (pending.kind !== 'naming' || !pending.label.trim()) {
      return;
    }
    onSave(pending.label.trim());
    setPending({ kind: 'none' });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Saved clients</p>
      <div className="flex flex-wrap items-center gap-2">
        {clients.map((client) =>
          client.id === activeId ? (
            <span key={client.id} className={chipActive}>
              {client.label}
              <button
                type="button"
                className="-my-1 -mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-base text-white/60 hover:bg-white/10 hover:text-white dark:text-slate-900/50 dark:hover:text-slate-900"
                onClick={() => setPending({ kind: 'deleting', id: client.id })}
                aria-label={`Delete ${client.label}`}
              >
                ×
              </button>
            </span>
          ) : (
            <button key={client.id} type="button" className={chipIdle} onClick={() => handleSelect(client.id)}>
              {client.label}
            </button>
          )
        )}

        {pending.kind === 'naming' ? (
          <form
            className="inline-flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              submitName();
            }}
          >
            <input
              autoFocus
              aria-label="Client chip name"
              className="w-40 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={pending.label}
              onChange={(event) => setPending({ kind: 'naming', label: event.target.value })}
              onKeyDown={(event) => event.key === 'Escape' && setPending({ kind: 'none' })}
              placeholder="e.g. PJ"
            />
            <button type="submit" className={linkButton} disabled={!pending.label.trim()}>
              Save
            </button>
            <button type="button" className={mutedButton} onClick={() => setPending({ kind: 'none' })}>
              Cancel
            </button>
          </form>
        ) : active ? (
          <button type="button" className={chipDashed} onClick={onNew}>
            + New client
          </button>
        ) : (
          <button
            type="button"
            className={chipDashed}
            onClick={() => setPending({ kind: 'naming', label: suggestedName })}
            disabled={!suggestedName}
            title={suggestedName ? undefined : 'Enter a client name first'}
          >
            + Save as client
          </button>
        )}

        {active && isDirty && pending.kind === 'none' && (
          <button type="button" className={`${linkButton} animate-fade-in`} onClick={onUpdate}>
            Update {active.label} with these details
          </button>
        )}
      </div>

      {pending.kind === 'deleting' && (
        <p className="animate-fade-in flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          Delete {labelFor(pending.id)}? The current invoice stays as it is.
          <button
            type="button"
            className="text-sm font-semibold text-rose-600 underline-offset-4 hover:underline dark:text-rose-300"
            onClick={() => {
              onDelete(pending.id);
              setPending({ kind: 'none' });
            }}
          >
            Delete
          </button>
          <button type="button" className={mutedButton} onClick={() => setPending({ kind: 'none' })}>
            Cancel
          </button>
        </p>
      )}

      {pending.kind === 'switching' && (
        <p className="animate-fade-in flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
          Replace the current unsaved invoice with {labelFor(pending.id)}?
          <button
            type="button"
            className={linkButton}
            onClick={() => {
              onSelect(pending.id);
              setPending({ kind: 'none' });
            }}
          >
            Replace
          </button>
          <button type="button" className={mutedButton} onClick={() => setPending({ kind: 'none' })}>
            Cancel
          </button>
        </p>
      )}

      {clients.length === 0 && pending.kind === 'none' && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Save this client to switch between clients in one click next time.
        </p>
      )}
    </div>
  );
}
