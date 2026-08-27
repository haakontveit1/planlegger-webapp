export interface Task {
  id: string;
  title: string;
  notes: string | null;
  status: "pending" | "completed" | "skipped";
  category: "meals" | "work" | "private" | "workout" | "remember" | "plans" | "deadlines" | "inbox";
  lane: "work" | "afterwork" | null;
  customer: string | null;
  durationMinutes: number | null;
  isBacklog: boolean;
  sortOrder: number;
  projectId: string | null;
  dueDate: string | null;
  dueTime: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  category: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Routine {
  id: string;
  title: string;
  projectId: string | null;
  defaultDurationMinutes: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoutineSession {
  id: string;
  routineId: string;
  durationMinutes: number;
  date: string;
  status: "pending" | "completed";
  completedAt: string | null;
  createdAt: string;
}

export interface BrainDumpItem {
  id: string;
  text: string;
  notes: string | null;
  createdAt: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  rating: number;
  ratingNote: string | null;
  bedTime: string | null;
  wakeTime: string | null;
  learning: string | null;
  tomorrow: string | null;
  photoUris: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WishlistItem {
  id: string;
  name: string;
  currentPrice: number | null;
  targetPrice: number | null;
  isWatching: boolean;
  onSale: boolean;
  salePrice: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface DevGoal {
  id: string;
  weekStart: string;
  targetHours: number;
  loggedMinutes: number;
}

export interface WeeklyGoal {
  id: string;
  weekStart: string;
  text: string;
  isWish: boolean;
  achieved: boolean;
}

export interface WeeklyReview {
  id: string;
  weekStart: string;
  reflection: string;
  completedAt: string;
}

export interface BuyItem {
  id: string;
  name: string;
  isRange: boolean;
  priceEstimate: number | null;
  priceMin: number | null;
  priceMax: number | null;
  createdAt: string;
}

export interface ProjectNote {
  id: string;
  projectId: string;
  text: string;
  createdAt: string;
}
