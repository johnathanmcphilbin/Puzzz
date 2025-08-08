// Centralized feature flags to toggle experimental or temporary features on/off
// Keep this file small and simple so non-devs can flip switches easily.

export const FEATURES = {
  // Hide Dramamatching on the frontend while keeping backend intact
  dramamatching: false,
} as const;
