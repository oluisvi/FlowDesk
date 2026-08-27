import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class PasswordResetDeliveryService {
  private readonly logger = new Logger(PasswordResetDeliveryService.name);

  async deliver(email: string, token: string): Promise<boolean> {
    if (process.env.NODE_ENV !== "production") return false;

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.PASSWORD_RESET_FROM_EMAIL;
    const baseUrl = process.env.PASSWORD_RESET_BASE_URL;
    if (!apiKey || !from || !baseUrl) {
      this.logger.warn(
        JSON.stringify({
          type: "password_reset_delivery_unconfigured",
          provider: "resend",
        }),
      );
      return false;
    }

    const resetUrl = new URL(baseUrl);
    resetUrl.searchParams.set("token", token);

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: "Redefina sua senha do FlowDesk",
          text: [
            "Recebemos uma solicitação para redefinir sua senha do FlowDesk.",
            "",
            `Abra este link para continuar: ${resetUrl.toString()}`,
            "",
            "O link expira em 30 minutos e só pode ser usado uma vez.",
            "Se você não solicitou a alteração, ignore este e-mail.",
          ].join("\n"),
        }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        throw new Error(`Resend returned HTTP ${response.status}`);
      }
      return true;
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          type: "password_reset_delivery_failed",
          provider: "resend",
          message:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Unknown delivery error",
        }),
      );
      return false;
    }
  }
}
