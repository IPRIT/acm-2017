export function escapeString(text) {
  return text.replace(/([_*\]\[)(~`>#+-=|{}.!])/gi, '\\$1');
}