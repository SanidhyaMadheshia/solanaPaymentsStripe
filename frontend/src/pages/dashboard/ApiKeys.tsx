import { AlertTriangle, KeyRound, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useToast } from "@/components/toast-context";
import { Badge, Button, Card, ConfirmModal, CopyField, EmptyState, Field, Input, Modal, Skeleton } from "@/components/ui";
import { dash, errorMessage } from "@/lib/api";
import { formatDate, timeAgo } from "@/lib/format";
import type { ApiKey } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { ErrorPanel, PageHeader } from "./shared";

function CreateKeyModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (k: ApiKey) => void }) {
  const [label, setLabel] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setLabel("");
    setSecret(null);
    setError(null);
    onClose();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await dash.post<{ apiKey: string; key: ApiKey }>("/api-keys", { label: label.trim() });
      setSecret(res.apiKey);
      onCreated(res.key);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title={secret ? "Save your secret key" : "Create secret key"}
      footer={
        secret ? (
          <Button onClick={close}>I’ve saved it</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" form="key-form" loading={saving} disabled={!label.trim()}>
              Create key
            </Button>
          </>
        )
      }
    >
      {secret ? (
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
            <AlertTriangle className="h-4 w-4 shrink-0 translate-y-0.5" aria-hidden />
            <p>This is the only time the full key is shown. Store it in your server’s environment (e.g. SOLPAY_SECRET_KEY). Never expose it in browser code.</p>
          </div>
          <CopyField value={secret} className="w-full" />
        </div>
      ) : (
        <form id="key-form" onSubmit={submit} className="space-y-4">
          <Field label="Name" hint="Helps you recognise where the key is used.">
            {(p) => <Input {...p} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Production server" maxLength={100} required autoFocus />}
          </Field>
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </Modal>
  );
}

export default function ApiKeys() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync((signal) => dash.get<{ apiKeys: ApiKey[] }>("/api-keys", signal), []);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<ApiKey | null>(null);
  const [busy, setBusy] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);

  const keys = data?.apiKeys ?? [];
  const visible = showRevoked ? keys : keys.filter((k) => !k.revoked);
  const revokedCount = keys.filter((k) => k.revoked).length;

  const revoke = async () => {
    if (!revoking) return;
    setBusy(true);
    try {
      await dash.del(`/api-keys/${revoking.id}`);
      setData((d) => ({ apiKeys: (d?.apiKeys ?? []).map((k) => (k.id === revoking.id ? { ...k, revoked: true } : k)) }));
      toast.success("API key revoked");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      setRevoking(null);
    }
  };

  return (
    <>
      <PageHeader
        title="API keys"
        description="Secret keys authenticate your server when it creates invoices."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Create key
          </Button>
        }
      />

      {revokedCount > 0 && (
        <label className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={showRevoked} onChange={(e) => setShowRevoked(e.target.checked)} className="accent-white" />
          Show {revokedCount} revoked
        </label>
      )}

      <Card className="overflow-hidden">
        {error ? (
          <div className="p-5">
            <ErrorPanel error={error} onRetry={reload} />
          </div>
        ) : loading && !data ? (
          <div className="space-y-2 p-5">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={<KeyRound className="h-5 w-5" />}
            title="No API keys"
            description="Create a key to call the SolPay API from your server."
            action={
              <Button onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" /> Create key
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-subtle">
                  <th scope="col" className="px-5 py-3 font-medium">Name</th>
                  <th scope="col" className="px-5 py-3 font-medium">Key</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">Last used</th>
                  <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">Created</th>
                  <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((k) => (
                  <tr key={k.id}>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{k.label ?? "Unnamed key"}</span>
                        {k.revoked ? <Badge tone="danger">Revoked</Badge> : <Badge tone="success">Active</Badge>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <code className="rounded bg-surface-2 px-2 py-0.5 text-xs text-muted">{k.prefix}••••••••</code>
                    </td>
                    <td className="hidden px-5 py-3 text-muted sm:table-cell">{k.lastUsedAt ? timeAgo(k.lastUsedAt) : "Never"}</td>
                    <td className="hidden px-5 py-3 text-muted md:table-cell">{formatDate(k.createdAt, false)}</td>
                    <td className="px-5 py-3 text-right">
                      {!k.revoked && (
                        <Button variant="ghost" size="sm" onClick={() => setRevoking(k)} className="hover:text-danger">
                          <Trash2 className="h-4 w-4" /> Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="mt-6 p-5">
        <p className="text-sm font-medium">Using your key</p>
        <p className="mt-1 text-sm text-muted">
          Send it as a bearer token: <CopyField value="Authorization: Bearer sk_…" />. See the{" "}
          <Link to="/dashboard/integration" className="text-fg underline underline-offset-4 hover:text-muted">
            integration guide
          </Link>{" "}
          for ready-to-run examples.
        </p>
      </Card>

      <CreateKeyModal open={creating} onClose={() => setCreating(false)} onCreated={(k) => setData((d) => ({ apiKeys: [k, ...(d?.apiKeys ?? [])] }))} />
      <ConfirmModal
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        onConfirm={revoke}
        loading={busy}
        danger
        title="Revoke API key?"
        description={`Requests using “${revoking?.label ?? "this key"}” will fail immediately. This cannot be undone.`}
        confirmLabel="Revoke key"
      />
    </>
  );
}
