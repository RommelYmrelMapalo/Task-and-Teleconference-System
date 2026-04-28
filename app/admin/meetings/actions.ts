"use server";

import { revalidatePath } from "next/cache";
import type { CreateMeetingState } from "@/app/admin/meetings/action-state";
import { buildMeetingJoinPath } from "@/lib/meeting-links";
import { requireSessionContext } from "@/lib/ttcs-data";
import { createMeetingForUser, MeetingMutationError } from "@/lib/meeting-write-service";

export async function createMeetingAction(
  _previousState: CreateMeetingState,
  formData: FormData,
): Promise<CreateMeetingState> {
  const context = await requireSessionContext({ admin: true });

  try {
    const result = await createMeetingForUser(context.profile.id, formData);

    revalidatePath("/admin");
    revalidatePath("/admin/meetings");
    revalidatePath("/admin/inbox");
    revalidatePath("/dashboard");
    revalidatePath("/assigned-meetings");
    revalidatePath("/record-timein");
    revalidatePath("/record-timeout");
    revalidatePath("/inbox");

    return {
      status: "success",
      message: `Meeting "${result.title}" created for ${result.assigneeCount} participant${result.assigneeCount === 1 ? "" : "s"}. Join link: ${buildMeetingJoinPath(result.meetingId)}`,
    };
  } catch (error) {
    if (error instanceof MeetingMutationError) {
      return {
        status: "error",
        message: error.message,
      };
    }

    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not create meeting.",
    };
  }
}
