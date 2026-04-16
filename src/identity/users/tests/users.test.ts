import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	mock,
	spyOn,
} from "bun:test";

// ===== MODULE MOCKS (hoisted by Bun before imports) =====

const mockFindUnique = mock(async () => null as unknown);
const mockUpdate = mock(async () => ({}) as unknown);
const mockFindMany = mock(async () => [] as unknown[]);
const mockCount = mock(async () => 0);
const mockDeleteMany = mock(async () => ({}) as unknown);
const mockCreate = mock(async () => ({}) as unknown);
const mockTransaction = mock(async (ops: Promise<unknown>[]) =>
	Promise.all(ops),
);

mock.module("../../../lib/prisma", () => ({
	prisma: {
		users: {
			findUnique: mockFindUnique,
			update: mockUpdate,
			findMany: mockFindMany,
			count: mockCount,
		},
		emailVerificationToken: {
			deleteMany: mockDeleteMany,
			create: mockCreate,
		},
		$transaction: mockTransaction,
	},
}));

const mockUploadUserAvatar = mock(async () => "user-1/profile.jpg");

mock.module("../../../lib/minio", () => ({
	isAllowedImageType: (mime: string) =>
		["image/jpeg", "image/png", "image/webp"].includes(mime),
	MAX_AVATAR_SIZE_BYTES: 5 * 1024 * 1024,
	uploadUserAvatar: mockUploadUserAvatar,
}));

const mockSendVerificationEmail = mock(
	async (): Promise<{ success: true } | { success: false; error: string }> => ({
		success: true,
	}),
);

mock.module("../../../lib/email", () => ({
	sendVerificationEmail: mockSendVerificationEmail,
}));

const mockVerifyTOTP = mock(() => true);

mock.module("@oslojs/otp", () => ({
	verifyTOTP: mockVerifyTOTP,
}));

mock.module("../../auth/commands/two-fa/two-fa.utils", () => ({
	hexToSecret: (_hex: string) => new Uint8Array(20),
	TOTP_DIGITS: 6,
	TOTP_PERIOD: 30,
}));

// ===== HANDLER IMPORTS (require — not hoisted, runs after mock.module) =====
const { getMeHandler } =
	require("../queries/get-me/get-me.handler") as typeof import("../queries/get-me/get-me.handler");
const { getUserByIdHandler } =
	require("../queries/get-user-by-id/get-user-by-id.handler") as typeof import("../queries/get-user-by-id/get-user-by-id.handler");
const { getUsersHandler } =
	require("../queries/get-users/get-users.handler") as typeof import("../queries/get-users/get-users.handler");
const { changeEmailHandler } =
	require("../commands/change-email/change-email.handler") as typeof import("../commands/change-email/change-email.handler");
const { changePasswordHandler } =
	require("../commands/change-password/change-password.handler") as typeof import("../commands/change-password/change-password.handler");
const { uploadAvatarHandler } =
	require("../commands/upload-avatar/upload-avatar.handler") as typeof import("../commands/upload-avatar/upload-avatar.handler");

// ===== SHARED FIXTURES =====

const publicUser = {
	id: "user-1",
	firstName: "Jean",
	lastName: "Dupont",
	pseudo: "jdupont",
	avatar: null,
	emailVerified: true,
	createdAt: new Date("2024-01-01"),
};

const meUser = {
	...publicUser,
	email: "jean@example.com",
	role: "USER",
};

// ===== getMeHandler =====

describe("getMeHandler", () => {
	beforeEach(() => {
		mockFindUnique.mockReset();
	});

	it("returns user on success", async () => {
		mockFindUnique.mockResolvedValueOnce(meUser);

		const result = await getMeHandler("user-1");

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.user.id).toBe("user-1");
			expect(result.user.email).toBe("jean@example.com");
			expect(result.user.role).toBe("USER");
		}
	});

	it("returns error when user not found", async () => {
		mockFindUnique.mockResolvedValueOnce(null);

		const result = await getMeHandler("nonexistent");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe("Utilisateur non trouvé");
		}
	});
});

// ===== getUserByIdHandler =====

describe("getUserByIdHandler", () => {
	beforeEach(() => {
		mockFindUnique.mockReset();
	});

	it("returns public user on success", async () => {
		mockFindUnique.mockResolvedValueOnce(publicUser);

		const result = await getUserByIdHandler("user-1");

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.user.id).toBe("user-1");
			expect(result.user.pseudo).toBe("jdupont");
		}
	});

	it("returns error when user not found", async () => {
		mockFindUnique.mockResolvedValueOnce(null);

		const result = await getUserByIdHandler("nonexistent");

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe("Utilisateur non trouvé");
		}
	});
});

// ===== getUsersHandler =====

describe("getUsersHandler", () => {
	beforeEach(() => {
		mockFindMany.mockReset();
		mockCount.mockReset();
	});

	it("returns paginated user list", async () => {
		const users = [publicUser, { ...publicUser, id: "user-2" }];
		mockFindMany.mockResolvedValueOnce(users);
		mockCount.mockResolvedValueOnce(2);

		const result = await getUsersHandler({ page: 1, limit: 20 });

		expect(result.success).toBe(true);
		expect(result.users).toHaveLength(2);
		expect(result.pagination).toEqual({
			page: 1,
			limit: 20,
			total: 2,
			totalPages: 1,
		});
	});

	it("calculates totalPages correctly", async () => {
		mockFindMany.mockResolvedValueOnce([publicUser]);
		mockCount.mockResolvedValueOnce(50);

		const result = await getUsersHandler({ page: 2, limit: 10 });

		expect(result.pagination.totalPages).toBe(5);
		expect(result.pagination.page).toBe(2);
	});

	it("returns empty list when no users exist", async () => {
		mockFindMany.mockResolvedValueOnce([]);
		mockCount.mockResolvedValueOnce(0);

		const result = await getUsersHandler({ page: 1, limit: 20 });

		expect(result.users).toHaveLength(0);
		expect(result.pagination.total).toBe(0);
		expect(result.pagination.totalPages).toBe(0);
	});
});

// ===== changePasswordHandler =====

describe("changePasswordHandler", () => {
	let spyVerify: ReturnType<typeof spyOn>;
	let spyHash: ReturnType<typeof spyOn>;

	const validBody = {
		currentPassword: "CurrentPass1",
		newPassword: "NewPass456",
	};

	beforeEach(() => {
		mockFindUnique.mockReset();
		mockUpdate.mockImplementation(async () => ({}));
		spyVerify = spyOn(Bun.password, "verify").mockResolvedValue(true as never);
		spyHash = spyOn(Bun.password, "hash").mockResolvedValue(
			"new-hash" as never,
		);
	});

	afterEach(() => {
		spyVerify.mockRestore();
		spyHash.mockRestore();
	});

	it("changes password when email is verified", async () => {
		mockFindUnique.mockResolvedValueOnce({
			password: "hashed",
			emailVerified: true,
			twoFactorSecret: null,
		});

		const result = await changePasswordHandler("user-1", validBody);

		expect(result.success).toBe(true);
	});

	it("changes password when 2FA is enabled (email not verified)", async () => {
		mockFindUnique.mockResolvedValueOnce({
			password: "hashed",
			emailVerified: false,
			twoFactorSecret: "deadbeef",
		});

		const result = await changePasswordHandler("user-1", validBody);

		expect(result.success).toBe(true);
	});

	it("returns error when user not found", async () => {
		mockFindUnique.mockResolvedValueOnce(null);

		const result = await changePasswordHandler("nonexistent", validBody);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe("Utilisateur introuvable.");
		}
	});

	it("returns error for OAuth account (no password)", async () => {
		mockFindUnique.mockResolvedValueOnce({
			password: null,
			emailVerified: true,
			twoFactorSecret: null,
		});

		const result = await changePasswordHandler("user-1", validBody);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain("OAuth");
		}
	});

	it("returns error when email not verified and 2FA not enabled", async () => {
		mockFindUnique.mockResolvedValueOnce({
			password: "hashed",
			emailVerified: false,
			twoFactorSecret: null,
		});

		const result = await changePasswordHandler("user-1", validBody);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain("email est vérifié");
		}
	});

	it("returns error when current password is wrong", async () => {
		mockFindUnique.mockResolvedValueOnce({
			password: "hashed",
			emailVerified: true,
			twoFactorSecret: null,
		});
		spyVerify.mockResolvedValue(false as never);

		const result = await changePasswordHandler("user-1", validBody);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe("Mot de passe actuel incorrect.");
		}
	});
});

// ===== changeEmailHandler =====

describe("changeEmailHandler", () => {
	const validBody = {
		newEmail: "new@example.com",
		code: "123456",
	};

	beforeEach(() => {
		mockFindUnique.mockReset();
		mockUpdate.mockImplementation(async () => ({}));
		mockDeleteMany.mockImplementation(async () => ({}));
		mockCreate.mockImplementation(async () => ({}));
		mockTransaction.mockImplementation(async (ops: Promise<unknown>[]) =>
			Promise.all(ops),
		);
		mockVerifyTOTP.mockReturnValue(true);
		mockSendVerificationEmail.mockResolvedValue({ success: true as const });
	});

	it("changes email successfully", async () => {
		mockFindUnique
			.mockResolvedValueOnce({
				email: "old@example.com",
				twoFactorSecret: "deadbeef",
				pseudo: "jdupont",
			})
			.mockResolvedValueOnce(null); // new email not already in use

		const result = await changeEmailHandler("user-1", validBody);

		expect(result.success).toBe(true);
	});

	it("returns error when user not found", async () => {
		mockFindUnique.mockResolvedValueOnce(null);

		const result = await changeEmailHandler("nonexistent", validBody);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe("Utilisateur introuvable.");
		}
	});

	it("returns error when 2FA is not enabled", async () => {
		mockFindUnique.mockResolvedValueOnce({
			email: "old@example.com",
			twoFactorSecret: null,
			pseudo: "jdupont",
		});

		const result = await changeEmailHandler("user-1", validBody);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain("2FA");
		}
	});

	it("returns error when 2FA is empty string", async () => {
		mockFindUnique.mockResolvedValueOnce({
			email: "old@example.com",
			twoFactorSecret: "",
			pseudo: "jdupont",
		});

		const result = await changeEmailHandler("user-1", validBody);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain("2FA");
		}
	});

	it("returns error when TOTP code is invalid", async () => {
		mockVerifyTOTP.mockReturnValue(false);
		mockFindUnique.mockResolvedValueOnce({
			email: "old@example.com",
			twoFactorSecret: "deadbeef",
			pseudo: "jdupont",
		});

		const result = await changeEmailHandler("user-1", validBody);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe("Code 2FA incorrect.");
		}
	});

	it("returns error when new email is the same as current", async () => {
		mockFindUnique.mockResolvedValueOnce({
			email: "new@example.com", // same as validBody.newEmail
			twoFactorSecret: "deadbeef",
			pseudo: "jdupont",
		});

		const result = await changeEmailHandler("user-1", validBody);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain("identique");
		}
	});

	it("returns error when new email is already in use", async () => {
		mockFindUnique
			.mockResolvedValueOnce({
				email: "old@example.com",
				twoFactorSecret: "deadbeef",
				pseudo: "jdupont",
			})
			.mockResolvedValueOnce({ id: "user-2" }); // email already taken

		const result = await changeEmailHandler("user-1", validBody);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain("déjà utilisée");
		}
	});

	it("returns error when verification email fails to send", async () => {
		mockFindUnique
			.mockResolvedValueOnce({
				email: "old@example.com",
				twoFactorSecret: "deadbeef",
				pseudo: "jdupont",
			})
			.mockResolvedValueOnce(null);
		mockSendVerificationEmail.mockResolvedValueOnce({
			success: false as const,
			error: "SMTP unavailable",
		});

		const result = await changeEmailHandler("user-1", validBody);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBe("SMTP unavailable");
		}
	});
});

// ===== uploadAvatarHandler =====

describe("uploadAvatarHandler", () => {
	const validBuffer = Buffer.alloc(1024); // 1 KB
	const validType = "image/jpeg";

	beforeEach(() => {
		mockUploadUserAvatar.mockReset();
		mockUpdate.mockImplementation(async () => ({}));
		mockUploadUserAvatar.mockResolvedValue("user-1/profile.jpg");
	});

	it("uploads avatar successfully", async () => {
		const result = await uploadAvatarHandler("user-1", validBuffer, validType);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.avatarKey).toBe("user-1/profile.jpg");
		}
	});

	it("accepts png content type", async () => {
		const result = await uploadAvatarHandler(
			"user-1",
			validBuffer,
			"image/png",
		);

		expect(result.success).toBe(true);
	});

	it("accepts webp content type", async () => {
		const result = await uploadAvatarHandler(
			"user-1",
			validBuffer,
			"image/webp",
		);

		expect(result.success).toBe(true);
	});

	it("returns error for invalid image type", async () => {
		const result = await uploadAvatarHandler(
			"user-1",
			validBuffer,
			"application/pdf",
		);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain("non autorisé");
		}
	});

	it("returns error for text content type", async () => {
		const result = await uploadAvatarHandler(
			"user-1",
			validBuffer,
			"text/plain",
		);

		expect(result.success).toBe(false);
	});

	it("returns error when file exceeds 5 MB", async () => {
		const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB

		const result = await uploadAvatarHandler("user-1", largeBuffer, validType);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toContain("volumineux");
		}
	});

	it("accepts file exactly at the size limit", async () => {
		const maxBuffer = Buffer.alloc(5 * 1024 * 1024); // exactly 5 MB

		const result = await uploadAvatarHandler("user-1", maxBuffer, validType);

		expect(result.success).toBe(true);
	});
});
