type BodyStyleSnapshot = {
  overflow: string;
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
};

type ScrollPositionSnapshot = {
  x: number;
  y: number;
};

let lockCount = 0;
let bodyStyleSnapshot: BodyStyleSnapshot | null = null;
let scrollPositionSnapshot: ScrollPositionSnapshot | null = null;

function hasDomContext(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function getBodyScrollLockCount(): number {
  return lockCount;
}

export function lockBodyScroll(): void {
  if (!hasDomContext()) return;

  if (lockCount === 0) {
    const { style } = document.body;
    bodyStyleSnapshot = {
      overflow: style.overflow,
      position: style.position,
      top: style.top,
      left: style.left,
      right: style.right,
      width: style.width,
    };
    scrollPositionSnapshot = {
      x: window.scrollX,
      y: window.scrollY,
    };

    style.overflow = "hidden";
    style.position = "fixed";
    style.top = `-${scrollPositionSnapshot.y}px`;
    style.left = "0";
    style.right = "0";
    style.width = "100%";
  }

  lockCount += 1;
}

export function unlockBodyScroll(): void {
  if (!hasDomContext()) return;
  if (lockCount === 0) return;

  lockCount -= 1;
  if (lockCount !== 0) return;
  if (!bodyStyleSnapshot) return;

  const { style } = document.body;
  style.overflow = bodyStyleSnapshot.overflow;
  style.position = bodyStyleSnapshot.position;
  style.top = bodyStyleSnapshot.top;
  style.left = bodyStyleSnapshot.left;
  style.right = bodyStyleSnapshot.right;
  style.width = bodyStyleSnapshot.width;

  if (scrollPositionSnapshot) {
    window.scrollTo(scrollPositionSnapshot.x, scrollPositionSnapshot.y);
  }

  bodyStyleSnapshot = null;
  scrollPositionSnapshot = null;
}

export function resetBodyScrollLockStateForTests(): void {
  lockCount = 0;
  bodyStyleSnapshot = null;
  scrollPositionSnapshot = null;
}
