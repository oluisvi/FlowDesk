"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound } from "lucide-react";
import { Button, Input } from "@flowdesk/ui";
import { api } from "@/lib/api";
import { AuthShell } from "./auth-shell";

export function PasswordRecovery() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const submit = async () => {
    setBusy(true); setError("");
    try {
      const result = await api.post<{ accepted: true; resetToken?: string }>("/auth/password-recovery", { email });
      setDevToken(result.resetToken ?? null); setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : "Não foi possível processar a solicitação."); }
    finally { setBusy(false); }
  };
  return <AuthShell>{done ? <div className="auth-form"><CheckCircle2 size={24} className="auth-success-icon" /><h1>Solicitação recebida.</h1><p>Se a conta existir, o fluxo de recuperação foi iniciado. A resposta permanece neutra para não revelar usuários cadastrados.</p>{devToken && <div className="dev-token"><strong>Ambiente local</strong><p>O backend expõe o token somente fora de produção para facilitar testes.</p><Button asChild><Link href={`/reset-password?token=${encodeURIComponent(devToken)}`}>Continuar com token local</Link></Button></div>}<Link href="/login" className="back-link"><ArrowLeft size={13} /> Voltar ao login</Link></div> : <div className="auth-form"><KeyRound size={23} className="auth-success-icon" /><h1>Recuperar acesso.</h1><p>Informe o e-mail da conta. Em produção, um link de uso único é enviado pelo canal de recuperação configurado e o token nunca volta na resposta.</p><div className="field"><label htmlFor="recovery-email">E-mail</label><Input id="recovery-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void submit(); }} /></div>{error && <p className="form-error">{error}</p>}<Button size="lg" style={{ width: "100%" }} disabled={!email.trim() || busy} onClick={() => void submit()}>{busy ? "Enviando…" : "Solicitar recuperação"}</Button><div className="auth-divider" /><Link href="/login" className="back-link"><ArrowLeft size={13} /> Voltar ao login</Link></div>}</AuthShell>;
}
