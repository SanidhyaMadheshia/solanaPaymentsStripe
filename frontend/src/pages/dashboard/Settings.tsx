import { AlertTriangle, Eye, EyeOff, RefreshCw } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useToast } from "@/components/toast-context";
import { Button, Card, CardHeader, ConfirmModal, CopyButton, Field, Input, Skeleton } from "@/components/ui";
import { api, ApiError, dash, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { clusterLabel } from "@/lib/format";
import type { Merchant } from "@/lib/types";
import { useAsync } from "@/lib/useAsync";
import { PasswordInput } from "../auth/AuthLayout";
import { useDashboardContext } from "./context";
import { ErrorPanel, PageHeader } from "./shared";

type Form = { name: string; walletAddress: string; defaultWebhookUrl: string };

function BusinessSettings() {
  const { config } = useDashboardContext();
  const { setMerchant } = useAuth();
  const toast = useToast();
  const { data, error, loading, reload, setData } = useAsync((s) => dash.get<Merchant>("/settings", s), []);
  const [form, setForm] = useState<Form>({ name: "", walletAddress: "", defaultWebhookUrl: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({ name: data.name ?? "", walletAddress: data.walletAddress ?? "", defaultWebhookUrl: data.defaultWebhookUrl ?? "" });
  }, [data]);

  if (error) return <ErrorPanel error={error} onRetry={reload} />;
  if (loading && !data) return <Skeleton className="h-80" />;

  const dirty = data ? form.name !== (data.name ?? "") || form.walletAddress !== (data.walletAddress ?? "") || form.defaultWebhookUrl !== (data.defaultWebhookUrl ?? "") : false;
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setFieldErrors((fe) => ({ ...fe, [k]: undefined }));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFieldErrors({ name: "Business name is required" });
      return;
    }
    setSaving(true);
    setFieldErrors({});
    try {
      const saved = await dash.put<Merchant>("/settings", { name: form.name.trim(), walletAddress: form.walletAddress.trim(), defaultWebhookUrl: form.defaultWebhookUrl.trim() });
      setData(saved);
      setMerchant(saved);
      toast.success("Settings saved");
    } catch (err) {
      if (err instanceof ApiError && err.issues?.length) setFieldErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])));
      else toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Business & payouts" description="Applies to every new invoice unless overridden in the API call." />
      <form onSubmit={submit} className="grid gap-5 p-5 md:grid-cols-2">
        <Field label="Business name" hint="Shown to customers on the checkout page." error={fieldErrors.name}>
          {(p) => <Input {...p} value={form.name} onChange={set("name")} maxLength={100} />}
        </Field>
        <Field label="Login email" hint="Used to sign in. Contact support to change it.">
          {(p) => <Input {...p} value={data?.email ?? ""} disabled readOnly />}
        </Field>
        <div className="md:col-span-2">
          <Field label="Receiving wallet address" hint={`Solana ${clusterLabel(config.cluster)} address that receives customer payments. Required to accept payments.`} error={fieldErrors.walletAddress}>
            {(p) => <Input {...p} value={form.walletAddress} onChange={set("walletAddress")} placeholder="e.g. 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" className="font-mono" spellCheck={false} autoComplete="off" />}
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="Default webhook URL" optional hint="Used when an API call doesn’t pass webhook_url." error={fieldErrors.defaultWebhookUrl}>
            {(p) => <Input {...p} type="url" value={form.defaultWebhookUrl} onChange={set("defaultWebhookUrl")} placeholder="https://shop.example.com/webhooks/solpay" />}
          </Field>
        </div>
        <div className="flex justify-end gap-2 md:col-span-2">
          <Button type="button" variant="ghost" disabled={!dirty || saving} onClick={() => data && setData({ ...data })}>
            Discard
          </Button>
          <Button type="submit" loading={saving} disabled={!dirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Card>
  );
}

function WebhookSecret() {
  const toast = useToast();
  const [secret, setSecret] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const reveal = async () => {
    if (secret) return setVisible((v) => !v);
    setBusy(true);
    try {
      setSecret((await dash.get<{ webhookSecret: string }>("/webhook-secret")).webhookSecret);
      setVisible(true);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const rotate = async () => {
    setBusy(true);
    try {
      setSecret((await dash.post<{ webhookSecret: string }>("/webhook-secret/rotate")).webhookSecret);
      setVisible(true);
      toast.success("Webhook secret rotated. Update your server now.");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      setConfirm(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Webhook signing secret" description="Verify the X-SolPay-Signature header on your webhook endpoint with this secret." />
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm">{visible && secret ? secret : "whsec_••••••••••••••••••••••••••••••••"}</code>
          {visible && secret && <CopyButton value={secret} label="Copy webhook secret" />}
          <Button variant="secondary" size="sm" onClick={reveal} loading={busy && !secret}>
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} {visible ? "Hide" : "Reveal"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirm(true)}>
            <RefreshCw className="h-4 w-4" /> Rotate
          </Button>
        </div>
        <p className="text-xs text-subtle">Store it as SOLPAY_WEBHOOK_SECRET on your server. Never put it in browser code.</p>
      </div>
      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={rotate}
        loading={busy}
        danger
        title="Rotate webhook secret?"
        description={
          <span className="flex gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 translate-y-0.5 text-warning" aria-hidden />
            The current secret stops working immediately. Webhooks will fail verification until your server uses the new one.
          </span>
        }
        confirmLabel="Rotate secret"
      />
    </Card>
  );
}

function ChangePassword() {
  const toast = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [errors, setErrors] = useState<{ current?: string; next?: string }>({});
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next.length < 8) return setErrors({ next: "Use at least 8 characters" });
    setSaving(true);
    setErrors({});
    try {
      await api("/auth/password", { method: "POST", body: { currentPassword: current, newPassword: next }, dashboard: true });
      setCurrent("");
      setNext("");
      toast.success("Password changed. Other devices were signed out.");
    } catch (err) {
      if (err instanceof ApiError && err.code === "invalid_credentials") setErrors({ current: "Current password is incorrect" });
      else toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Password" description="Changing it signs you out on every other device." />
      <form onSubmit={submit} className="grid gap-5 p-5 md:grid-cols-2">
        <Field label="Current password" error={errors.current}>
          {(p) => <PasswordInput {...p} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />}
        </Field>
        <Field label="New password" error={errors.next} hint="At least 8 characters.">
          {(p) => <PasswordInput {...p} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} minLength={8} required />}
        </Field>
        <div className="flex justify-end md:col-span-2">
          <Button type="submit" variant="secondary" loading={saving} disabled={!current || !next}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" description="Your store, payouts and account security." />
      <div className="space-y-6">
        <BusinessSettings />
        <WebhookSecret />
        <ChangePassword />
      </div>
    </>
  );
}
