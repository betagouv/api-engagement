import { type MouseEvent, type PointerEvent, type ReactNode, type RefObject, useEffect, useRef, useState } from "react";

// Hauteurs en px : replié = h-24, déplié = viewport visible moins 3rem (bande laissée en haut).
const COLLAPSED_HEIGHT = 96;
const EXPANDED_TOP_GAP = 48;
// En deçà de ce déplacement, le geste reste un tap (clic sur le titre, le lien…).
const DRAG_THRESHOLD = 6;
// Vitesse (px/ms) au-delà de laquelle un swipe rapide suffit à ouvrir/fermer, quelle que soit la position.
const FLICK_VELOCITY = 0.5;

interface BottomSheetProps {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  // Zone toujours visible, qu'on tape ou qu'on fait glisser pour ouvrir/fermer le panneau.
  header: ReactNode;
  // Barre fixe sous le contenu défilant.
  footer?: ReactNode;
  contentId: string;
  scrollRef: RefObject<HTMLDivElement | null>;
  hidden?: boolean;
  children: ReactNode;
}

// Panneau bas façon app native (mobile) : fixé au viewport, il suit le doigt quand on glisse son en-tête
// puis se cale ouvert ou fermé au relâchement.
export default function BottomSheet({ expanded, onExpandedChange, header, footer, contentId, scrollRef, hidden = false, children }: BottomSheetProps) {
  // Hauteur suivie pendant le glissement (null hors glissement : la hauteur vient alors des classes).
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ y: number; height: number; time: number } | null>(null);
  // Un glissement se termine par un clic sur l'élément sous le doigt : on l'ignore.
  const justDragged = useRef(false);

  // Le contenu repart en haut à chaque fermeture.
  useEffect(() => {
    if (!expanded && scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [expanded, scrollRef]);

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!sheetRef.current) return;
    justDragged.current = false;
    dragStart.current = { y: e.clientY, height: sheetRef.current.offsetHeight, time: e.timeStamp };
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const deltaY = e.clientY - dragStart.current.y;
    if (dragHeight === null && Math.abs(deltaY) < DRAG_THRESHOLD) return;
    if (dragHeight === null) e.currentTarget.setPointerCapture(e.pointerId);
    const maxHeight = window.innerHeight - EXPANDED_TOP_GAP;
    setDragHeight(Math.min(maxHeight, Math.max(COLLAPSED_HEIGHT, dragStart.current.height - deltaY)));
  };

  const handlePointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    dragStart.current = null;
    if (!start || dragHeight === null) return;

    const velocity = (e.clientY - start.y) / Math.max(1, e.timeStamp - start.time);
    const middleHeight = (COLLAPSED_HEIGHT + window.innerHeight - EXPANDED_TOP_GAP) / 2;
    const shouldExpand = Math.abs(velocity) > FLICK_VELOCITY ? velocity < 0 : dragHeight > middleHeight;

    justDragged.current = true;
    setDragHeight(null);
    onExpandedChange(shouldExpand);
  };

  const handleHeaderClick = (e: MouseEvent<HTMLDivElement>) => {
    if (justDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onExpandedChange(!expanded);
  };

  const isDragging = dragHeight !== null;

  return (
    <div
      ref={sheetRef}
      className={`fixed inset-x-0 bottom-0 z-1000 flex flex-col rounded-t-3xl bg-background shadow-2xl ${isDragging ? "" : "transition-[height] duration-300"} ${expanded ? "h-[calc(100dvh-3rem)]" : "h-24"} ${hidden ? "hidden" : ""}`}
      style={isDragging ? { height: dragHeight } : undefined}
    >
      {}
      <div
        className={`relative flex touch-none flex-col items-center! justify-center! gap-2 p-6 ${expanded ? "" : "h-full"}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={handleHeaderClick}
      >
        <span className="absolute top-2 left-1/2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-border-default-grey" aria-hidden="true" />
        {header}
      </div>

      <div ref={scrollRef} id={contentId} className={`flex-1 overflow-y-auto overscroll-contain ${expanded || isDragging ? "" : "hidden"}`}>
        {children}
      </div>

      {footer}
    </div>
  );
}
