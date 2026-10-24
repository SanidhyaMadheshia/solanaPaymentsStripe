import { Check } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { Button, Field, Input, Spinner } from "@/components/ui";
import { ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useAppConfig } from "@/lib/config";
import { AuthLayout, FormError, PasswordInput } from "./AuthLayout";

type Errors = Partial<Record<"businessName" | "email" | "password", string>>;

const perks = ["Hosted checkout for your store", "Payments verified on-chain", "Signed webhooks to your backend"];

export default function Register() {
  const { merchant, register } = useAuth();
  const { config } = useAppConfig();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Create account · SolPay";
  }, []);

  if (merchant === undefined || !config) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="text-muted" />
      </div>
    );
  }
  if (merchant) return <Navigate to="/dashboard" replace />;

  if (!config.registrationEnabled) {
    return (
      <AuthLayout title="Registration is closed" subtitle="This SolPay instance isn’t accepting new stores right now.">
        <Link to="/login" className="font-medium text-fg underline underline-offset-4">
          Log in to an existing account
        </Link>
      </AuthLayout>
    );
  }

  const validate = (): Errors => {
    const e: Errors = {};
    if (!businessName.trim()) e.businessName = "Business name is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "Enter a valid email";
    if (password.length < 8) e.password = "Use at least 8 characters";
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const v = validate();
    setFieldErrors(v);
    setError(null);
    if (Object.keys(v).length) return;
    setLoading(true);
    try {
      await register({ businessName: businessName.trim(), email: email.trim(), password });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.issues?.length) {
        setFieldErrors(Object.fromEntries(err.issues.map((i) => [i.path, i.message])) as Errors);
      } else if (err instanceof ApiError && err.status === 409) {
        setFieldErrors({ email: "An account with this email already exists" });
      } else {
        setError(errorMessage(err));
      }
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your store account"
      subtitle="Start accepting Solana payments on Devnet in minutes. Free to use."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-fg underline underline-offset-4 hover:text-muted">
            Log in
          </Link>
        </>
      }
    >
      <ul className="mb-8 space-y-2 text-sm text-muted">
        {perks.map((p) => (
          <li key={p} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" aria-hidden /> {p}
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Business name" error={fieldErrors.businessName} hint="Shown to customers on the checkout.">
          {(p) => <Input {...p} autoComplete="organization" value={businessName} onChange={(e) => setBusinessName(e.target.value)} maxLength={100} autoFocus placeholder="Acme Store" />}
        </Field>
        <Field label="Work email" error={fieldErrors.email}>
          {(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@store.com" />}
        </Field>
        <Field label="Password" error={fieldErrors.password} hint="At least 8 characters.">
          {(p) => <PasswordInput {...p} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />}
        </Field>
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" loading={loading}>
          Create account
        </Button>
        <p className="text-center text-xs text-subtle">
          By creating an account you agree to the{" "}
          <Link to="/terms" className="underline underline-offset-2 hover:text-fg">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-fg">
            Privacy Policy
          </Link>
          .
        </p>
      </form>
    </AuthLayout>
  );
}
