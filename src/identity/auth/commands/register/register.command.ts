/** Commande CQRS : création de compte email/password */
export type RegisterCommand = {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	pseudo: string;
};
