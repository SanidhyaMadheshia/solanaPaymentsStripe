import { useEffect, useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router";
import { Button, Field, Input, Spinner } from "@/components/ui";
import { ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useAppConfig } from "@/lib/config";
import { safeNext } from "@/lib/format";
import { AuthLayout, FormError, PasswordInput } from "./AuthLayout";

export default function Login() {
  const { merchant, login } = useAuth();
  const { config } = useAppConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Log in · SolPay";
  }, []);

  if (merchant === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="text-muted" />
      </div>
    );
  }
  if (merchant) return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(next, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError && err.status === 401 ? "Incorrect email or password." : errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Log in to your store"
      subtitle={params.get("expired") ? "Your session expired. Please log in again." : "Manage products, API keys and payments."}
      footer={
        config?.registrationEnabled !== false && (
          <>
            New to SolPay?{" "}
            <Link to="/register" className="font-medium text-fg underline underline-offset-4 hover:text-muted">
              Create an account
            </Link>
          </>
        )
      }
    >
      <form onSubmit={submit} className="space-y-5" noValidate>
        <Field label="Email">
          {(p) => <Input {...p} type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus placeholder="you@store.com" />}
        </Field>
        <Field label="Password">
          {(p) => <PasswordInput {...p} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />}
        </Field>
        <FormError message={error} />
        <Button type="submit" size="lg" className="w-full" loading={loading} disabled={!email.trim() || !password}>
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}
