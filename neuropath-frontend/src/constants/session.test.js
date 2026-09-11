import { describe, it, expect } from "vitest";
import {
  INACTIVITY_TIMEOUT_MS,
  WARNING_DURATION_MS,
  WARNING_THRESHOLD_MS,
  ACTIVITY_THROTTLE_MS,
  STORAGE_KEYS,
  BROADCAST_ACTIONS,
  SESSION_CHANNEL_NAME,
} from "./session";

describe("session constants", () => {
  it("defines correct 30-minute timeout and 60-second warning intervals", () => {
    expect(INACTIVITY_TIMEOUT_MS).toBe(30 * 60 * 1000); // 1,800,000 ms
    expect(WARNING_DURATION_MS).toBe(60 * 1000); // 60,000 ms
    expect(WARNING_THRESHOLD_MS).toBe(29 * 60 * 1000); // 1,740,000 ms
    expect(ACTIVITY_THROTTLE_MS).toBe(1000); // 1,000 ms
  });

  it("defines standard storage keys and broadcast channels", () => {
    expect(STORAGE_KEYS.LAST_ACTIVE).toBe("neuropath_last_active");
    expect(STORAGE_KEYS.SESSION_NOTICE).toBe("neuropath_session_notice");
    expect(STORAGE_KEYS.LOGOUT_EVENT).toBe("neuropath_logout_event");
    expect(SESSION_CHANNEL_NAME).toBe("neuropath_session_channel");
    expect(BROADCAST_ACTIONS.ACTIVITY).toBe("ACTIVITY");
    expect(BROADCAST_ACTIONS.LOGOUT).toBe("LOGOUT");
    expect(BROADCAST_ACTIONS.EXTEND).toBe("EXTEND");
  });
});
