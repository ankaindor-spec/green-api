export function instanceStateKey(idInstance: string) {
  return ["instance", idInstance, "state"] as const;
}

export function instanceSettingsKey(idInstance: string) {
  return ["instance", idInstance, "settings"] as const;
}
