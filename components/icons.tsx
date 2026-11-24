import type { WorkoutType } from "@/lib/types";

type P = { size?: number; className?: string };

function Svg({ size = 20, className, children, sw = 2 }: P & { children: React.ReactNode; sw?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}

export const IPlus = (p: P) => <Svg {...p} sw={2.4}><path d="M12 5v14M5 12h14" /></Svg>;
export const IChevL = (p: P) => <Svg {...p}><path d="m15 18-6-6 6-6" /></Svg>;
export const IChevR = (p: P) => <Svg {...p}><path d="m9 18 6-6-6-6" /></Svg>;
export const IX = (p: P) => <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>;
export const ICheck = (p: P) => <Svg {...p} sw={2.4}><path d="M20 6 9 17l-5-5" /></Svg>;
export const ITrash = (p: P) => <Svg {...p}><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6" /></Svg>;
export const ISearch = (p: P) => <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>;
export const IScan = (p: P) => (
  <Svg {...p}>
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
    <path d="M7 8v8M10.5 8v8M14 8v8M17 8v8" />
  </Svg>
);
export const IHome = (p: P) => <Svg {...p}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Svg>;
export const IChart = (p: P) => <Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>;
export const ISettings = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </Svg>
);
export const IFlame = (p: P) => <Svg {...p}><path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-9-1 2-2 3-3.5 3.5C11 7 10.5 4 9 2c0 4-4 6.5-4 12 0 4.5 3 8 7 8Z" /></Svg>;
export const IFoot = (p: P) => (
  <Svg {...p}>
    <path d="M4 16v-2.4C4 11.5 3 10.5 3 8c0-2.7 1.5-6 4.5-6C9.4 2 10 3.8 10 5.5c0 3.1-2 5.7-2 8.7V16a2 2 0 1 1-4 0Z" />
    <path d="M20 20v-2.4c0-2.1 1-3.1 1-5.6 0-2.7-1.5-6-4.5-6C14.6 6 14 7.8 14 9.5c0 3.1 2 5.7 2 8.7V20a2 2 0 1 0 4 0Z" />
  </Svg>
);
export const IFlash = (p: P) => <Svg {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></Svg>;
export const IKeyboard = (p: P) => <Svg {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M9 13h6" /></Svg>;
export const IClock = (p: P) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
export const IRefresh = (p: P) => <Svg {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" /></Svg>;
export const ICopy = (p: P) => <Svg {...p}><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" /></Svg>;
export const IScale = (p: P) => <Svg {...p}><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 9a5 5 0 0 1 8 0l-3 3" /></Svg>;
export const IHeart = (p: P) => <Svg {...p}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8Z" /></Svg>;
export const IBook = (p: P) => <Svg {...p}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14Z" /><path d="M20 17v4H6.5a2.5 2.5 0 0 1 0-4" /></Svg>;
export const IEdit = (p: P) => <Svg {...p}><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Svg>;

const WORKOUT: Record<WorkoutType, React.ReactNode> = {
  bici: (
    <>
      <circle cx="5.5" cy="17" r="3.5" />
      <circle cx="18.5" cy="17" r="3.5" />
      <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM12 17.5V14l-3-3 4-3 2 3h3" />
    </>
  ),
  boxeo: (
    <>
      <path d="M7 11V7a4 4 0 0 1 4-4h3a5 5 0 0 1 5 5v4a6 6 0 0 1-6 6h-2a4 4 0 0 1-4-4" />
      <path d="M7 11h4a2 2 0 0 1 0 4H7a3 3 0 0 1 0-4ZM9 18v3h7v-3" />
    </>
  ),
  correr: (
    <>
      <circle cx="14" cy="4" r="2" />
      <path d="m6 21 3-6 3 2v5M8 10l3-3 4 2 2 3h3M11 7l-1 6 4 2" />
    </>
  ),
  natacion: (
    <>
      <path d="M2 18c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0 3-1 4.5 0M2 13.5c1.5 1 3 1 4.5 0s3-1 4.5 0 3 1 4.5 0" />
      <circle cx="17" cy="6" r="2" />
      <path d="m6 11 4-4 3 2.5" />
    </>
  ),
  gimnasio: <path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11" />,
  caminar: (
    <>
      <circle cx="13" cy="4" r="2" />
      <path d="m9 21 2.5-6.5L14 17v4M10 9l3-2 2 3.5 3 1.5M11.5 14.5 10 9l-3 3" />
    </>
  ),
  hiit: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  otro: <path d="M3 12h4l3-8 4 16 3-8h4" />,
};

export function IWorkout({ type, size = 20 }: { type: WorkoutType; size?: number }) {
  return <Svg size={size}>{WORKOUT[type]}</Svg>;
}

export function Logo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 13h4l2.5-6 4 11 2.5-5H21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
