// Single source of truth for matching a free-typed exercise/activity name
// across sessions (PR lookups, history autocomplete, achievement variety),
// imported by both the Vite client and the Deno edge function.
export function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}
