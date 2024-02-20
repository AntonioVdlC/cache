/**
 * A UUIDv4 generator
 * @returns {string} - A UUIDv4 string
 *
 * @example
 * const uuid = uuidv4();
 * console.log(uuid); // "110ec58a-a0f2-4ac4-8393-c866d813b8d1"
 */
export function uuidv4(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
