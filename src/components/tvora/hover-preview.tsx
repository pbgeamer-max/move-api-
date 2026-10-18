"use client";
// TVORA hover video preview — Netflix-style dwell preview layered over TitleCard.
// Contract (task 6-b):
//  - Desktop pointer devices only: gate on "(hover: hover) and (pointer: fine)".
//  - Reduced motion: never mounts (framer useReducedMotion via useMotionAllowed).
//  - Zero cost until hover: nothing mounts / no bytes load before `active` —
//    the <video> element only enters the DOM on activation (preload=metadata + play()).
//  - GPU-safe motion: opacity on the wrapper, scale on the video only.
//  - Demo honesty: a tiny champagne "Preview" chip stays visible while it plays.
//  - One video element per card, ever; paused + rewound on deactivation.
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { makeT } from "@/lib/i18n";
import { useAppStore } from "@/lib/store";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { useMotionAllowed } from "./motion-fx";

// Film footage for ALL title previews — sports footage is reserved for
// play under series posters.
const DEMO_SRC = "/media/demo-film.mp4";

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";
const PREVIEW_FADE_S = 0.45; // matches the TVORA reveal language (EASE_OUT_EXPO)

export function HoverPreview({ active }: { active: boolean }) {
  const lang = useAppStore((s) => s.lang);
  const t = makeT(lang);
  const motionAllowed = useMotionAllowed();

  // Desktop-pointer gate — computed once in the initializer, kept in sync with
  // media-query changes (e.g. a mouse attached/detached from a hybrid device).
  const [pointerFine, setPointerFine] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia(FINE_POINTER_QUERY).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(FINE_POINTER_QUERY);
    const onChange = () => setPointerFine(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const enabled = pointerFine && motionAllowed;
  const videoRef = useRef<HTMLVideoElement>(null);
  // "canplay" fired → swap the loading scrim for the preview chip.
  const [ready, setReady] = useState(false);

  // Playback lifecycle. On activation: play (muted autoplay + user hover intent).
  // On deactivation: pause + rewind immediately — the element is still mounted
  // during the AnimatePresence exit fade, so it must go silent/blank at once.
  useEffect(() => {
    if (!enabled) return;
    const video = videoRef.current;
    if (!video) return;
    if (active) {
      // onCanPlay (attached at element creation, before any network activity)
      // flips `ready` — no need to probe readyState here.
      video.play().catch(() => {
        // muted autoplay can still be refused in exotic browser setups — stay silent
      });
      return () => {
        video.pause();
        try {
          video.currentTime = 0;
        } catch {
          // rewinding before metadata is loaded can throw — harmless, skip it
        }
      };
    }
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // same as above — metadata may not be loaded yet
    }
  }, [active, enabled]);

  // Reset the loading chip once the element is finally gone, so a fresh mount
  // (next hover) reports loading until the new <video> reaches canplay.
  const handleExitComplete = useCallback(() => setReady(false), []);

  if (!enabled) return null;

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {active ? (
        <motion.div
          key="tvora-hover-preview"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: PREVIEW_FADE_S, ease: EASE_OUT_EXPO }}
          className="pointer-events-none absolute inset-0 z-[5]"
        >
          <motion.video
            ref={videoRef}
            src={DEMO_SRC}
            muted
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            disableRemotePlayback
            tabIndex={-1}
            initial={{ scale: 1.04 }}
            animate={{ scale: 1 }}
            transition={{ duration: PREVIEW_FADE_S, ease: EASE_OUT_EXPO }}
            onCanPlay={() => setReady(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Loading scrim — tiny shimmer chip until playback can start */}
          {!ready && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
              <span className="tv-shimmer rounded-sm border border-white/10 px-2 py-1 text-[9px] font-semibold tracking-wider text-white/70">
                {t("preview.loading")}
              </span>
            </div>
          )}
          {/* Demo-honesty chip — top END corner (logical property → RTL-safe) */}
          {ready && (
            <span
              className="absolute z-10 inline-flex items-center gap-1.5 rounded-sm border border-[#d8c9a3]/25 bg-black/60 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#d8c9a3] backdrop-blur-sm"
              style={{ insetInlineEnd: 8, top: 8 }}
              title={t("footer.demoNotice")}
            >
              <span className="h-[3px] w-[3px] animate-pulse rounded-full bg-[#d8c9a3]" aria-hidden />
              {t("preview.hint")}
            </span>
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
