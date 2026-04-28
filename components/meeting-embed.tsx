"use client";

import { useEffect, useRef } from "react";

type JaasMeetingEmbedProps = {
  provider: "jaas";
  appId: string;
  roomName: string;
  jwt?: string;
  displayName: string;
  email: string;
  title: string;
};

type JitsiMeetingEmbedProps = {
  provider: "jitsi";
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
      dispose?: () => void;
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

export function MeetingEmbed(props: MeetingEmbedProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (props.provider !== "jaas" || !mountRef.current) {
      return;
    }

    let isDisposed = false;
    let apiInstance: { dispose?: () => void } | null = null;
    const mountNode = mountRef.current;

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
    };

    initialize().catch((error) => {
      if (!isDisposed && mountNode) {
        mountNode.innerHTML =
          `<div class="meeting-embed-error">Could not load the secure meeting room. ${error instanceof Error ? error.message : ""}</div>`;
      }
    });

    return () => {
      isDisposed = true;
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
