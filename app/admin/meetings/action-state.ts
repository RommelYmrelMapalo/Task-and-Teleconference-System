export type CreateMeetingState = {
  status: "idle" | "success" | "error";
  message: string | null;
};

export const initialCreateMeetingState: CreateMeetingState = {
  status: "idle",
  message: null,
};
