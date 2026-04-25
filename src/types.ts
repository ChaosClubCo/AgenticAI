export interface SeverityLevel {
  id: string;
  name: string;
  impact: string;
  color: 'rose' | 'amber' | 'blue' | 'emerald' | 'purple' | 'slate';
}

export interface Conflict {
  id: string;
  description: string;
  severity: string;
  type: 'Data Source vs. Rule' | 'Rule Ambiguity' | 'Other';
  resolved?: boolean;
  justification?: string;
  example?: string;
  suggestion?: string;
  involvedAssets?: string[];
  impactScore?: number;
}

export interface DependencyGraphNode {
  id: string;
  label: string;
  type: 'source' | 'run' | 'rule';
}

export interface DependencyGraph {
  nodes: DependencyGraphNode[];
  links: { from: string; to: string }[];
}

export interface DataTransform {
  name: string;
  detail: string;
  timestamp: string;
  tool: string;
  icon: string;
  rowsIn: string;
  rowsOut: string;
  latency: string;
  status: 'Success' | 'Warning' | 'Error';
}

export interface DataLineage {
  origin: string;
  steward: string;
  confidentiality: string;
  integrityScore: number;
  freshness: string;
  completeness: number;
  transforms: DataTransform[];
}

export enum APIKeyPermission {
  READ_ONLY = 'read_only',
  READ_WRITE = 'read_write',
  ADMIN = 'admin'
}

export interface APIKey {
  id: string;
  name: string;
  key: string;
  permissions: APIKeyPermission[];
  createdAt: string;
  lastUsedAt?: string;
  rotatedAt?: string;
  revokedAt?: string;
  status: 'active' | 'revoked';
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  action: 'key_generated' | 'key_rotated' | 'key_revoked' | 'manifest_attested' | 'conflict_resolved';
  actor: string;
  details: string;
  metadata?: Record<string, any>;
}

export interface Manifest {
  id: string;
  systemName: string;
  ownerDomain: string;
  trainingSources: string[];
  trainingRuns: string[];
  businessRules: string[];
  attested: boolean;
  attestationSignature?: string;
  attestedAt?: string;
  systemPurpose?: string;
  detectedConflicts?: Conflict[];
  dependencyGraph?: DependencyGraph;
  lineageData?: Record<string, DataLineage>;
  ciSettings?: {
    provider: 'github' | 'jenkins' | 'none';
    lastRunStatus?: 'success' | 'failure' | 'running';
    lastRunAt?: string;
  };
  apiKeys?: APIKey[];
  auditLog?: AuditEvent[];
}
