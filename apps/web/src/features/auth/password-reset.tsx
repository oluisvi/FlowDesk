"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ArrowRight, KeyRound } from "lucide-react";
import { Button, Input } from "@flowdesk/ui";
import { api } from "@/lib/api";
import { AuthShell } from "./auth-shell";

export function PasswordReset() {
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    if (password !== confirm) { setError("As senhas precisam ser iguais."); return; }
    setBusy(true); setError("");
    try { await api.post("/auth/password-reset", { token, password }); setDone(true); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível redefinir a senha."); }
    finally { setBusy(false); }
  };
  return <AuthShell>{done ? <div className="auth-form"><h1>Senha atualizada.</h1><p>Todas as sessões anteriores foram revogadas. Entre novamente para iniciar uma nova família de sessão.</p><Button asChild size="lg"><Link href="/login">Entrar novamente <ArrowRight size={14} /></Link></Button></div> : <div className="auth-form"><KeyRound size={23} className="auth-success-icon" /><h1>Defina uma nova senha.</h1><p>O token é de uso único e expira. A troca também encerra as sessões ativas da conta.</p><div className="field"><label>Token</label><Input value={token} onChange={(e) => setToken(e.target.value)} /></div><div className="field"><label>Nova senha</label><Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div><div className="field"><label>Confirmar senha</label><Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>{error && <p className="form-error">{error}</p>}<Button size="lg" style={{ width: "100%" }} disabled={token.length < 32 || password.length < 12 || busy} onClick={() => void submit()}>{busy ? "Atualizando…" : "Atualizar senha"}</Button></div>}</AuthShell>;
}
