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
const WALLET_1_D = "M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1";
const WALLET_2_D = "M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4";
const EYE_1_D = "M2.062 12.348a1 1 0 0 1 0-.696a10.75 10.75 0 0 1 19.876 0a1 1 0 0 1 0 .696a10.75 10.75 0 0 1-19.876 0";
const TRENDING_DOWN_1_D = "M16 17h6v-6";
const TRENDING_DOWN_2_D = "m22 17l-8.5-8.5l-5 5L2 7";
const GLOBE_2_D = "M12 2a14.5 14.5 0 0 0 0 20a14.5 14.5 0 0 0 0-20M2 12h20";
const LIGHTBULB_1_FILL = "none";
const LIGHTBULB_1_STROKE = "currentColor";
const LIGHTBULB_1_STROKE_LINECAP = "round";
const LIGHTBULB_1_STROKE_LINEJOIN = "round";
const LIGHTBULB_1_D = "M15 14c.2-1 .7-1.7 1.5-2.5c1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5c.7.7 1.3 1.5 1.5 2.5m0 4h6m-5 4h4";
const SHIELD_1_D = "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z";
const SHIELD_2_D = "m9 12l2 2l4-4";
const KEY_1_D = "M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z";
const KEY_2_FILL = "currentColor";
const SEND_1_FILL = "none";
const SEND_1_STROKE = "currentColor";
const SEND_1_STROKE_LINECAP = "round";
const SEND_1_STROKE_LINEJOIN = "round";
const SEND_1_D = "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11zm7.318-19.539l-10.94 10.939";
const DATABASE_2_D = "M3 5v14a9 3 0 0 0 18 0V5";
const DATABASE_3_D = "M3 12a9 3 0 0 0 18 0";
const LOCK_2_D = "M7 11V7a5 5 0 0 1 10 0v4";
const CLOUD_1_FILL = "none";
const CLOUD_1_STROKE = "currentColor";
const CLOUD_1_STROKE_LINECAP = "round";
const CLOUD_1_STROKE_LINEJOIN = "round";
const CLOUD_1_D = "M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9";
const CHEVRON_DOWN_1_FILL = "none";
const CHEVRON_DOWN_1_STROKE = "currentColor";
const CHEVRON_DOWN_1_STROKE_LINECAP = "round";
const CHEVRON_DOWN_1_STROKE_LINEJOIN = "round";
const CHEVRON_DOWN_1_D = "m6 9l6 6l6-6";
const ROCKET_1_D = "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09";
const ROCKET_2_D = "M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z";
const ROCKET_3_D = "M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05";
const TRENDING_UP_1_D = "M16 7h6v6";
const TRENDING_UP_2_D = "m22 7l-8.5 8.5l-5-5L2 17";
const CIRCLE_HELP_2_D = "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3m.08 4h.01";
const ARROW_RIGHT_1_FILL = "none";
const ARROW_RIGHT_1_STROKE = "currentColor";
const ARROW_RIGHT_1_STROKE_LINECAP = "round";
const ARROW_RIGHT_1_STROKE_LINEJOIN = "round";
const ARROW_RIGHT_1_D = "M5 12h14m-7-7l7 7l-7 7";
const STORE_1_D = "M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5m8.774-10.69a1.12 1.12 0 0 0-1.549 0a2.5 2.5 0 0 1-3.451 0a1.12 1.12 0 0 0-1.548 0a2.5 2.5 0 0 1-3.452 0a1.12 1.12 0 0 0-1.549 0a2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244";
const STORE_2_D = "M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05";

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
export function WalletIcon() {
  return (
    <Icon>
      <path d={WALLET_1_D} />
      <path d={WALLET_2_D} />
    </Icon>
  );
}
export function EyeIcon() {
  return (
    <Icon>
      <path d={EYE_1_D} />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}
export function TrendingDownIcon() {
  return (
    <Icon>
      <path d={TRENDING_DOWN_1_D} />
      <path d={TRENDING_DOWN_2_D} />
    </Icon>
  );
}
export function GlobeIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <path d={GLOBE_2_D} />
    </Icon>
  );
}
export function LightbulbIcon() {
  return (
    <Icon>
      <path fill={LIGHTBULB_1_FILL} stroke={LIGHTBULB_1_STROKE} strokeLinecap={LIGHTBULB_1_STROKE_LINECAP} strokeLinejoin={LIGHTBULB_1_STROKE_LINEJOIN} strokeWidth="2" d={LIGHTBULB_1_D} />
    </Icon>
  );
}
export function ShieldIcon() {
  return (
    <Icon>
      <path d={SHIELD_1_D} />
      <path d={SHIELD_2_D} />
    </Icon>
  );
}
export function KeyIcon() {
  return (
    <Icon>
      <path d={KEY_1_D} />
      <circle cx="16.5" cy="7.5" r=".5" fill={KEY_2_FILL} />
    </Icon>
  );
}
export function SendIcon() {
  return (
    <Icon>
      <path fill={SEND_1_FILL} stroke={SEND_1_STROKE} strokeLinecap={SEND_1_STROKE_LINECAP} strokeLinejoin={SEND_1_STROKE_LINEJOIN} strokeWidth="2" d={SEND_1_D} />
    </Icon>
  );
}
export function DatabaseIcon() {
  return (
    <Icon>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d={DATABASE_2_D} />
      <path d={DATABASE_3_D} />
    </Icon>
  );
}
export function LockIcon() {
  return (
    <Icon>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d={LOCK_2_D} />
    </Icon>
  );
}
export function CloudIcon() {
  return (
    <Icon>
      <path fill={CLOUD_1_FILL} stroke={CLOUD_1_STROKE} strokeLinecap={CLOUD_1_STROKE_LINECAP} strokeLinejoin={CLOUD_1_STROKE_LINEJOIN} strokeWidth="2" d={CLOUD_1_D} />
    </Icon>
  );
}
export function ChevronDownIcon() {
  return (
    <Icon>
      <path fill={CHEVRON_DOWN_1_FILL} stroke={CHEVRON_DOWN_1_STROKE} strokeLinecap={CHEVRON_DOWN_1_STROKE_LINECAP} strokeLinejoin={CHEVRON_DOWN_1_STROKE_LINEJOIN} strokeWidth="2" d={CHEVRON_DOWN_1_D} />
    </Icon>
  );
}
export function RocketIcon() {
  return (
    <Icon>
      <path d={ROCKET_1_D} />
      <path d={ROCKET_2_D} />
      <path d={ROCKET_3_D} />
    </Icon>
  );
}
export function TrendingUpIcon() {
  return (
    <Icon>
      <path d={TRENDING_UP_1_D} />
      <path d={TRENDING_UP_2_D} />
    </Icon>
  );
}
export function CircleHelpIcon() {
  return (
    <Icon>
      <circle cx="12" cy="12" r="10" />
      <path d={CIRCLE_HELP_2_D} />
    </Icon>
  );
}
export function ArrowRightIcon() {
  return (
    <Icon>
      <path fill={ARROW_RIGHT_1_FILL} stroke={ARROW_RIGHT_1_STROKE} strokeLinecap={ARROW_RIGHT_1_STROKE_LINECAP} strokeLinejoin={ARROW_RIGHT_1_STROKE_LINEJOIN} strokeWidth="2" d={ARROW_RIGHT_1_D} />
    </Icon>
  );
}
export function StoreIcon() {
  return (
    <Icon>
      <path d={STORE_1_D} />
      <path d={STORE_2_D} />
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
