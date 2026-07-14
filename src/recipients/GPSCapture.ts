export type GPSResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; reason: "permission_denied" | "unavailable" | "timeout" | "not_supported" };

export function captureGPS(): Promise<GPSResult> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ok: false, reason: "not_supported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({ ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        // err.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
        const reason =
          err.code === 1 ? "permission_denied" : err.code === 3 ? "timeout" : "unavailable";
        resolve({ ok: false, reason });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}
