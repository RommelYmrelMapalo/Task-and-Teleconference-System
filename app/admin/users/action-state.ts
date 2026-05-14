export type CreateManagedUserState = {
  status: "idle" | "success" | "error";
  message: string | null;
  temporaryPassword: string | null;
};

export const initialCreateManagedUserState: CreateManagedUserState = {
  status: "idle",
  message: null,
  temporaryPassword: null,
};
