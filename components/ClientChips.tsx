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
  'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const chipIdle =
  `${chipBase} bg-field text-ink ring-1 ring-edge hover:bg-well hover:ring-ink-2`;
const chipActive =
  `${chipBase} bg-ink text-sheet ring-1 ring-ink`;
const chipDashed =
  `${chipBase} border border-dashed border-edge text-ink-2 hover:border-ink-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50`;
const linkButton =
  'text-sm font-semibold text-accent underline-offset-4 hover:underline';
const mutedButton =
  'text-sm font-semibold text-ink-2 underline-offset-4 hover:underline';

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
      <p className="text-sm font-medium text-ink">Your saved clients</p>
      <div className="flex flex-wrap items-center gap-2">
        {clients.map((client) =>
          client.id === activeId ? (
            <span key={client.id} className={chipActive}>
              {client.label}
              <button
                type="button"
                className="-my-1 -mr-2 inline-flex h-6 w-6 items-center justify-center rounded text-base text-sheet/60 hover:bg-sheet/15 hover:text-sheet"
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
              aria-label="Short name for this client"
              className="h-8 w-40 rounded-md border border-edge bg-sheet px-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
              value={pending.label}
              onChange={(event) => setPending({ kind: 'naming', label: event.target.value })}
              onKeyDown={(event) => event.key === 'Escape' && setPending({ kind: 'none' })}
              placeholder="Short name, e.g. PJ"
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
            title={suggestedName ? undefined : 'Type the client’s name first'}
          >
            + Save this client
          </button>
        )}

        {active && isDirty && pending.kind === 'none' && (
          <button type="button" className={`${linkButton} animate-fade-in`} onClick={onUpdate}>
            Save changes to {active.label}
          </button>
        )}
      </div>

      {pending.kind === 'deleting' && (
        <p className="animate-fade-in flex flex-wrap items-center gap-3 text-sm text-ink-2">
          Remove {labelFor(pending.id)} from your saved clients? This invoice won’t change.
          <button
            type="button"
            className="text-sm font-semibold text-danger underline-offset-4 hover:underline"
            onClick={() => {
              onDelete(pending.id);
              setPending({ kind: 'none' });
            }}
          >
            Remove
          </button>
          <button type="button" className={mutedButton} onClick={() => setPending({ kind: 'none' })}>
            Cancel
          </button>
        </p>
      )}

      {pending.kind === 'switching' && (
        <p className="animate-fade-in flex flex-wrap items-center gap-3 text-sm text-ink-2">
          Switch to {labelFor(pending.id)}? What you’ve typed on this invoice will be replaced.
          <button
            type="button"
            className={linkButton}
            onClick={() => {
              onSelect(pending.id);
              setPending({ kind: 'none' });
            }}
          >
            Switch
          </button>
          <button type="button" className={mutedButton} onClick={() => setPending({ kind: 'none' })}>
            Cancel
          </button>
        </p>
      )}

      {clients.length === 0 && pending.kind === 'none' && (
        <p className="text-[13px] text-ink-2">
          Save this client to fill in their details with one click next time.
        </p>
      )}
    </div>
  );
}
