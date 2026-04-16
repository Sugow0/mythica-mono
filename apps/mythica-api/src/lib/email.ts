import "dotenv/config";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY ?? "";
const from = process.env.EMAIL_FROM ?? "Mythica <onboarding@resend.dev>";
const appName = process.env.APP_NAME ?? "Mythica";

const resend = apiKey ? new Resend(apiKey) : null;

/** URL de base pour les liens de vérification (ex: https://app.mythica.com) */
export function getVerificationBaseUrl(): string {
	return (
		process.env.FRONTEND_URL ??
		process.env.API_BASE_URL ??
		"http://localhost:3200"
	);
}

/**
 * Envoie l'email de vérification d'adresse avec Resend.
 * @returns { success: true } ou { success: false, error }
 */
export async function sendVerificationEmail(
	to: string,
	token: string,
	pseudo?: string,
): Promise<{ success: true } | { success: false; error: string }> {
	if (!resend) {
		console.warn("[email] RESEND_API_KEY non configuré, email non envoyé");
		return { success: true }; // en dev on peut ne pas bloquer
	}

	const baseUrl = getVerificationBaseUrl();
	const verifyUrl = `${baseUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;

	const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Vérifiez votre email</title></head>
<body style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h1 style="color: #333;">${appName}</h1>
  <p>Bonjour${pseudo ? ` ${pseudo}` : ""},</p>
  <p>Cliquez sur le lien ci-dessous pour vérifier votre adresse email :</p>
  <p><a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">Vérifier mon email</a></p>
  <p style="color: #666; font-size: 14px;">Ou copiez ce lien dans votre navigateur :</p>
  <p style="word-break: break-all; font-size: 12px;">${verifyUrl}</p>
  <p style="color: #888; font-size: 12px;">Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.</p>
</body>
</html>
  `.trim();

	try {
		const { error } = await resend.emails.send({
			from,
			to: [to],
			subject: `Vérifiez votre email - ${appName}`,
			html,
		});
		if (error) {
			return { success: false, error: error.message };
		}
		return { success: true };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { success: false, error: message };
	}
}
