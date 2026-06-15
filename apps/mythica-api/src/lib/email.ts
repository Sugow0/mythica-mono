import "dotenv/config";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY ?? "";
const from = process.env.EMAIL_FROM ?? "Mythica <onboarding@resend.dev>";
const appName = process.env.APP_NAME ?? "Mythica";

const resend = apiKey ? new Resend(apiKey) : null;

export type EmailResult = { success: true } | { success: false; error: string };

/** URL de base pour les liens des emails (ex: https://app.mythica.com) */
export function getVerificationBaseUrl(): string {
	return (
		process.env.FRONTEND_URL ??
		process.env.API_BASE_URL ??
		"http://localhost:3200"
	);
}

/** Envoie un email transactionnel via Resend (ou no-op en dev sans clé). */
async function sendEmail(
	to: string,
	subject: string,
	html: string,
): Promise<EmailResult> {
	if (!resend) {
		console.warn("[email] RESEND_API_KEY non configuré, email non envoyé");
		return { success: true }; // en dev on peut ne pas bloquer
	}
	try {
		const { error } = await resend.emails.send({
			from,
			to: [to],
			subject,
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

/** Construit le HTML d'un email d'action (bouton + lien de secours). */
function buildActionEmail(params: {
	title: string;
	pseudo?: string;
	intro: string;
	buttonLabel: string;
	url: string;
	footer: string;
}): string {
	const { title, pseudo, intro, buttonLabel, url, footer } = params;
	return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
  <h1 style="color: #333;">${appName}</h1>
  <p>Bonjour${pseudo ? ` ${pseudo}` : ""},</p>
  <p>${intro}</p>
  <p><a href="${url}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 8px;">${buttonLabel}</a></p>
  <p style="color: #666; font-size: 14px;">Ou copiez ce lien dans votre navigateur :</p>
  <p style="word-break: break-all; font-size: 12px;">${url}</p>
  <p style="color: #888; font-size: 12px;">${footer}</p>
</body>
</html>
  `.trim();
}

/** Envoie l'email de vérification d'adresse. */
export async function sendVerificationEmail(
	to: string,
	token: string,
	pseudo?: string,
): Promise<EmailResult> {
	const baseUrl = getVerificationBaseUrl().replace(/\/$/, "");
	const url = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;
	const html = buildActionEmail({
		title: "Vérifiez votre email",
		pseudo,
		intro: "Cliquez sur le lien ci-dessous pour vérifier votre adresse email :",
		buttonLabel: "Vérifier mon email",
		url,
		footer:
			"Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte, ignorez cet email.",
	});
	return sendEmail(to, `Vérifiez votre email - ${appName}`, html);
}

/** Envoie l'email de réinitialisation de mot de passe. */
export async function sendPasswordResetEmail(
	to: string,
	token: string,
	pseudo?: string,
): Promise<EmailResult> {
	const baseUrl = getVerificationBaseUrl().replace(/\/$/, "");
	const url = `${baseUrl}/reset-password/${encodeURIComponent(token)}`;
	const html = buildActionEmail({
		title: "Réinitialisez votre mot de passe",
		pseudo,
		intro:
			"Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous :",
		buttonLabel: "Choisir un nouveau mot de passe",
		url,
		footer:
			"Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.",
	});
	return sendEmail(to, `Réinitialisation de mot de passe - ${appName}`, html);
}
