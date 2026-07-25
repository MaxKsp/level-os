import { useEffect } from "react";
import {
  NATIVE_PREFERENCE_EVENT,
  isNativeApp,
  nativePushEnabled,
  type NativePreferenceEventDetail,
} from "./device";
export function NativePushBridge() {
  useEffect(() => {
    if (!isNativeApp()) return;
    if (nativePushEnabled()) {
      void import("./push").then(({ enableNativePush }) => enableNativePush()).catch(() => undefined);
    }

    const onPreference = (event: Event) => {
      const detail = (event as CustomEvent<NativePreferenceEventDetail>).detail;
      if (detail?.preference !== "push") return;
      void import("./push").then(({ disableNativePush, enableNativePush }) =>
        detail.enabled ? enableNativePush() : disableNativePush(),
      ).catch(() => undefined);
    };
    window.addEventListener(NATIVE_PREFERENCE_EVENT, onPreference);
    return () => {
      window.removeEventListener(NATIVE_PREFERENCE_EVENT, onPreference);
      void import("./push").then(({ disposeNativePush }) => disposeNativePush());
    };
  }, []);

  return null;
}
