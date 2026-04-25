import { SeverityLevel, Manifest } from './types.ts';

export const DEFAULT_SEVERITIES: SeverityLevel[] = [
  { id: 'sev-1', name: 'High', impact: 'Immediate violation of compliance or core business constraint.', color: 'rose' },
  { id: 'sev-2', name: 'Medium', impact: 'Operational friction, elevated error rates, or degraded performance.', color: 'amber' },
  { id: 'sev-3', name: 'Low', impact: 'Sub-optimal alignment but non-blocking for production.', color: 'blue' }
];

export const SEVERITY_COLORS: Record<string, string> = {
  rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export const INITIAL_MANIFESTS: Manifest[] = [
  {
    id: '1',
    systemName: 'Retail_Customer_Predictor',
    ownerDomain: 'Retail Ops',
    trainingSources: ['Global_Sales_History_2023-2025', 'Customer_Support_Transcripts_V2'],
    trainingRuns: ['run-retail-v2.1-base', 'run-retail-v2.2-finetuned'],
    businessRules: ['If customer LTV > $500, route to priority queue', 'Do not offer discounts exceeding 15% margin', 'Strictly process local US-only queries without international routing'],
    systemPurpose: 'Operationalizes predictive customer behavioral modeling for Retail Ops utilizing historical transaction data and support transcript fine-tuning via the retail-v2.2-finetuned protocol. Technical capabilities encompass autonomous priority queue routing for high-LTV identifiers while enforcing rigid discount-margin caps and mandatory US-only data residency constraints to ensure regional compliance.',
    dependencyGraph: {
      nodes: [
        { id: 'global_sales_history_2023_2025', label: 'Global_Sales_History_2023-2025', type: 'source' },
        { id: 'customer_support_transcripts_v2', label: 'Customer_Support_Transcripts_V2', type: 'source' },
        { id: 'run_retail_v2_1_base', label: 'run-retail-v2.1-base', type: 'run' },
        { id: 'run_retail_v2_2_finetuned', label: 'run-retail-v2.2-finetuned', type: 'run' },
        { id: 'rule_ltv_priority', label: 'If customer LTV > $500, route to priority queue', type: 'rule' },
        { id: 'rule_discount_margin', label: 'Do not offer discounts exceeding 15% margin', type: 'rule' },
        { id: 'rule_us_only', label: 'Strictly process local US-only queries without international routing', type: 'rule' }
      ],
      links: [
        { from: 'global_sales_history_2023_2025', to: 'run_retail_v2_1_base' },
        { from: 'customer_support_transcripts_v2', to: 'run_retail_v2_1_base' },
        { from: 'run_retail_v2_1_base', to: 'run_retail_v2_2_finetuned' },
        { from: 'rule_ltv_priority', to: 'run_retail_v2_2_finetuned' },
        { from: 'rule_discount_margin', to: 'run_retail_v2_2_finetuned' },
        { from: 'rule_us_only', to: 'run_retail_v2_2_finetuned' }
      ]
    },
    ciSettings: { provider: 'none' },
    attested: false,
    auditLog: [],
    lineageData: {
      'Global_Sales_History_2023-2025': {
        origin: 'Enterprise ERP Central (PostgreSQL Cluster)',
        steward: 'Financial Data Integrity Group',
        confidentiality: 'Highly Confidential',
        integrityScore: 98,
        freshness: 'T-1 Day (Daily Batch)',
        completeness: 99.8,
        transforms: [
          { name: 'PII Scrubbing', detail: 'Advanced tokenization of customer credit identifiers', timestamp: '2026-04-20', tool: 'DataShield v4', icon: 'Lock', rowsIn: '12M', rowsOut: '12M', latency: '4.2s', status: 'Success' },
          { name: 'VAT Normalization', detail: 'Standardizing tax codes across 44 regions', timestamp: '2026-04-20', tool: 'Tax-Aligner', icon: 'RefreshCw', rowsIn: '12M', rowsOut: '12M', latency: '12.8s', status: 'Success' }
        ]
      },
      'Customer_Support_Transcripts_V2': {
        origin: 'Zendesk CRM API Export',
        steward: 'CX Operations',
        confidentiality: 'Restricted',
        integrityScore: 94,
        freshness: 'Real-time (Stream)',
        completeness: 92.4,
        transforms: [
          { name: 'PII Masking', detail: 'Pattern-based redaction of emails and phone numbers in LLM response buffers', timestamp: '2026-04-25', tool: 'Privacy-Shield v3', icon: 'Lock', rowsIn: '120k', rowsOut: '120k', latency: '240ms', status: 'Success' },
          { name: 'HTML Stripping', detail: 'Cleaned rich-text into raw training segments', timestamp: '2026-04-25', tool: 'NLP-Prep-Parser', icon: 'ListFilter', rowsIn: '120k', rowsOut: '120k', latency: '450ms', status: 'Success' },
          { name: 'Offensive Word Filtering', detail: 'Removed hazardous language patterns', timestamp: '2026-04-25', tool: 'Safety-Guard-7', icon: 'ShieldCheck', rowsIn: '120k', rowsOut: '118k', latency: '3.1s', status: 'Warning' }
        ]
      }
    }
  },
  {
    id: '2',
    systemName: 'Global_Network_Optimizer',
    ownerDomain: 'Global Network',
    trainingSources: ['Network_Telemetry_Logs_Q1-Q4', 'Incident_Postmortems_Archive'],
    trainingRuns: ['run-netops-v4.0-core'],
    businessRules: ['Never restart core router during peak hours (0800-1800 UTC)', 'Require human approval for BGP route changes'],
    attested: true,
    attestationSignature: 'sha256-8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4',
    attestedAt: '2026-04-22T08:30:00Z',
    systemPurpose: 'Executes real-time network topology optimization leveraging multi-quarter telemetry logs and historical incident post-mortem analysis integrated through the netops-v4.0-core training cycle. Operational logic is strictly constrained to prevent core hardware power-cycling during peak UTC windows and mandates human-in-the-loop attestation for all BGP routing modifications.',
    auditLog: [],
    ciSettings: { provider: 'github', lastRunStatus: 'success', lastRunAt: '2026-04-22T08:30:00Z' }
  },
  {
    id: '3',
    systemName: 'Fraud_Detection_Sentinel',
    ownerDomain: 'Risk Management',
    trainingSources: ['Swift_Transaction_Flows_2024', 'Historical_Fraud_Graph_Database'],
    trainingRuns: ['run-fraud-vision-v5.2'],
    businessRules: ['Immediately freeze accounts with >3 flagged transactions in 60s', 'Mandatory geofencing check for out-of-region logins', 'Ensure PII is encrypted at rest using AES-256'],
    attested: false,
    systemPurpose: 'Conducts real-time transactional monitoring and fraud pattern recognition within Risk Management using high-velocity SWIFT flow data and historical fraud pattern recognition derived from the run-fraud-vision-v5.2 training cycle. Technical capabilities enable autonomous account suspension for high-frequency flagship indicators while enforcing rigid geofencing authentication protocols and mandatory AES-256 data encryption for compliance with global financial security standards.',
    auditLog: [],
    ciSettings: { provider: 'none' }
  }
];
