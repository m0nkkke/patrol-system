export interface PlanFactCounts {
  planned: number;
  completed: number;
  unfinished: number;
  missed: number;
  upcoming: number;
  completionRate: number | null;
}

export interface PlanFactResponse {
  from: string;
  to: string;
  generatedAt: string;
  coverageStartedAt: string;
  partialHistory: boolean;
  totals: PlanFactCounts;
  unscheduledPatrols: number;
  shops: Array<PlanFactCounts & { shopId: string; shopName: string }>;
  days: Array<PlanFactCounts & { date: string }>;
}
