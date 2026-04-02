import { useState } from "react";
import { Eye, EyeOff, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { getRememberedEmail, getRememberMePreference, setRememberedEmail, setRememberMePreference } from "@/lib/auth-storage";
import { formatPhoneBR } from "@/lib/masks";

export default function LoginPage() {
  const { session, user, loading, signIn, hasUsers, registerFirstUser, requestPasswordReset, updatePassword } = useAuth();
  const [email, setEmail] = useState(() => getRememberedEmail());
  const [password, setPassword] = useState("");
  const [setupName, setSetupName] = useState("");
  const [setupPhone, setSetupPhone] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => getRememberMePreference());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState(() => getRememberedEmail());
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  if (!loading && session && user && !resetOpen) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async () => {
    setSubmitting(true);
    setError(null);
    setRememberMePreference(rememberMe);
    setRememberedEmail(rememberMe ? email.trim() : "");

    try {
      await signIn(email.trim(), password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Nao foi possivel entrar.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFirstAccess = async () => {
    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas nao conferem.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setRememberMePreference(true);
    setRememberedEmail(email.trim());

    try {
      await registerFirstUser({
        name: setupName.trim(),
        email: email.trim(),
        password,
        phone: setupPhone.trim() || undefined,
      });
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Nao foi possivel criar o primeiro acesso.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendResetCode = async () => {
    setSendingReset(true);
    setResetError(null);
    setResetMessage(null);

    try {
      const result = await requestPasswordReset(resetEmail.trim());
      setResetMessage(`${result.message} Voce tambem pode definir uma nova senha abaixo, se ja estiver logado.`);
    } catch (resetRequestError) {
      setResetError(resetRequestError instanceof Error ? resetRequestError.message : "Nao foi possivel recuperar a senha.");
    } finally {
      setSendingReset(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.length < 6) {
      setResetError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== passwordConfirmation) {
      setResetError("As senhas nao conferem.");
      return;
    }

    setSavingPassword(true);
    setResetError(null);
    setResetMessage(null);

    try {
      await updatePassword(newPassword);
      setResetMessage("Senha local atualizada com sucesso.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (updateError) {
      setResetError(updateError instanceof Error ? updateError.message : "Nao foi possivel atualizar a senha.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.18),_transparent_28%),linear-gradient(135deg,_#020617,_#0f172a_45%,_#111827)]" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />

      <div className="relative grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden rounded-[32px] border border-white/10 bg-white/5 p-10 text-white shadow-2xl shadow-sky-950/40 lg:block">
          <p className="text-sm uppercase tracking-[0.35em] text-sky-200/70">Valet Tracker</p>
          <h1 className="mt-6 max-w-md font-serif text-5xl leading-tight">Operacao de valet em ambiente local, sem dados ficticios pre-carregados.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-slate-300">
            Os dados operacionais agora comecam vazios. No primeiro acesso, crie o administrador local e siga preenchendo a base com dados reais.
          </p>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200">
            <p className="font-semibold">{hasUsers ? "Acesso local" : "Primeiro acesso"}</p>
            <p className="mt-2">
              {hasUsers
                ? "Use as credenciais ja cadastradas localmente para entrar."
                : "Crie o primeiro usuario administrador para liberar o restante da plataforma."}
            </p>
          </div>
        </section>

        <Card className="border border-slate-200/80 bg-white/95 shadow-2xl shadow-slate-950/25 backdrop-blur-xl">
          <CardHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300/40">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <CardTitle className="text-3xl font-semibold text-slate-950">Entrar</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-700">
              {hasUsers ? "Use sua conta local para acessar a plataforma." : "Crie o primeiro acesso local para iniciar a operacao."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!hasUsers ? (
              <div className="space-y-2">
                <Label htmlFor="setup-name" className="text-sm font-semibold text-slate-800">
                  Nome completo
                </Label>
                <Input
                  id="setup-name"
                  value={setupName}
                  onChange={(event) => setSetupName(event.target.value)}
                  className="h-12 rounded-xl border-slate-300 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white"
                  placeholder="Seu nome"
                />
              </div>
            ) : null}

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
                {hasUsers ? "Senha" : "Crie uma senha"}
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

            {!hasUsers ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="setup-phone" className="text-sm font-semibold text-slate-800">
                    Telefone
                  </Label>
                  <Input
                    id="setup-phone"
                    value={setupPhone}
                    onChange={(event) => setSetupPhone(formatPhoneBR(event.target.value))}
                    className="h-12 rounded-xl border-slate-300 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white"
                    placeholder="(00) 00000-0000"
                    inputMode="numeric"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-semibold text-slate-800">
                    Confirmar senha
                  </Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-12 rounded-xl border-slate-300 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white"
                    placeholder="Repita a senha"
                  />
                </div>
              </>
            ) : (
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
                  Ajuda com a senha
                </button>
              </div>
            )}

            {error ? <div className="rounded-2xl border border-rose-300/80 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{error}</div> : null}

            <Button
              type="button"
              className="h-12 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-800"
              disabled={submitting || !email || !password || (!hasUsers && (!setupName || !confirmPassword))}
              onClick={() => void (hasUsers ? handleLogin() : handleFirstAccess())}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitting ? (hasUsers ? "Entrando..." : "Criando acesso...") : hasUsers ? "Acessar plataforma" : "Criar primeiro acesso"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="overflow-hidden border border-slate-200/90 bg-white p-0 shadow-2xl sm:max-w-lg">
          <div className="bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_38%),linear-gradient(135deg,_#f8fafc,_#eef6ff_48%,_#ffffff)] px-6 py-6">
            <DialogHeader className="space-y-3 text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-300/50">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <DialogTitle className="text-2xl font-semibold text-slate-950">Senha em modo local</DialogTitle>
                <DialogDescription className="max-w-md text-sm leading-6 text-slate-600">
                  Como o projeto esta sem servico de identidade externo, a redefinicao de senha acontece localmente.
                </DialogDescription>
              </div>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 pb-6 pt-5">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-sm font-semibold text-slate-800">
                Email
              </Label>
              <Input
                id="reset-email"
                type="email"
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
              {sendingReset ? "Consultando..." : "Mostrar instrucoes"}
            </Button>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-semibold text-slate-800">
                  Nova senha
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Nova senha"
                  className="h-12 rounded-xl border-slate-300 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-semibold text-slate-800">
                  Confirmar nova senha
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={passwordConfirmation}
                  onChange={(event) => setPasswordConfirmation(event.target.value)}
                  placeholder="Repita a nova senha"
                  className="h-12 rounded-xl border-slate-300 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white"
                />
              </div>
            </div>

            {resetError ? <div className="rounded-2xl border border-rose-300/80 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">{resetError}</div> : null}
            {resetMessage ? <div className="rounded-2xl border border-emerald-300/80 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{resetMessage}</div> : null}

            <Button
              type="button"
              className="h-12 w-full rounded-xl bg-sky-500 text-white shadow-lg shadow-sky-200 transition hover:bg-sky-600"
              disabled={savingPassword || !newPassword || !passwordConfirmation}
              onClick={() => void handleUpdatePassword()}
            >
              {savingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {savingPassword ? "Salvando..." : "Salvar nova senha local"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
