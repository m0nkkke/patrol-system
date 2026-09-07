export type UserRole =
  | 'security_guard'
  | 'route_setter'
  | 'local_route_setter'
  | 'inspector'
  | 'admin';

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthProfile = {
  fullName: string;
  id: string;
  role: UserRole;
  shopId: string | null;
  shopIds: string[];
  username: string;
};

export type Shop = {
  address?: string | null;
  externalId?: string | null;
  id: string;
  isActive: boolean;
  name: string;
  regionId?: string | null;
  routeExpectedPoints: number;
  routeRegisteredPoints: number;
  routeStatus: 'not_configured' | 'setup_in_progress' | 'ready';
  timezone: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  limit: number;
  page: number;
  total: number;
};

export type IncidentSeverity = 'info' | 'warning' | 'critical';

export type PatrolIncidentType =
  | 'long_interval'
  | 'missed_point'
  | 'patrol_overdue'
  | 'point_dwell_too_short'
  | 'route_suspiciously_fast'
  | 'route_too_fast'
  | 'route_too_slow'
  | 'schedule_deviation'
  | 'short_interval';

export type ControlIncident = {
  actualSeconds: number | null;
  createdAt: string;
  employee: {
    fullName: string | null;
    id: string;
  };
  expectedSeconds: number | null;
  fromPatrolPoint: {
    id: string;
    name: string;
    sortOrder: number;
  } | null;
  id: string;
  message: string;
  patrol: {
    completedAt: string | null;
    dueAt: string | null;
    id: string;
    period: string | null;
    routeCategory: 'internal' | 'external' | null;
    routeId: string | null;
    routeName: string | null;
    scheduleId: string | null;
    startedAt: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
  };
  patrolEvent: {
    deviceId: string;
    id: string;
    lateSync: boolean;
    nfcUid: string;
    pointDeactivatedAfterScan: boolean;
    scannedAt: string;
  } | null;
  severity: IncidentSeverity;
  shop: {
    id: string;
    name: string | null;
  };
  toPatrolPoint: {
    id: string;
    name: string;
    sortOrder: number;
  } | null;
  type: PatrolIncidentType;
};

export type PatrolStatus = 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';

export type ControlPatrolSummary = {
  completedAt: string | null;
  dueAt: string | null;
  durationIsFinal: boolean;
  durationSeconds: number | null;
  employee: { fullName: string | null; id: string };
  expectedSeconds: number | null;
  id: string;
  incidentCount: number;
  period: string | null;
  progress: { scannedPoints: number; totalPoints: number };
  reportCount: number;
  route: { category: 'internal' | 'external' | null; id: string | null; name: string | null };
  scheduleId: string | null;
  shop: { id: string; name: string | null };
  startedAt: string | null;
  status: PatrolStatus;
};

export type ControlPatrolDetail = ControlPatrolSummary & {
  routeSnapshot?: Array<{ id: string; name: string; sortOrder: number; dwellSeconds: number }> | null;
  cancellationReason: string | null;
  completionReport: string | null;
  events: Array<{
    accepted: boolean;
    deviceId: string;
    gpsAccuracy: number | null;
    id: string;
    isSuspicious: boolean;
    lateSync: boolean;
    lat: number | null;
    lng: number | null;
    nfcUid: string;
    patrolPoint: { id: string; name: string; sortOrder: number } | null;
    receivedAt: string;
    rejectionReason: string | null;
    scanAction: 'arrive' | 'depart';
    scannedAt: string;
    suspicionReason: string | null;
  }>;
  incidents: Array<{
    actualSeconds: number | null;
    createdAt: string;
    expectedSeconds: number | null;
    id: string;
    message: string;
    severity: IncidentSeverity;
    type: PatrolIncidentType;
  }>;
  notes: string | null;
  reports: Array<{
    fileCount: number;
    id: string;
    reportType: string;
    status: 'draft' | 'submitted' | 'cancelled';
    submittedAt: string | null;
  }>;
  timingProfile: {
    averageTotalSeconds: number;
    calculatedFrom: string;
    calculatedTo: string;
    fastSeconds: number;
    sampleCount: number;
    slowSeconds: number;
    suspiciousFastSeconds: number;
  } | null;
  visits: Array<{
    arrivedAt: string;
    arrivalEvent: PatrolVisitEvent | null;
    departedAt: string | null;
    departureEvent: PatrolVisitEvent | null;
    dwellSeconds: number | null;
    id: string;
    lockedUntil: string;
    patrolPoint: { id: string; name: string; sortOrder: number } | null;
    status: 'arrived' | 'completed';
  }>;
};

export type PatrolVisitEvent = {
  accepted: boolean;
  deviceId: string;
  id: string;
  lateSync: boolean;
  nfcUid: string;
  scannedAt: string;
};

export type PatrolRouteOption = {
  category: 'internal' | 'external';
  id: string;
  isActive: boolean;
  name: string;
  shopId: string;
};

export type PatrolReportType = 'photo_report' | 'morning' | 'closing' | 'sunday' | 'heating' | 'evacuation';
export type PatrolReportStatus = 'draft' | 'submitted' | 'cancelled';

export type ControlReport = {
  cancellationReason: string | null;
  cancelledAt: string | null;
  comment: string | null;
  createdAt: string;
  employee: { fullName: string | null; id: string };
  fields: Record<string, unknown>;
  files: Array<{
    createdAt: string;
    height: number | null;
    id: string;
    kind: string;
    mimeType: string;
    originalName: string | null;
    sizeBytes: number;
    url: string;
    width: number | null;
  }>;
  id: string;
  patrolId: string | null;
  period: 'morning' | 'noon' | 'evening' | null;
  reportType: PatrolReportType;
  route: { id: string; name: string | null } | null;
  schedule: { id: string; name: string | null } | null;
  schemaVersion: string;
  shop: { id: string; name: string | null };
  status: PatrolReportStatus;
  submittedAt: string | null;
};

export type ControlShopOverview = {
  generatedAt: string;
  period: { from: string; to: string };
  recentIncidents: Array<{
    actualSeconds: number | null;
    createdAt: string;
    expectedSeconds: number | null;
    id: string;
    message: string;
    patrolId: string;
    severity: 'info' | 'warning' | 'critical';
    type: string;
  }>;
  recentPatrols: Array<{
    completedAt: string | null;
    dueAt: string | null;
    employee: { fullName: string | null; id: string };
    id: string;
    route: { category: 'internal' | 'external' | null; id: string | null; name: string | null };
    scannedPoints: number;
    scheduleId: string | null;
    startedAt: string | null;
    status: 'pending' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
    totalPoints: number;
  }>;
  recentReports: Array<{
    createdAt: string;
    employee: { fullName: string | null; id: string };
    fileCount: number;
    id: string;
    reportType: string;
    status: 'draft' | 'submitted' | 'cancelled';
    submittedAt: string | null;
  }>;
  reportSummary: Array<{ count: number; reportType: string; status: string }>;
  shop: {
    address: string | null;
    externalId: string | null;
    id: string;
    isActive: boolean;
    name: string;
    regionId: string | null;
    regionName: string | null;
    routeRegisteredPoints: number;
    routeStatus: string;
    timezone: string;
  };
  staff: Array<{
    fullName: string;
    id: string;
    isActive: boolean;
    primaryShopId: string | null;
    role: UserRole;
  }>;
  stats: {
    cancelledPatrols: number;
    completedPatrols: number;
    completionRate: number;
    incidentCount: number;
    overduePatrols: number;
    totalPatrols: number;
  };
};

export type ManagementMetricSet = {
  attentionPatrols: number;
  attentionRate: number;
  averageCompletionSeconds: number | null;
  cleanPatrolRate: number;
  cleanPatrols: number;
  completedPatrols: number;
  completionRate: number;
  onTimePatrols: number;
  onTimeRate: number;
  registeredPatrols: number;
  submittedReports: number;
};

export type ManagementResponseContext = {
  period: { from: string | null; to: string | null };
  schemaVersion: '2.0';
  scope: { regionId: string | null; shopId: string | null };
  sourceService: 'patrol';
};

export type ManagementMetrics = ManagementResponseContext & {
  metrics: ManagementMetricSet & {
    attentionShopCount: number;
    greenShopCount: number;
  };
};

export type ManagementTrends = ManagementResponseContext & {
  bucket: 'day' | 'week' | 'month';
  items: Array<{ bucketStart: string; metrics: ManagementMetricSet }>;
};

export type ManagementBreakdown = ManagementResponseContext & {
  groupBy: 'routeCategory' | 'period';
  items: Array<{ groupKey: string; metrics: ManagementMetricSet }>;
};

export type ManagementScorecard = {
  metrics: ManagementMetricSet;
  regionId: string | null;
  shopId: string;
  shopName: string;
  status: 'attention' | 'green' | 'no_data';
};

export type ManagementScorecards = ManagementResponseContext & {
  items: ManagementScorecard[];
  meta: { limit: number; page: number; total: number };
};
