import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function MobileLoginPage() {
  const { hasUsers, loading, session, signIn, signOut, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session && user && user.role !== "attendant") {
      void signOut();
      setError("O acesso mobile e exclusivo para manobristas.");
    }
  }, [loading, session, signOut, user]);

  if (!loading && session && user?.role === "attendant") {
    return <Navigate to="/m" replace />;
  }

  const handleLogin = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await signIn(email.trim(), password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Nao foi possivel entrar no mobile.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.2),_transparent_30%),linear-gradient(180deg,_#020617,_#0f172a_42%,_#e2e8f0_42%,_#f8fafc_100%)] px-4 py-10">
      <div className="w-full max-w-sm space-y-5">
        <div className="space-y-3 text-white">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-3">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-sky-200/75">Valet Tracker</p>
            <h1 className="mt-3 text-3xl font-semibold">Mobile do manobrista</h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Fluxo enxuto, rapido e focado no patio. Apenas usuarios com perfil `attendant` entram aqui.
            </p>
          </div>
        </div>

        <Card className="rounded-[28px] border border-slate-200 bg-white/95 shadow-2xl shadow-slate-950/20">
          <CardHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <CardTitle>Entrar no mobile</CardTitle>
            <CardDescription>
              {hasUsers
                ? "Use a credencial do manobrista para abrir a operacao mobile."
                : "O primeiro acesso precisa ser criado na versao principal antes do mobile."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobile-email">Email</Label>
              <Input
                id="mobile-email"
                type="email"
                autoComplete="email"
                placeholder="manobrista@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={!hasUsers || submitting}
                className="h-12 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile-password">Senha</Label>
              <Input
                id="mobile-password"
                type="password"
                autoComplete="current-password"
                placeholder="Sua senha"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={!hasUsers || submitting}
                className="h-12 rounded-xl"
              />
            </div>

            {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

            <Button
              type="button"
              className="h-12 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800"
              disabled={!hasUsers || !email.trim() || !password || submitting}
              onClick={() => void handleLogin()}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? "Entrando..." : "Abrir operacao mobile"}
            </Button>

            <Link to="/login" className="block text-center text-sm font-medium text-sky-700">
              Ir para a autenticacao completa
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
