/**
 * Writes `src/shared/icons.tsx`: the application's icons, taken from Lucide (MIT).
 *
 * The set is fixed here rather than resolved at run time: an icon that is not in this file is not in
 * the bundle, and the artwork cannot differ between the Mini App, the panel and the admin. Adding an
 * icon is a line in `ICONS` and a run of this script.
 *
 * The file it writes keeps the house rules: path data sits in constants, because the hard-coded text
 * check reads string attributes in JSX, and a shape's geometry is not interface text.
 *
 * Run: node scripts/icons.ts          writes the file
 *      node scripts/icons.ts --check  fails when the file is not what this script writes
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TARGET = resolve(import.meta.dirname, "../src/shared/icons.tsx");
const SOURCE = resolve(import.meta.dirname, "../node_modules/@iconify-json/lucide/icons.json");

/** The component's name, and the Lucide icon whose drawing it carries. */
const ICONS: [string, string][] = [
  ["HomeIcon", "house"],
  ["UsersIcon", "users"],
  ["UserIcon", "user"],
  ["PlusIcon", "plus"],
  ["BoxIcon", "package"],
  ["BellIcon", "bell"],
  ["ChartIcon", "chart-column"],
  ["MessageIcon", "message-circle"],
  ["DownloadIcon", "download"],
  ["ListIcon", "list"],
  ["CardIcon", "credit-card"],
  ["SlidersIcon", "sliders-horizontal"],
  ["MoreIcon", "ellipsis"],
  ["AlertIcon", "triangle-alert"],
  ["ClockIcon", "clock"],
  ["CheckIcon", "check"],
  ["SearchIcon", "search"],
  ["SunIcon", "sun"],
  ["MoonIcon", "moon"],
  ["MonitorIcon", "monitor"],
  // The landing page's own needs: what each feature, benefit and trust point is about.
  ["WalletIcon", "wallet"],
  ["EyeIcon", "eye"],
  ["TrendingDownIcon", "trending-down"],
  ["GlobeIcon", "globe"],
  ["LightbulbIcon", "lightbulb"],
  ["ShieldIcon", "shield-check"],
  ["KeyIcon", "key-round"],
  ["SendIcon", "send"],
  ["DatabaseIcon", "database"],
  ["LockIcon", "lock"],
  ["CloudIcon", "cloud"],
  ["ChevronDownIcon", "chevron-down"],
  // The landing's navigation, its section labels, its steps and its buttons.
  ["RocketIcon", "rocket"],
  ["TrendingUpIcon", "trending-up"],
  ["CircleHelpIcon", "circle-help"],
  ["ArrowRightIcon", "arrow-right"],
  ["StoreIcon", "store"],
];

type Definition = { body?: string; parent?: string };
type Pack = { icons: Record<string, Definition>; aliases: Record<string, string | Definition>; width?: number; height?: number };

/**
 * The icon of each navigation item, by the item's id, for the three entry points. Kept here and not
 * in the navigation models, which stay lists of ids, paths and labels.
 */
const NAV_ICONS: Readonly<Record<string, string>> = {
  overview: "HomeIcon",
  customers: "UsersIcon",
  newEntry: "PlusIcon",
  catalog: "BoxIcon",
  stock: "BoxIcon",
  stockDocuments: "ListIcon",
  suppliers: "UsersIcon",
  network: "UsersIcon",
  reminders: "BellIcon",
  reports: "ChartIcon",
  disputes: "MessageIcon",
  importExport: "DownloadIcon",
  staff: "UserIcon",
  activityLog: "ListIcon",
  subscription: "CardIcon",
  shopSettings: "SlidersIcon",
  more: "MoreIcon",
  mine: "CardIcon",
  adminShops: "HomeIcon",
  adminReceipts: "CardIcon",
  adminSettings: "SlidersIcon",
  adminSupportAccess: "MessageIcon",
  adminAudit: "ListIcon",
};

/** The body of an icon, following the pack's aliases to the drawing itself. */
function bodyOf(pack: Pack, name: string, depth = 0): string {
  if (depth > 6) {
    throw new Error(`alias chain too long at ${name}`);
  }
  const icon = pack.icons[name];
  if (icon?.body) {
    return icon.body;
  }
  const alias = pack.aliases[name];
  if (typeof alias === "string") {
    return bodyOf(pack, alias, depth + 1);
  }
  if (alias?.body) {
    return alias.body;
  }
  if (alias?.parent) {
    return bodyOf(pack, alias.parent, depth + 1);
  }
  throw new Error(`no drawing for ${name}`);
}

const camel = (name: string) => name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
const upper = (name: string) => name.replace(/Icon$/, "").replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
const isText = (value: string) => /[A-Za-z]/.test(value);

type Element = { tag: string; attributes: [string, string][] };
type Parsed = { elements: Element[]; constants: [string, string][] };

/** Reads a body into JSX-ready elements, with every text-bearing attribute held in a constant. */
function parse(component: string, body: string): Parsed {
  const elements: Element[] = [];
  const constants: [string, string][] = [];
  const prefix = upper(component);
  const tags = [...body.matchAll(/<([a-z]+)((?:\s+[^>]*?)?)\s*\/>/g)];
  if (tags.length === 0) {
    throw new Error(`${component}: no element in "${body.slice(0, 40)}"`);
  }
  tags.forEach((match, index) => {
    const tag = match[1] ?? "";
    const raw = match[2] ?? "";
    const attributes: [string, string][] = [];
    for (const attribute of raw.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      const source = attribute[1] ?? "";
      const value = attribute[2] ?? "";
      const name = camel(source);
      if (isText(value)) {
        const constant = `${prefix}_${index + 1}_${source.replace(/-/g, "_").toUpperCase()}`;
        constants.push([constant, value]);
        attributes.push([name, `{${constant}}`]);
      } else {
        attributes.push([name, value]);
      }
    }
    elements.push({ tag, attributes });
  });
  return { elements, constants };
}

function render(pack: Pack): string {
  const blocks: string[] = [];
  const constants: [string, string][] = [];
  for (const [component, name] of ICONS) {
    const parsed = parse(component, bodyOf(pack, name));
    constants.push(...parsed.constants);
    const lines = parsed.elements.map((element) => {
      const attributes = element.attributes.map(([attribute, value]) => (value.startsWith("{") ? ` ${attribute}=${value}` : ` ${attribute}="${value}"`)).join("");
      return `      <${element.tag}${attributes} />`;
    });
    blocks.push([`export function ${component}() {`, "  return (", "    <Icon>", ...lines, "    </Icon>", "  );", "}"].join("\n"));
  }
  const constantLines = constants.map(([name, value]) => `const ${name} = "${value}";`);
  const navLines = Object.entries(NAV_ICONS).map(([id, component]) => `  ${id}: ${component},`);
  const footer = [
    "type IconComponent = () => ReactNode;",
    "",
    "/**",
    " * The icon of each navigation item, by the item's id, for the three entry points. Kept here and not",
    " * in the navigation models, which stay lists of ids, paths and labels.",
    " */",
    "const NAV_ICONS: Readonly<Record<string, IconComponent | undefined>> = {",
    ...navLines,
    "};",
    "",
    "/** An item added later without an icon of its own still gets one: no link is ever a bare word in the bar. */",
    "export function NavIcon({ id }: { id: string }) {",
    "  const Found = NAV_ICONS[id] ?? ListIcon;",
    "  return <Found />;",
    "}",
  ];
  return [
    `import type { ReactNode } from "react";`,
    "",
    "/**",
    " * The icons of the design system: Lucide (MIT), on the 24px grid, drawn in the text color (`.icon`",
    " * in shell.css sets the stroke). Every one is decorative and hidden from a screen reader: the",
    " * control or the text beside it carries the name, so an icon-only button needs its own `aria-label`.",
    " *",
    " * Written by `node scripts/icons.ts` from `@iconify-json/lucide`; edit the list there, not here.",
    " * Path data sits in constants so that the hard-coded text check, which reads string attributes in",
    " * JSX, keeps looking only at what a person can read.",
    " */",
    "function Icon({ children }: { children: ReactNode }) {",
    "  return (",
    '    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">',
    "      {children}",
    "    </svg>",
    "  );",
    "}",
    "",
    ...constantLines,
    "",
    ...blocks,
    "",
    ...footer,
    "",
  ].join("\n");
}

const pack = JSON.parse(readFileSync(SOURCE, "utf8")) as Pack;
const output = render(pack);
const check = process.argv.includes("--check");
const current = (() => {
  try {
    return readFileSync(TARGET, "utf8");
  } catch {
    return "";
  }
})();

if (check) {
  if (current !== output) {
    console.error("src/shared/icons.tsx is not what scripts/icons.ts writes. Run: node scripts/icons.ts");
    process.exit(1);
  }
  console.log("src/shared/icons.tsx is up to date");
} else {
  writeFileSync(TARGET, output);
  console.log(`wrote ${ICONS.length} icons to src/shared/icons.tsx`);
}
