import type { Theme } from "./api";

/* Types + helpers for Phase 3 (tournaments, leagues, event stalls). Mirrors api/src/models/host.ts. */

export type TournamentStatus = "registration" | "live" | "completed";

export type Tournament = {
  _id: string;
  slug: string;
  title: string;
  sport: string;
  format: "knockout" | "league";
  city: string;
  venue?: { _id: string; slug: string; name: string; area: string; emoji?: string } | null;
  venueName?: string;
  area?: string;
  startsAt: string;
  entryFee: number;
  teamSize: number;
  maxTeams: number;
  prizes: string[];
  rules?: string;
  organizer: string | { _id: string; name?: string };
  status: TournamentStatus;
  emoji: string;
  theme: Theme;
  teamsCount: number;
  champion?: string;
};

export type TeamRef = { _id: string; name: string };
export type Team = { _id: string; name: string; players: { name: string }[]; seed?: number };

export type Match = {
  _id: string;
  round: number;
  order: number;
  teamA?: TeamRef | null;
  teamB?: TeamRef | null;
  scoreA?: number | null;
  scoreB?: number | null;
  status: "scheduled" | "live" | "done";
  winner?: TeamRef | null;
  bye?: boolean;
  startsAt?: string;
  court?: string;
  nextMatch?: string;
  nextSlot?: "A" | "B";
};

export type StandingRow = { team: string; name: string; p: number; w: number; d: number; l: number; pf: number; pa: number; diff: number; pts: number };

export type TournamentDetail = {
  tournament: Tournament;
  teams: Team[];
  matches: Match[];
  rounds: number;
  standings: StandingRow[] | null;
  myTeam: { _id: string; name: string; paid: boolean } | null;
  isOrganizer: boolean;
};

export type Stall = {
  _id: string;
  label: string;
  row: number;
  col: number;
  size: "small" | "large";
  price: number;
  status: "available" | "held" | "booked";
  business?: { _id: string; slug: string; name: string; emoji: string; theme: Theme; kind: string } | null;
};

export type EventDetail = {
  event: {
    _id: string;
    slug: string;
    title: string;
    kind: string;
    emoji: string;
    description?: string;
    startsAt: string;
    endsAt?: string;
    venue?: string;
    area?: string;
    organizer?: string;
    price: number;
    capacity: number;
    rsvpCount: number;
    location?: { coordinates: [number, number] };
  };
  going: boolean;
  stalls: { total: number; available: number; minPrice: number } | null;
};

/** "Final", "Semi-finals", "Quarter-finals", "Round of 16", … for a knockout round. */
export function roundName(round: number, rounds: number, format: Tournament["format"]) {
  if (format === "league") return `Round ${round}`;
  const left = rounds - round;
  if (left === 0) return "Final";
  if (left === 1) return "Semi-finals";
  if (left === 2) return "Quarter-finals";
  return `Round of ${2 ** (left + 1)}`;
}

export const statusLabel: Record<TournamentStatus, string> = { registration: "Registering", live: "Live", completed: "Completed" };

export const SPORTS = ["cricket", "football", "pickleball", "badminton", "volleyball", "basketball"] as const;

export const sportEmoji: Record<string, string> = { cricket: "🏏", football: "⚽", pickleball: "🏓", badminton: "🏸", volleyball: "🏐", basketball: "🏀" };

/** Gradient per event kind, for event pages without a business theme. */
export const eventTheme: Record<string, Theme> = {
  run_club: { from: "#FFD23F", to: "#FF7A1A" },
  cycling: { from: "#2EE6A6", to: "#118AB2" },
  bike_ride: { from: "#3A0CA3", to: "#F72585" },
  food_fest: { from: "#FF7A1A", to: "#FF2E63" },
  night_market: { from: "#16123A", to: "#FF3D7F" },
  tournament: { from: "#38B000", to: "#007200" },
  trek: { from: "#80B918", to: "#2B9348" },
  meetup: { from: "#4CC9F0", to: "#4361EE" },
};
