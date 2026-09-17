import Image from 'next/image';
import {
  ArrowRightLeft,
  AudioLines,
  BookCheck,
  Calendar,
  ChartLine,
  ChartPie,
  Cog,
  Files,
  Handshake,
  Inbox,
  LogOut,
  Mail,
  Map,
  Users,
  UserStar,
  type LucideIcon,
} from 'lucide-react';

/**
 * Toph Navigation Bar — Figma node 1:101, a fixed 280px column.
 *
 * The icons are Lucide: every layer in the Figma is named for a Lucide glyph
 * (chart-line, audio-lines, book-check, clipboard-pen…), so the designer drew
 * from that set. Pulling them from `lucide-react` reproduces the exact glyphs
 * and keeps them as scalable, currentColor-aware SVG, rather than committing
 * twenty exported files fetched from URLs that expire in a week.
 *
 * Only Dashboard is wired up. The rest are presentational: this challenge
 * scopes one screen, and a nav item that navigates nowhere is more honest than
 * one that routes to an empty page.
 */

type NavItem = {
  label: string;
  icon: LucideIcon;
  /** Unread count rendered as the green pill. */
  badge?: number;
  active?: boolean;
};

type NavSection = { heading: string; items: NavItem[] };

function buildSections(newCount: number): NavSection[] {
  return [
    {
      heading: 'OVERVIEW',
      items: [
        { label: 'Dashboard', icon: ChartLine, active: true, badge: newCount },
        { label: 'Activity Logs', icon: AudioLines },
        { label: 'Map', icon: Map },
      ],
    },
    {
      heading: 'COMPLIANCE',
      items: [
        { label: 'Audit Manager', icon: BookCheck },
        { label: 'Reports', icon: Files },
        { label: 'Schedule', icon: Calendar },
      ],
    },
    {
      heading: 'TEAM MANAGEMENT',
      items: [
        { label: 'Employees', icon: Users },
        { label: 'Performance', icon: ChartPie },
        { label: 'Messages', icon: Mail },
      ],
    },
    {
      heading: 'OTHER',
      items: [
        { label: 'Settings', icon: Cog },
        { label: 'Support', icon: Handshake },
      ],
    },
  ];
}

function NavRow({ label, icon: Icon, badge, active }: NavItem) {
  return (
    <div
      className={`flex w-full shrink-0 items-center justify-between rounded-control px-[14px] py-[10px] ${
        active ? 'bg-selected' : ''
      }`}
    >
      <div className="flex shrink-0 items-center gap-[14px]">
        <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
        <span className="whitespace-nowrap text-[14px] text-ink">{label}</span>
      </div>
      {/* A zero count renders nothing — an empty badge reads as a bug. */}
      {badge ? (
        <span className="flex h-[14px] w-[20px] shrink-0 items-center justify-center rounded-[50px] border-[0.5px] border-badge-edge bg-badge text-[10px] font-medium text-white">
          {badge}
        </span>
      ) : null}
    </div>
  );
}

export function Sidebar({ newCount = 0 }: { newCount?: number }) {
  return (
    <nav className="flex h-full w-sidebar shrink-0 flex-col gap-shell rounded-panel border border-line-strong bg-surface p-shell">
      {/* Account header */}
      <div className="flex w-full shrink-0 items-center justify-between rounded-control py-[4px] pl-[4px] pr-[14px]">
        <div className="flex shrink-0 items-center gap-shell">
          <Image
            src="/avatar-bays-ranch.png"
            alt=""
            width={42}
            height={42}
            className="size-[42px] shrink-0 rounded-full object-cover"
            priority
          />
          <div className="flex shrink-0 flex-col gap-[8px]">
            <span className="whitespace-nowrap text-[14px] font-medium text-ink">
              Bays Ranch
            </span>
            <span className="flex items-center gap-[5px] whitespace-nowrap text-[14px] font-medium text-ink-faint">
              <UserStar className="size-[10px] shrink-0" strokeWidth={1.5} aria-hidden />
              Admin
            </span>
          </div>
        </div>
        <Inbox className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
      </div>

      {buildSections(newCount).map((section) => (
        <div key={section.heading} className="flex w-full shrink-0 flex-col gap-[4px]">
          <div className="flex w-full items-center px-[10px] py-[4px]">
            <span className="whitespace-nowrap text-[10px] font-medium text-ink-muted">
              {section.heading}
            </span>
          </div>
          {section.items.map((item) => (
            <NavRow key={item.label} {...item} />
          ))}
        </div>
      ))}

      {/* mt-auto pins these two to the bottom, matching the Figma, without
          hardcoding a height that would break if a section were added. */}
      <div className="mt-auto flex w-full shrink-0 flex-col gap-[4px]">
        <NavRow label="Switch User" icon={ArrowRightLeft} />
        <NavRow label="Log Out" icon={LogOut} />
      </div>
    </nav>
  );
}
