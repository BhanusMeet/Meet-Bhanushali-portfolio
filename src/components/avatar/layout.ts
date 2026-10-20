/** Width / height of the avatar artwork (its SVG viewBox is 300 x 490). */
export const RATIO = 300 / 490

/**
 * Where the scroll companion parks: bottom-right corner of the viewport. Shared by the follower
 * (which travels there) and the rope stunt (which must start from exactly the same place).
 */
export function cornerBox(vw: number, vh: number) {
  const small = vw < 768
  const h = small ? 120 : 190
  const w = h * RATIO
  return { h, w, left: vw - (small ? 8 : 24) - w, top: vh - (small ? 8 : 14) - h }
}
