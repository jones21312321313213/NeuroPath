/**
 * Session Lifecycle & Inactivity Constants
 * In compliance with FERPA & RA 10173 (Data Privacy Act of 2012)
 */

// 30 minutes in milliseconds
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

// 60 seconds warning countdown before session termination
export const WARNING_DURATION_MS = 60 * 1000;

// 29 minutes threshold when the warning modal must appear
export const WARNING_THRESHOLD_MS = INACTIVITY_TIMEOUT_MS - WARNING_DURATION_MS;

// User event listener throttle threshold to prevent performance degradation
export const ACTIVITY_THROTTLE_MS = 1000;

// Heartbeat check interval (1 second)
export const HEARTBEAT_INTERVAL_MS = 1000;

// LocalStorage & SessionStorage keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "neuropath_access_token",
  USER: "neuropath_user",
  LAST_ACTIVE: "neuropath_last_active",
  SESSION_NOTICE: "neuropath_session_notice",
  LOGOUT_EVENT: "neuropath_logout_event",
};

// Broadcast Channel name for cross-tab communication
export const SESSION_CHANNEL_NAME = "neuropath_session_channel";

// Broadcast message action identifiers
export const BROADCAST_ACTIONS = {
  ACTIVITY: "ACTIVITY",
  LOGOUT: "LOGOUT",
  EXTEND: "EXTEND",
};

// Monitored user interaction events
export const MONITORED_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
];
