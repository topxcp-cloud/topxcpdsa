export interface Handles {
  leetcode?: string;
  codeforces?: string;
  codechef?: string;
}

export interface ModerationNote {
  id: string;
  text: string;
  createdAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  college?: string;
  academicYear?: string;
  branch?: string;
  section?: string;
  classDivision?: string;
  handles: Handles;
  isPro?: boolean;
  accountStatus: 'active' | 'suspended' | 'blacklisted';
  totalUniqueSolved: number;
  totalActiveDays: number;
  currentStreak: number;
  longestStreak: number;
  createdAt: string | null;
  lastSyncedAt: string | null;
  profileComplete: boolean;
  verificationStatus: 'pending' | 'verified' | 'needs_review' | 'rejected';
  moderationNotes?: ModerationNote[];
  suspendedReason?: string | null;
  suspendedAt?: string | null;
  blacklistedReason?: string | null;
  blacklistedAt?: string | null;
}

export interface TopSolver {
  id: string;
  name: string;
  avatar?: string;
  totalUniqueSolved: number;
  currentStreak: number;
}

export interface AdminStats {
  totalUsers: number;
  proUsers: number;
  suspended: number;
  blacklisted: number;
  activeUsers: number;
  profileComplete: number;
  profileIncomplete: number;
  platforms: {
    leetcode: number;
    codeforces: number;
    codechef: number;
    none: number;
  };
  yearDistribution: Record<string, number>;
  branchDistribution: Record<string, number>;
  collegeDistribution: Record<string, number>;
  registrationsByDay: Record<string, number>;
  activityByDay: Record<string, number>;
  topSolvers: TopSolver[];
  totalTasks: number;
  totalProProblems: number;
  totalResources: number;
  totalAuditEntries: number;
}

export interface DailyTask {
  id: string;
  title: string;
  platform: 'LeetCode' | 'Codeforces' | 'CodeChef' | 'Custom';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  points: number;
  problemCode?: string;
  url: string;
  status: 'draft' | 'scheduled' | 'published' | 'expired';
  publishAt?: string;
  expiresAt?: string;
  description?: string;
  tags?: string[];
  targetAudience?: string;
  editorialUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskProgress {
  windowStart: string;
  windowEnd: string;
  proOnly: boolean;
  totalTasks: number;
  totalCompletions: number;
  participatingMembers: number;
  tasks: Array<{
    id: string;
    title: string;
    platform: string;
    completedCount: number;
  }>;
  members: Array<{
    id: string;
    name: string;
    completedCount: number;
  }>;
}

export interface AuditEntry {
  id: string;
  action: string;
  targetUserId?: string;
  targetUserName?: string;
  reason?: string;
  timestamp: string;
  outcome: 'success' | 'failure';
}

export interface VerificationData {
  status: 'pending' | 'verified' | 'needs_review' | 'rejected';
  reason?: string;
  reviewedAt: string;
}

export type EventFieldType = 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'checkbox';

export interface EventField {
  id: string;
  key: string;
  label: string;
  type: EventFieldType;
  required: boolean;
  options: string[];
}

export interface EventRecord {
  id: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  imageUrl?: string;
  imageData?: string;
  eventUrl?: string;
  eventLinkType?: 'linkedin' | 'custom';
  eventLinkLabel?: string;
  status: 'open' | 'closed';
  showOnWebsite?: boolean;
  fields: EventField[];
  registrationCount?: number;
  createdAt?: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  email: string;
  values: Record<string, string | boolean>;
  createdAt: string;
}

export interface StreakRewardClaim {
  id: string;
  userId: string;
  name: string;
  email: string;
  college: string;
  academicYear: string;
  branch: string;
  section: string;
  milestone: 30 | 50 | 75 | 100;
  currentStreak: number;
  longestStreak: number;
  claimedAt: string;
}
