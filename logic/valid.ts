export function isValidKeyField(v: string) {
  return typeof isValidField(v) && !v.includes(":")
}

export function isValidField(v: string) {
  return typeof v === "string" && v.trim().length > 0
}
