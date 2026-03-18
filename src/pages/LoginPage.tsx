import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import {
  getRememberedEmail,
  getRememberMePreference,
  setRememberedEmail,
  setRememberMePreference,
  supabase,
} from "@/integrations/supabase/client";

export default function LoginPage() {
  const { session, user, loading } = useAuth();
  const [email, setEmail] = useState(() => getRememberedEmail());
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => getRememberMePreference());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState(() => getRememberedEmail());
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const [verifyingReset, setVerifyingReset] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  const envReady = useMemo(
    () => Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY),
    [],
  );
  const hashParams = useMemo(
    () => new URLSearchParams(typeof window === "undefined" ? "" : window.location.hash.replace(/^#/, "")),
    [],
  );
  const searchParams = useMemo(
    () => new URLSearchParams(typeof window === "undefined" ? "" : window.location.search),
    [],
  );
  const isRecoveryLink = hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery";

  useEffect(() => {
    if (isRecoveryLink) {
      setResetOpen(true);
      setRecoveryReady(Boolean(session));
      setResetMessage("Defina sua nova senha para concluir a recuperacao da conta.");
    }
  }, [isRecoveryLink, session]);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setRecoveryReady(Boolean(nextSession));
        setResetOpen(true);
        setResetError(null);
        setResetMessage("Codigo validado. Agora escolha sua nova senha.");
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  if (!loading && session && user && !resetOpen && !isRecoveryLink) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async () => {
    setSubmitting(true);
    setError(null);
    setRememberMePreference(rememberMe);
    setRememberedEmail(rememberMe ? email.trim() : "");

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      setError(loginError.message);
    }

    setSubmitting(false);
  };

  const resetRecoveryState = () => {
    setResetCode("");
    setNewPassword("");
    setConfirmPassword("");
    setResetMessage(null);
    setResetError(null);
    setRecoveryReady(false);
  };

  const handleResetOpenChange = (open: boolean) => {
    setResetOpen(open);
    if (!open) {
      resetRecoveryState();
    }
  };

  const handleSendResetCode = async () => {
    setSendingReset(true);
    setResetError(null);
    setResetMessage(null);

    const sanitizedEmail = resetEmail.trim();
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
      redirectTo: `${window.location.origin}/login`,
    });

    if (recoveryError) {
      setResetError(recoveryError.message);
    } else {
      setResetMessage("Enviamos um e-mail de recuperacao. Se voce receber um codigo, informe abaixo. Se receber um link, basta abrir.");
    }

    setSendingReset(false);
  };

  const handleVerifyResetCode = async () => {
    setVerifyingReset(true);
    setResetError(null);
    setResetMessage(null);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: resetEmail.trim(),
      token: resetCode.trim(),
      type: "recovery",
    });

    if (verifyError) {
      setResetError(verifyError.message);
    } else {
      setRecoveryReady(true);
      setResetMessage("Codigo validado. Agora escolha sua nova senha.");
    }

    setVerifyingReset(false);
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      setResetError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError("As senhas nao conferem.");
      return;
    }

    setSavingPassword(true);
    setResetError(null);
    setResetMessage(null);

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setResetError(updateError.message);
    } else {
      setResetMessage("Senha atualizada com sucesso. Voce ja pode entrar com a nova senha.");
      setPassword("");
      setResetCode("");
      setNewPassword("");
      setConfirmPassword("");
      setResetOpen(false);
    }

    setSavingPassword(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.18),_transparent_28%),linear-gradient(135deg,_#020617,_#0f172a_45%,_#111827)]" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />

      <div className="relative grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden rounded-[32px] border border-white/10 bg-white/5 p-10 text-white shadow-2xl shadow-sky-950/40 lg:block">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-200/70">Valet Tracker</p>
          <h1 className="mt-6 max-w-md font-serif text-5xl leading-tight">
            Operacao de valet com autenticacao real e dados centralizados.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
            Acesse a plataforma utilizando sua conta para visualizar informações e funcionalidades de acordo com seu perfil e unidade.
          </p>
        </section>

        <Card className="border border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-950/25 backdrop-blur-xl">
          <CardHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300/40">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <CardTitle className="text-3xl font-semibold text-slate-950">Entrar</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-700">
              Use seu e-mail e senha cadastrado.
            </CardDescription>
            {!envReady ? (
              <div className="rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
                Preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no `.env` antes de autenticar.
              </div>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-800">
                Email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 rounded-xl border-slate-300 bg-slate-50 pl-10 text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white"
                  placeholder="voce@empresa.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-800">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 rounded-xl border-slate-300 bg-slate-50 pr-12 text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white"
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <Checkbox checked={rememberMe} onCheckedChange={(checked) => setRememberMe(Boolean(checked))} />
                <span>Lembrar de mim</span>
              </label>

              <button
                type="button"
                className="text-sm font-medium text-sky-700 transition hover:text-sky-900"
                onClick={() => {
                  setResetEmail(email || getRememberedEmail());
                  setResetOpen(true);
                }}
              >
                Esqueceu a senha?
              </button>
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-300/80 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                {error}
              </div>
            ) : null}

            <Button
              type="button"
              className="h-12 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800"
              disabled={submitting || !envReady || !email || !password}
              onClick={() => void handleLogin()}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? "Entrando..." : "Acessar plataforma"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={resetOpen} onOpenChange={handleResetOpenChange}>
        <DialogContent className="overflow-hidden border border-slate-200/90 bg-white p-0 shadow-2xl sm:max-w-lg">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_38%),linear-gradient(135deg,_#f8fafc,_#eef6ff_48%,_#ffffff)] px-6 py-6">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300/50">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-2xl font-semibold text-slate-950">Recuperar senha</DialogTitle>
                <DialogDescription className="max-w-md text-sm leading-6 text-slate-600">
                  Receba um codigo ou link por e-mail e defina uma nova senha sem precisar falar com o suporte.
                </DialogDescription>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 pb-6 pt-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Etapa 1</p>
                  <p className="text-xs text-slate-500">Confirmar seu e-mail e solicitar o codigo</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-sm font-semibold text-slate-800">
                    Email cadastrado
                  </Label>
                  <Input
                    id="reset-email"
                    type="email"
                    autoComplete="email"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                    placeholder="voce@empresa.com"
                    className="h-12 rounded-xl border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus:border-sky-500"
                  />
                </div>

                <Button
                  type="button"
                  className="h-12 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800"
                  disabled={sendingReset || !resetEmail.trim()}
                  onClick={() => void handleSendResetCode()}
                >
                  {sendingReset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {sendingReset ? "Enviando..." : "Enviar codigo de recuperacao"}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                  <KeyRound className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Etapa 2</p>
                  <p className="text-xs text-slate-500">Validar o codigo e definir a nova senha</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="reset-code" className="text-sm font-semibold text-slate-800">
                    Codigo de verificacao
                  </Label>
                  <Input
                    id="reset-code"
                    value={resetCode}
                    onChange={(event) => setResetCode(event.target.value)}
                    placeholder="Digite o codigo recebido"
                    className="h-12 rounded-xl border-slate-300 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full rounded-xl border-slate-300 bg-white text-slate-900 hover:bg-slate-50"
                  disabled={verifyingReset || !resetEmail.trim() || !resetCode.trim()}
                  onClick={() => void handleVerifyResetCode()}
                >
                  {verifyingReset ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {verifyingReset ? "Validando..." : "Validar codigo"}
                </Button>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-sm font-semibold text-slate-800">
                      Nova senha
                    </Label>
                    <Input
                      id="new-password"
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      placeholder="Nova senha"
                      disabled={!recoveryReady}
                      className="h-12 rounded-xl border-slate-300 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white disabled:bg-slate-100"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-sm font-semibold text-slate-800">
                      Confirmar nova senha
                    </Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Repita a nova senha"
                      disabled={!recoveryReady}
                      className="h-12 rounded-xl border-slate-300 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white disabled:bg-slate-100"
                    />
                  </div>
                </div>
              </div>
            </div>

            {resetError ? (
              <div className="rounded-2xl border border-rose-300/80 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
                {resetError}
              </div>
            ) : null}

            {resetMessage ? (
              <div className="rounded-2xl border border-emerald-300/80 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                {resetMessage}
              </div>
            ) : null}

            <Button
              type="button"
              className="h-12 w-full rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600"
              disabled={savingPassword || !recoveryReady || !newPassword || !confirmPassword}
              onClick={() => void handleUpdatePassword()}
            >
              {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {savingPassword ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
