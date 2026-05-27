import { Haptics, NotificationType } from "@capacitor/haptics";

// Fire a "success" haptic on a correct answer. On iOS (Capacitor) this is the
// classic three-tap success pattern; on the web it's a no-op (or a short
// vibration where the browser supports it). Errors are swallowed — the haptic
// is purely a flourish.
export function celebrate(): void {
  Haptics.notification({ type: NotificationType.Success }).catch(() => {});
}
