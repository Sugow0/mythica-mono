import { beforeEach, describe, expect, it, mock } from "bun:test";

// ===== MODULE MOCKS (hoisted by Bun before imports) =====

const mockUserFindUnique = mock(async () => null as unknown);
const mockUserUpdate = mock(async () => ({}) as unknown);
const mockTokenFindUnique = mock(async () => null as unknown);
const mockTokenCreate = mock(async () => ({}) as unknown);
const mockTokenDelete = mock(async () => ({}) as unknown);
const mockTokenDeleteMany = mock(async () => ({ count: 0 }) as unknown);
const mockTransaction = mock(async (ops: Promise<unknown>[]) =>
	Promise.all(ops),
);

mock.module("../../../lib/prisma", () => ({
	prisma: {
		users: { findUnique: mockUserFindUnique, update: mockUserUpdate },
		passwordResetTokens: {
			findUnique: mockTokenFindUnique,
			create: mockTokenCreate,
			delete: mockTokenDelete,
			deleteMany: mockTokenDeleteMany,
		},
		$transaction: mockTransaction,
	},
}));

const mockSendPasswordResetEmail = mock(async () => ({ success: true }));
// Mock complet du module (mock.module est global au process : on conserve
// toutes les exports pour ne pas casser les autres fichiers de test).
mock.module("../../../lib/email", () => ({
	sendPasswordResetEmail: mockSendPasswordResetEmail,
	sendVerificationEmail: mock(async () => ({ success: true })),
	getVerificationBaseUrl: () => "http://localhost:3200",
}));

const mockHashPassword = mock(async () => "hashed-password");
mock.module("../../../lib/password", () => ({
	hashPassword: mockHashPassword,
}));

const mockInvalidateUserSessions = mock(async () => {});
mock.module("../../../lib/auth", () => ({
	lucia: { invalidateUserSessions: mockInvalidateUserSessions },
}));

const { forgotPasswordHandler } =
	require("../commands/forgot-password/forgot-password.handler") as typeof import("../commands/forgot-password/forgot-password.handler");
const { resetPasswordHandler } =
	require("../commands/reset-password/reset-password.handler") as typeof import("../commands/reset-password/reset-password.handler");

beforeEach(() => {
	mockUserFindUnique.mockReset();
	mockUserUpdate.mockReset();
	mockTokenFindUnique.mockReset();
	mockTokenCreate.mockReset();
	mockTokenDelete.mockReset();
	mockTokenDeleteMany.mockReset();
	mockTransaction.mockReset();
	mockSendPasswordResetEmail.mockReset();
	mockHashPassword.mockReset();
	mockInvalidateUserSessions.mockReset();

	mockUserUpdate.mockResolvedValue({} as unknown);
	mockTokenCreate.mockResolvedValue({} as unknown);
	mockTokenDelete.mockResolvedValue({} as unknown);
	mockTokenDeleteMany.mockResolvedValue({ count: 0 } as unknown);
	mockTransaction.mockImplementation(async (ops: Promise<unknown>[]) =>
		Promise.all(ops),
	);
	mockSendPasswordResetEmail.mockResolvedValue({ success: true } as unknown);
	mockHashPassword.mockResolvedValue("hashed-password" as unknown);
	mockInvalidateUserSessions.mockResolvedValue(undefined as unknown);
});

describe("forgotPasswordHandler", () => {
	it("crée un token et envoie un email si l'utilisateur existe", async () => {
		mockUserFindUnique.mockResolvedValue({
			id: "u1",
			pseudo: "Bob",
		} as unknown);

		const result = await forgotPasswordHandler({ email: "bob@example.com" });

		expect(result.success).toBe(true);
		expect(mockTokenDeleteMany).toHaveBeenCalledWith({
			where: { userId: "u1" },
		});
		expect(mockTokenCreate).toHaveBeenCalledTimes(1);
		expect(mockSendPasswordResetEmail).toHaveBeenCalledTimes(1);
	});

	it("retourne success sans créer de token si l'utilisateur n'existe pas", async () => {
		mockUserFindUnique.mockResolvedValue(null as unknown);

		const result = await forgotPasswordHandler({ email: "ghost@example.com" });

		expect(result.success).toBe(true);
		expect(mockTokenCreate).not.toHaveBeenCalled();
		expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
	});

	it("normalise l'email (trim)", async () => {
		mockUserFindUnique.mockResolvedValue({
			id: "u1",
			pseudo: "Bob",
		} as unknown);

		await forgotPasswordHandler({ email: "  bob@example.com  " });

		expect(mockUserFindUnique).toHaveBeenCalledWith({
			where: { email: "bob@example.com" },
			select: { id: true, pseudo: true },
		});
	});
});

describe("resetPasswordHandler", () => {
	const validToken = {
		id: "t1",
		userId: "u1",
		token: "tok",
		expiresAt: new Date(Date.now() + 3_600_000),
	};

	it("réinitialise le mot de passe avec un token valide", async () => {
		mockTokenFindUnique.mockResolvedValue(validToken as unknown);

		const result = await resetPasswordHandler({
			token: "tok",
			newPassword: "newpassword123",
		});

		expect(result.success).toBe(true);
		expect(mockHashPassword).toHaveBeenCalledWith("newpassword123");
		expect(mockTransaction).toHaveBeenCalledTimes(1);
		expect(mockInvalidateUserSessions).toHaveBeenCalledWith("u1");
	});

	it("échoue si le token est introuvable", async () => {
		mockTokenFindUnique.mockResolvedValue(null as unknown);

		const result = await resetPasswordHandler({
			token: "inconnu",
			newPassword: "newpassword123",
		});

		expect(result.success).toBe(false);
		expect(mockTransaction).not.toHaveBeenCalled();
		expect(mockInvalidateUserSessions).not.toHaveBeenCalled();
	});

	it("échoue et supprime un token expiré", async () => {
		mockTokenFindUnique.mockResolvedValue({
			...validToken,
			expiresAt: new Date(Date.now() - 1_000),
		} as unknown);

		const result = await resetPasswordHandler({
			token: "tok",
			newPassword: "newpassword123",
		});

		expect(result.success).toBe(false);
		expect(mockTokenDelete).toHaveBeenCalledWith({ where: { id: "t1" } });
		expect(mockTransaction).not.toHaveBeenCalled();
	});

	it("ignore une erreur lors de la suppression d'un token expiré", async () => {
		mockTokenFindUnique.mockResolvedValue({
			...validToken,
			expiresAt: new Date(Date.now() - 1_000),
		} as unknown);
		mockTokenDelete.mockRejectedValue(new Error("db indisponible") as unknown);

		const result = await resetPasswordHandler({
			token: "tok",
			newPassword: "newpassword123",
		});

		expect(result.success).toBe(false);
	});

	it("échoue si le token est vide", async () => {
		const result = await resetPasswordHandler({
			token: "   ",
			newPassword: "newpassword123",
		});

		expect(result.success).toBe(false);
		expect(mockTokenFindUnique).not.toHaveBeenCalled();
	});
});
