"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { CreateMeetingState } from "@/app/admin/meetings/action-state";
import { buildMeetingJoinPath } from "@/lib/meeting-links";
import { requireSessionContext } from "@/lib/ttcs-data";
import { createMeetingForUser, endMeetingForUser, MeetingMutationError } from "@/lib/meeting-write-service";

export async function createMeetingAction(
  _previousState: CreateMeetingState,
  formData: FormData,
): Promise<CreateMeetingState> {
  const context = await requireSessionContext();

  try {
    const result = await createMeetingForUser(context.profile.id, formData);

    revalidatePath("/admin");
    revalidatePath("/admin/meetings");
    revalidatePath("/admin/record-timein");
    revalidatePath("/admin/record-timeout");
    revalidatePath("/admin/inbox");
    revalidatePath("/dashboard");
    revalidatePath("/meetings");
    revalidatePath("/assigned-meetings");
    revalidatePath("/record-timein");
    revalidatePath("/record-timeout");
    revalidatePath("/inbox");

    return {
      status: "success",
      message: `Meeting "${result.title}" created for ${result.assigneeCount} participant${result.assigneeCount === 1 ? "" : "s"}.`,
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

export async function endMeetingAction(formData: FormData) {
  const context = await requireSessionContext();
  const meetingId = Number(formData.get("meetingId"));
  const redirectToValue = formData.get("redirectTo");
  const redirectTo = typeof redirectToValue === "string" && redirectToValue.trim() ? redirectToValue.trim() : "/admin/meetings";

  if (!Number.isInteger(meetingId) || meetingId <= 0) {
    redirect(redirectTo);
  }

  try {
    const result = await endMeetingForUser(context.profile.id, meetingId);

    revalidatePath("/admin");
    revalidatePath("/admin/meetings");
    revalidatePath("/admin/record-timein");
    revalidatePath("/admin/record-timeout");
    revalidatePath("/admin/inbox");
    revalidatePath("/dashboard");
    revalidatePath("/meetings");
    revalidatePath("/assigned-meetings");
    revalidatePath("/record-timein");
    revalidatePath("/record-timeout");
    revalidatePath("/inbox");
    revalidatePath(buildMeetingJoinPath(result.meetingId));
  } catch (error) {
    if (!(error instanceof MeetingMutationError)) {
      throw error;
    }
  }

  redirect(redirectTo);
}
