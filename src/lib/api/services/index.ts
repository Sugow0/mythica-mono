// Auth Service
export {
	AuthService,
	authService,
	type ChangeEmailData,
	type ChangePasswordData,
	type Login2faData,
	type LoginData,
	type OAuthProvider,
	type RegisterData,
} from "./auth-service";

// Campaign Service
export {
	CampaignService,
	type CreateCampaignData,
	campaignService,
	type PaginationParams,
	type ScheduleSessionData,
	type UpdateCampaignData,
	type UpdateSessionData,
} from "./campaign-service";

// Game System Service
export {
	type CreateGameSystemData,
	GameSystemService,
	gameSystemService,
	type UpdateGameSystemData,
} from "./game-system-service";

// User Service
export { UserService, userService } from "./user-service";
