import type { ReactNode } from "react";

/**
 * The icons of the design system: Lucide (MIT), on the 24px grid, drawn in the text color (`.icon`
 * in shell.css sets the stroke). Every one is decorative and hidden from a screen reader: the
 * control or the text beside it carries the name, so an icon-only button needs its own `aria-label`.
 *
 * Written by `node scripts/icons.ts` from `@iconify-json/lucide`; edit the list there, not here.
 * Path data sits in constants so that the hard-coded text check, which reads string attributes in
 * JSX, keeps looking only at what a person can read.
 */
function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

const HOME_1_D = "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8";
const HOME_2_D = "M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z";
const USERS_1_D = "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.128a4 4 0 0 1 0 7.744M22 21v-2a4 4 0 0 0-3-3.87";
const USER_1_D = "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2";
const PLUS_1_FILL = "none";
const PLUS_1_STROKE = "currentColor";
const PLUS_1_STROKE_LINECAP = "round";
const PLUS_1_STROKE_LINEJOIN = "round";
const PLUS_1_D = "M5 12h14m-7-7v14";
const BOX_1_D = "M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73zm1 .27V12";
const BOX_2_D = "M3.29 7L12 12l8.71-5M7.5 4.27l9 5.15";
const BELL_1_FILL = "none";
const BELL_1_STROKE = "currentColor";
const BELL_1_STROKE_LINECAP = "round";
const BELL_1_STROKE_LINEJOIN = "round";
const BELL_1_D = "M10.268 21a2 2 0 0 0 3.464 0m-10.47-5.674A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326";
const CHART_1_FILL = "none";
const CHART_1_STROKE = "currentColor";
const CHART_1_STROKE_LINECAP = "round";
const CHART_1_STROKE_LINEJOIN = "round";
const CHART_1_D = "M3 3v16a2 2 0 0 0 2 2h16m-3-4V9m-5 8V5M8 17v-3";
const MESSAGE_1_FILL = "none";
const MESSAGE_1_STROKE = "currentColor";
const MESSAGE_1_STROKE_LINECAP = "round";
const MESSAGE_1_STROKE_LINEJOIN = "round";
const MESSAGE_1_D = "M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092a10 10 0 1 0-4.777-4.719";
const DOWNLOAD_1_D = "M12 15V3m9 12v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4";
const DOWNLOAD_2_D = "m7 10l5 5l5-5";
const LIST_1_FILL = "none";
const LIST_1_STROKE = "currentColor";
const LIST_1_STROKE_LINECAP = "round";
const LIST_1_STROKE_LINEJOIN = "round";
const LIST_1_D = "M3 5h.01M3 12h.01M3 19h.01M8 5h13M8 12h13M8 19h13";
const CARD_2_D = "M2 10h20M6 14h2";
const SLIDERS_1_FILL = "none";
const SLIDERS_1_STROKE = "currentColor";
const SLIDERS_1_STROKE_LINECAP = "round";
const SLIDERS_1_STROKE_LINEJOIN = "round";
const SLIDERS_1_D = "M10 5H3m9 14H3M14 3v4m2 10v4m5-9h-9m9 7h-5m5-14h-7m-6 5v4m0-2H3";
const ALERT_1_FILL = "none";
const ALERT_1_STROKE = "currentColor";
const ALERT_1_STROKE_LINECAP = "round";
const ALERT_1_STROKE_LINEJOIN = "round";
const ALERT_1_D = "m21.73 18l-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4m0 4h.01";
const CLOCK_2_D = "M12 6v6l4 2";
const CHECK_1_FILL = "none";
const CHECK_1_STROKE = "currentColor";
const CHECK_1_STROKE_LINECAP = "round";
const CHECK_1_STROKE_LINEJOIN = "round";
const CHECK_1_D = "M20 6L9 17l-5-5";
const SEARCH_1_D = "m21 21l-4.34-4.34";
const SUN_2_D = "M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41";
const MOON_1_FILL = "none";
const MOON_1_STROKE = "currentColor";
const MOON_1_STROKE_LINECAP = "round";
const MOON_1_STROKE_LINEJOIN = "round";
const MOON_1_D = "M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401";
const MONITOR_2_D = "M8 21h8m-4-4v4";

export function HomeIcon() {
  return (
    <Icon>
      <path d={HOME_1_D} />
      <path d={HOME_2_D} />
    </Icon>
  );
}
export function UsersIcon() {
  return (
    <Icon>
      <path d={USERS_1_D} />
      <circle cx="9" cy="7" r="4" />
    </Icon>
  );
}
export function UserIcon() {
  return (
    <Icon>
      <path d={USER_1_D} />
      <circle cx="12" cy="7" r="4" />
    </Icon>
  );
}
export function PlusIcon() {
  return (
    <Icon>
      <path fill={PLUS_1_FILL} stroke={PLUS_1_STROKE} strokeLinecap={PLUS_1_STROKE_LINECAP} strokeLinejoin={PLUS_1_STROKE_LINEJOIN} strokeWidth="2" d={PLUS_1_D} />
    </Icon>
  );
}
export function BoxIcon() {
  return (
    <Icon>
      <path d={BOX_1_D} />
      <path d={BOX_2_D} />
    </Icon>
  );
}
export function BellIcon() {
  return (
    <Icon>
      <path fill={BELL_1_FILL} stroke={BELL_1_STROKE} strokeLinecap={BELL_1_STROKE_LINECAP} strokeLinejoin={BELL_1_STROKE_LINEJOIN} strokeWidth="2" d={BELL_1_D} />
    </Icon>
  );
}
export function ChartIcon() {
  return (
    <Icon>
      <path fill={CHART_1_FILL} stroke={CHART_1_STROKE} strokeLinecap={CHART_1_STROKE_LINECAP} strokeLinejoin={CHART_1_STROKE_LINEJOIN} strokeWidth="2" d={CHART_1_D} />
    </Icon>
  );
}
export function MessageIcon() {
  return (
    <Icon>
      <path fill={MESSAGE_1_FILL} stroke={MESSAGE_1_STROKE} strokeLinecap={MESSAGE_1_STROKE_LINECAP} strokeLinejoin={MESSAGE_1_STROKE_LINEJOIN} strokeWidth="2" d={MESSAGE_1_D} />
    </Icon>
  );
}
export function DownloadIcon() {
  return (
    <Icon>
      <path d={DOWNLOAD_1_D} />
      <path d={DOWNLOAD_2_D} />
    </Icon>
  );
}
export function ListIcon() {
  return (
    <Icon>
      <path fill={LIST_1_FILL} stroke={LIST_1_STROKE} strokeLinecap={LIST_1_STROKE_LINECAP} strokeLinejoin={LIST_1_STROKE_LINEJOIN} strokeWidth="2" d={LIST_1_D} />
    </Icon>
  );
}
export function CardIcon() {
  return (
    <Icon>
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <path d={CARD_2_D} />
    </Icon>
  );
}
export function SlidersIcon() {
  return (
    <Icon>
      <path fill={SLIDERS_1_FILL} stroke={SLIDERS_1_STROKE} strokeLinecap={SLIDERS_1_STROKE_LINECAP} strokeLinejoin={SLIDERS_1_STROKE_LINEJOIN} strokeWidth="2" d={SLIDERS_1_D} />
    </Icon>
  );
}
export function MoreIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </Icon>
  );
}
export function AlertIcon() {
  return (
    <Icon>
      <path fill={ALERT_1_FILL} stroke={ALERT_1_STROKE} strokeLinecap={ALERT_1_STROKE_LINECAP} strokeLinejoin={ALERT_1_STROKE_LINEJOIN} strokeWidth="2" d={ALERT_1_D} />
    </Icon>
  );
}
export function ClockIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <path d={CLOCK_2_D} />
    </Icon>
  );
}
export function CheckIcon() {
  return (
    <Icon>
      <path fill={CHECK_1_FILL} stroke={CHECK_1_STROKE} strokeLinecap={CHECK_1_STROKE_LINECAP} strokeLinejoin={CHECK_1_STROKE_LINEJOIN} strokeWidth="2" d={CHECK_1_D} />
    </Icon>
  );
}
export function SearchIcon() {
  return (
    <Icon>
      <path d={SEARCH_1_D} />
      <circle cx="11" cy="11" r="8" />
    </Icon>
  );
}
export function SunIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="4" />
      <path d={SUN_2_D} />
    </Icon>
  );
}
export function MoonIcon() {
  return (
    <Icon>
      <path fill={MOON_1_FILL} stroke={MOON_1_STROKE} strokeLinecap={MOON_1_STROKE_LINECAP} strokeLinejoin={MOON_1_STROKE_LINEJOIN} strokeWidth="2" d={MOON_1_D} />
    </Icon>
  );
}
export function MonitorIcon() {
  return (
    <Icon>
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <path d={MONITOR_2_D} />
    </Icon>
  );
}

type IconComponent = () => ReactNode;

/**
 * The icon of each navigation item, by the item's id, for the three entry points. Kept here and not
 * in the navigation models, which stay lists of ids, paths and labels.
 */
const NAV_ICONS: Readonly<Record<string, IconComponent | undefined>> = {
  overview: HomeIcon,
  customers: UsersIcon,
  newEntry: PlusIcon,
  catalog: BoxIcon,
  stock: BoxIcon,
  stockDocuments: ListIcon,
  suppliers: UsersIcon,
  network: UsersIcon,
  reminders: BellIcon,
  reports: ChartIcon,
  disputes: MessageIcon,
  importExport: DownloadIcon,
  staff: UserIcon,
  activityLog: ListIcon,
  subscription: CardIcon,
  shopSettings: SlidersIcon,
  more: MoreIcon,
  mine: CardIcon,
  adminShops: HomeIcon,
  adminReceipts: CardIcon,
  adminSettings: SlidersIcon,
  adminSupportAccess: MessageIcon,
  adminAudit: ListIcon,
};

/** An item added later without an icon of its own still gets one: no link is ever a bare word in the bar. */
export function NavIcon({ id }: { id: string }) {
  const Found = NAV_ICONS[id] ?? ListIcon;
  return <Found />;
}
