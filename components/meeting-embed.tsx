"use client";

import { useEffect, useRef } from "react";

type JaasMeetingEmbedProps = {
  provider: "jaas";
  meetingId: number;
  appId: string;
  roomName: string;
  jwt?: string;
  displayName: string;
  email: string;
  title: string;
};

type JitsiMeetingEmbedProps = {
  provider: "jitsi";
  meetingId: number;
  iframeUrl: string;
  title: string;
};

type MeetingEmbedProps = JaasMeetingEmbedProps | JitsiMeetingEmbedProps;

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (
      domain: string,
      options: Record<string, unknown>,
    ) => {
      addListener?: (event: string, listener: () => void) => void;
      dispose?: () => void;
      removeListener?: (event: string, listener: () => void) => void;
    };
  }
}

const scriptPromises = new Map<string, Promise<void>>();

function loadJaasScript(appId: string) {
  const existingPromise = scriptPromises.get(appId);
  if (existingPromise) {
    return existingPromise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    if (typeof window !== "undefined" && window.JitsiMeetExternalAPI) {
      resolve();
      return;
    }

    const scriptId = `jaas-external-api-${appId}`;
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Could not load the JaaS meeting SDK.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://8x8.vc/${appId}/external_api.js`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the JaaS meeting SDK."));
    document.head.appendChild(script);
  });

  scriptPromises.set(appId, promise);
  return promise;
}

async function sendAttendanceEvent(meetingId: number, action: "join" | "leave", keepalive = false) {
  const response = await fetch(`/api/meetings/${meetingId}/attendance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action }),
    keepalive,
  });

  if (!response.ok) {
    let message = `Attendance request failed with status ${response.status}.`;

    try {
      const payload = (await response.json()) as { error?: unknown };
      if (typeof payload.error === "string" && payload.error.trim()) {
        message = payload.error.trim();
      }
    } catch {
      // Keep the generic fallback when the response is not JSON.
    }

    throw new Error(message);
  }
}

function sendAttendanceBeacon(meetingId: number, action: "join" | "leave") {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
    return false;
  }

  return navigator.sendBeacon(
    `/api/meetings/${meetingId}/attendance`,
    new Blob([JSON.stringify({ action })], { type: "application/json" }),
  );
}

export function MeetingEmbed(props: MeetingEmbedProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let conferenceState: "idle" | "joined" | "left" = "idle";

    const reportAttendance = async (action: "join" | "leave", options?: { preferBeacon?: boolean }) => {
      if (action === "join") {
        if (conferenceState === "joined") {
          return;
        }

        conferenceState = "joined";

        try {
          await sendAttendanceEvent(props.meetingId, action);
        } catch (error) {
          conferenceState = "idle";
          console.error("Could not save meeting time-in.", error);
        }

        return;
      }

      if (conferenceState !== "joined") {
        return;
      }

      conferenceState = "left";

      try {
        const sentByBeacon = options?.preferBeacon ? sendAttendanceBeacon(props.meetingId, action) : false;
        if (!sentByBeacon) {
          await sendAttendanceEvent(props.meetingId, action, true);
        }
      } catch (error) {
        conferenceState = "joined";
        console.error("Could not save meeting time-out.", error);
      }
    };

    const handlePageExit = () => {
      void reportAttendance("leave", { preferBeacon: true });
    };

    window.addEventListener("pagehide", handlePageExit);
    window.addEventListener("beforeunload", handlePageExit);

    // Treat opening the TTCS meeting room as the join point so attendance
    // still records even if the embedded SDK does not emit a join event.
    void reportAttendance("join");

    if (props.provider === "jitsi") {
      return () => {
        window.removeEventListener("pagehide", handlePageExit);
        window.removeEventListener("beforeunload", handlePageExit);
        void reportAttendance("leave", { preferBeacon: true });
      };
    }

    if (props.provider !== "jaas" || !mountRef.current) {
      return () => {
        window.removeEventListener("pagehide", handlePageExit);
        window.removeEventListener("beforeunload", handlePageExit);
      };
    }

    let isDisposed = false;
    let apiInstance: {
      addListener?: (event: string, listener: () => void) => void;
      dispose?: () => void;
      removeListener?: (event: string, listener: () => void) => void;
    } | null = null;
    const mountNode = mountRef.current;
    const handleConferenceJoined = () => {
      void reportAttendance("join");
    };
    const handleConferenceLeft = () => {
      void reportAttendance("leave");
    };

    const initialize = async () => {
      await loadJaasScript(props.appId);

      if (isDisposed || !mountNode || !window.JitsiMeetExternalAPI) {
        return;
      }

      mountNode.innerHTML = "";
      const options: Record<string, unknown> = {
        roomName: props.roomName,
        parentNode: mountNode,
        width: "100%",
        height: "100%",
        userInfo: {
          displayName: props.displayName,
          email: props.email,
        },
        configOverwrite: {
          prejoinPageEnabled: false,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
        },
      };

      if (props.jwt) {
        options.jwt = props.jwt;
      }

      apiInstance = new window.JitsiMeetExternalAPI("8x8.vc", options);
      apiInstance.addListener?.("videoConferenceJoined", handleConferenceJoined);
      apiInstance.addListener?.("videoConferenceLeft", handleConferenceLeft);
      apiInstance.addListener?.("readyToClose", handleConferenceLeft);
    };

    initialize().catch((error) => {
      if (!isDisposed && mountNode) {
        mountNode.innerHTML =
          `<div class="meeting-embed-error">Could not load the secure meeting room. ${error instanceof Error ? error.message : ""}</div>`;
      }
    });

    return () => {
      isDisposed = true;
      apiInstance?.removeListener?.("videoConferenceJoined", handleConferenceJoined);
      apiInstance?.removeListener?.("videoConferenceLeft", handleConferenceLeft);
      apiInstance?.removeListener?.("readyToClose", handleConferenceLeft);
      window.removeEventListener("pagehide", handlePageExit);
      window.removeEventListener("beforeunload", handlePageExit);
      void reportAttendance("leave", { preferBeacon: true });
      apiInstance?.dispose?.();
      if (mountNode) {
        mountNode.innerHTML = "";
      }
    };
  }, [props]);

  if (props.provider === "jitsi") {
    return (
      <div className="meeting-video-frame-shell">
        <iframe
          title={props.title}
          className="meeting-video-frame"
          src={props.iframeUrl}
          allow="camera; microphone; fullscreen; display-capture; autoplay"
          referrerPolicy="origin"
        />
      </div>
    );
  }

  return (
    <div className="meeting-video-frame-shell">
      <div className="meeting-video-host" ref={mountRef} aria-label={props.title} />
    </div>
  );
}
