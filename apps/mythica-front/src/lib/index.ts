// place files you want to import through the `$lib` alias in this folder.

export { ApiClient } from "./api/api-client";
export { GameplayApiClient, gameplayApi } from "./api/api-client-gameplay";

// API Services
export {
	// Auth
	AuthService,
	authService,
	// Campaign
	CampaignService,
	type ChangeEmailData,
	type ChangePasswordData,
	// Character
	type CharacterPropertyType,
	type CharacterSheetDetail,
	type CharacterSheetField,
	type CharacterSheetListItem,
	type CharacterSheetValueUpdate,
	CharacterService,
	characterService,
	type CreateCampaignData,
	type CreateCharacterSheetData,
	type CreateGameSystemData,
	campaignService,
	// Game System
	GameSystemService,
	gameSystemService,
	type ListCharacterSheetsParams,
	type Login2faData,
	type LoginData,
	type OAuthProvider,
	type PaginationParams,
	type RegisterData,
	type ScheduleSessionData,
	type UpdateCampaignData,
	type UpdateGameSystemData,
	type UpdateSessionData,
	// User
	UserService,
	userService,
} from "./api/services";

// API types and utilities
export {
	ApiError,
	type ApiErrorResponse,
	type ApiResponse,
	type ApiSuccessResponse,
	isError,
	isSuccess,
	type LoginResponse,
	type PaginatedResponse,
	requiresTwoFactor,
	type User,
} from "./api/types";
