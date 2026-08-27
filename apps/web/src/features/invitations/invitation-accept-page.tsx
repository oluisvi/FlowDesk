"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, LoaderCircle, LogIn, Users2 } from "lucide-react";
import { Button, Card, Input } from "@flowdesk/ui";
import { Brand } from "@/components/brand";
import { api } from "@/lib/api";
import { useSession } from "@/lib/session";

function InvitationAcceptInner() {
  const search = useSearchParams();
  const router = useRouter();
  const { user, ready, reloadWorkspaces } = useSession();
  const [token, setToken] = useState(search.get("token") ?? "");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const value = search.get("token");
    if (value) setToken(value);
  }, [search]);

  const accept = async () => {
    if (!token.trim()) return;
    setState("loading");
    setMessage(null);
    try {
      await api.post("/invitations/accept", { token: token.trim() });
      await reloadWorkspaces();
      setState("success");
      window.setTimeout(() => router.push("/app"), 900);
    } catch (error) {
      setState("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "O convite não pôde ser aceito. Verifique se ele ainda é válido.",
      );
    }
  };

  return (
    <main className="invite-screen">
      <Card className="invite-card">
        <Brand />
        <div className="invite-card__icon">
          {state === "success" ? <CheckCircle2 /> : <Users2 />}
        </div>
        <h1>{state === "success" ? "Você entrou no workspace." : "Aceitar convite"}</h1>
        <p>
          {state === "success"
            ? "Acesso confirmado. Estamos abrindo sua operação."
            : "O token valida seu e-mail, papel e workspace sem expor a credencial persistida no banco."}
        </p>

        {!ready ? (
          <div className="invite-loading"><LoaderCircle className="animate-spin" /> Verificando sua sessão…</div>
        ) : !user ? (
          <div className="invite-auth-required">
            <LogIn size={17} />
            <div>
              <strong>Entre na sua conta primeiro.</strong>
              <span>Use exatamente o e-mail que recebeu o convite.</span>
            </div>
            <Button asChild><Link href="/login">Entrar</Link></Button>
          </div>
        ) : state !== "success" ? (
          <>
            <div className="field">
              <label htmlFor="invitation-token">Token do convite</label>
              <div className="token-input-wrap">
                <KeyRound size={15} />
                <Input
                  id="invitation-token"
                  autoFocus={!token}
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  placeholder="Cole o token recebido"
                />
              </div>
            </div>
            {message ? <div className="validation-banner">{message}</div> : null}
            <Button
              size="lg"
              style={{ width: "100%" }}
              disabled={!token.trim() || state === "loading"}
              onClick={() => void accept()}
            >
              {state === "loading" ? (
                <><LoaderCircle size={15} className="animate-spin" /> Validando convite…</>
              ) : (
                "Entrar no workspace"
              )}
            </Button>
          </>
        ) : null}
      </Card>
    </main>
  );
}

export function InvitationAcceptPage() {
  return (
    <Suspense fallback={<main className="invite-screen">Preparando convite…</main>}>
      <InvitationAcceptInner />
    </Suspense>
  );
}
