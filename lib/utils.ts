/** Returns the number of days until the next occurrence of a birthday (YYYY-MM-DD).
 *  Returns 0 on the birthday itself, null if the string is invalid.
 *  Uses Math.ceil so "0 days" only shows on the actual birthday day.
 */
export function getDaysUntilBirthday(birthday: string): number | null {
  const parts = birthday.split("-");
  if (parts.length !== 3) return null;
  const month = parseInt(parts[1]) - 1;
  const day = parseInt(parts[2]);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), month, day);
  if (next.getTime() <= today.getTime()) {
    next = new Date(today.getFullYear() + 1, month, day);
  }
  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
