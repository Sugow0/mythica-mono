import { Elysia } from "elysia";
import { redis } from "../../lib/redis";

const SESSION_PREFIX = "session:";
const SESSION_COOKIE_NAME = "auth_session";

type SessionPayload = {
	userId: string;
	expiresAt: number;
	attributes: { role?: string };
};

type ResolvedSession = { userId: string; userRole: string };

function parseSessionCookie(cookieHeader: string): string | null {
	const match = cookieHeader.match(
		new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]*)`),
	);
	return match ? decodeURIComponent(match[1]) : null;
}

async function resolveSession(
	request: Request,
): Promise<ResolvedSession | null> {
	const sessionId = parseSessionCookie(request.headers.get("cookie") ?? "");
	if (!sessionId) return null;

	const raw = await redis.get(`${SESSION_PREFIX}${sessionId}`);
	if (!raw) return null;

	const data = JSON.parse(raw) as SessionPayload;
	if (Date.now() > data.expiresAt) return null;

	return {
		userId: data.userId,
		userRole: data.attributes.role ?? "USER",
	};
}

export const authMiddleware = new Elysia({ name: "auth-middleware" })
	.resolve({ as: "scoped" }, async ({ request }) => {
		const session = await resolveSession(request);
		return {
			userId: session?.userId ?? (null as string | null),
			userRole: session?.userRole ?? (null as string | null),
		};
	})
	.onBeforeHandle({ as: "scoped" }, ({ userId, set }) => {
		if (!userId) {
			set.status = 401;
			return { error: "Unauthorized" };
		}
	});
