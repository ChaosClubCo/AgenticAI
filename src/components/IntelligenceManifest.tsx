import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, FileCode, Database, Plus, Trash2, Download, Lock, RefreshCw, Play, ShieldCheck, AlertTriangle, Sparkles, AlertOctagon, Webhook, Terminal, CheckCircle, XCircle, Loader2, GitCommit, Filter, Settings, Activity, HelpCircle, Network, GitMerge, ListFilter, Clock, Search, LayoutGrid, Layers, Orbit, Share2 } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import * as d3 from 'd3';

interface SeverityLevel {
  id: string;
  name: string;
  impact: string;
  color: 'rose' | 'amber' | 'blue' | 'emerald' | 'purple' | 'slate';
}

const DEFAULT_SEVERITIES: SeverityLevel[] = [
  { id: 'sev-1', name: 'High', impact: 'Immediate violation of compliance or core business constraint.', color: 'rose' },
  { id: 'sev-2', name: 'Medium', impact: 'Operational friction, elevated error rates, or degraded performance.', color: 'amber' },
  { id: 'sev-3', name: 'Low', impact: 'Sub-optimal alignment but non-blocking for production.', color: 'blue' }
];

const SEVERITY_COLORS: Record<string, string> = {
  rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  slate: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

interface Conflict {
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

interface DependencyGraphNode {
  id: string;
  label: string;
  type: 'source' | 'run' | 'rule';
}

interface DependencyGraph {
  nodes: DependencyGraphNode[];
  links: { from: string; to: string }[];
}

interface DataTransform {
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

interface DataLineage {
  origin: string;
  steward: string;
  confidentiality: string;
  integrityScore: number;
  freshness: string;
  completeness: number;
  transforms: DataTransform[];
}

interface Manifest {
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
}

const INITIAL_MANIFESTS: Manifest[] = [
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
    systemPurpose: 'Conducts real-time transactional monitoring and fraud pattern recognition within Risk Management using high-velocity SWIFT flow data and historical fraud graph analytics derived from the run-fraud-vision-v5.2 training cycle. Technical capabilities enable autonomous account suspension for high-frequency flagship indicators while enforcing rigid geofencing authentication protocols and mandatory AES-256 data encryption for compliance with global financial security standards.',
    ciSettings: { provider: 'none' }
  }
];

export default function IntelligenceManifest() {
  const [manifests, setManifests] = useState<Manifest[]>(INITIAL_MANIFESTS);
  const [selectedManifestId, setSelectedManifestId] = useState<string>(INITIAL_MANIFESTS[0].id);
  const [isExporting, setIsExporting] = useState(false);
  const [isAttesting, setIsAttesting] = useState(false);
  const [attestationStep, setAttestationStep] = useState<string>('');
  const [generatingMap, setGeneratingMap] = useState<Record<string, boolean>>({});
  const [conflictMap, setConflictMap] = useState<Record<string, boolean>>({});
  const [analyzingGraphMap, setAnalyzingGraphMap] = useState<Record<string, boolean>>({});
  const [conflictTypeFilter, setConflictTypeFilter] = useState<string | null>(null);
  const [conflictSeverityFilter, setConflictSeverityFilter] = useState<string | null>(null);
  const [expandedLineage, setExpandedLineage] = useState<Record<string, boolean>>({});
  const [expandedSystemGraph, setExpandedSystemGraph] = useState<boolean>(true);
  const [severities, setSeverities] = useState<SeverityLevel[]>(DEFAULT_SEVERITIES);
  const [isConfiguringSeverities, setIsConfiguringSeverities] = useState(false);
  const [newSevMode, setNewSevMode] = useState<Partial<SeverityLevel> | null>(null);
  const [expandedConflictMaps, setExpandedConflictMaps] = useState<Record<string, boolean>>({});
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState<string>('');
  const [editingPurpose, setEditingPurpose] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const [graphSearchTerm, setGraphSearchTerm] = useState('');
  const [graphLayout, setGraphLayout] = useState<'hierarchical' | 'grid' | 'force' | 'radial'>('hierarchical');
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number, y: number }>>({});
  const graphContainerRef = useRef<HTMLDivElement>(null);

  const simulateLineage = (source: string, manifestId?: string): DataLineage => {
    // Check if manifest has explicit lineage
    if (manifestId) {
      const manifest = manifests.find(m => m.id === manifestId);
      if (manifest?.lineageData?.[source]) {
        return manifest.lineageData[source];
      }
    }

    const seed = source.length;
    const baseDate = new Date(2025, 0, 1);
    const mockTms = (days: number) => new Date(baseDate.getTime() + days * 86400000).toISOString().split('T')[0];

    if (source === 'Customer_Support_Transcripts_V2') return { 
      origin: 'Zendesk CRM API Export', 
      steward: 'CX Operations',
      confidentiality: 'Restricted',
      integrityScore: 94,
      freshness: 'Real-time (Stream)',
      completeness: 92.4,
      transforms: [
        { name: 'PII Tokenization', detail: 'Advanced techniques for pseudonymization', timestamp: new Date().toISOString().split('T')[0], tool: 'Privacy-Shield v3', icon: 'Lock', rowsIn: '120k', rowsOut: '120k', latency: '155ms', status: 'Success' },
        { name: 'HTML Stripping', detail: 'Cleaned rich-text into raw training segments', timestamp: mockTms(seed % 20), tool: 'NLP-Prep-Parser', icon: 'ListFilter', rowsIn: '120k', rowsOut: '120k', latency: '450ms', status: 'Success' },
        { name: 'Offensive Word Filtering', detail: 'Removed hazardous language patterns', timestamp: mockTms(seed % 20 + 2), tool: 'Safety-Guard-7', icon: 'ShieldCheck', rowsIn: '120k', rowsOut: '118k', latency: '3.1s', status: 'Warning' },
        { name: 'User ID Anonymization', detail: 'Salted-hash replacement for thread IDs', timestamp: mockTms(seed % 20 + 4), tool: 'Privacy-Proxy', icon: 'Fingerprint', rowsIn: '118k', rowsOut: '118k', latency: '92ms', status: 'Success' }
      ]
    };
    if (source.includes('Sales')) return { 
      origin: 'Enterprise ERP Data Warehouse (PostgreSQL)', 
      steward: 'Finance Data Team',
      confidentiality: 'Highly Confidential',
      integrityScore: 98,
      freshness: 'T-1 Day (Daily Batch)',
      completeness: 99.8,
      transforms: [
        { name: 'PII Tokenization', detail: 'Advanced hashing of customer identifiers', timestamp: mockTms(seed % 30), tool: 'DataShield v4', icon: 'Lock', rowsIn: '4.2M', rowsOut: '4.2M', latency: '124ms', status: 'Success' },
        { name: 'Currency Normalization', detail: 'Converted all transactions to USD/EUR basket', timestamp: mockTms(seed % 30 + 5), tool: 'FxOps-Batch', icon: 'RefreshCw', rowsIn: '4.2M', rowsOut: '4.2M', latency: '89ms', status: 'Success' },
        { name: 'Time-series Aggregation', detail: 'Rolling 30-day window sums', timestamp: mockTms(seed % 30 + 10), tool: 'Spark-ETL', icon: 'Activity', rowsIn: '4.2M', rowsOut: '840k', latency: '1.2s', status: 'Success' }
      ]
    };
    if (source.includes('Support') || source.includes('Transcript')) return { 
      origin: 'Zendesk CRM API Export', 
      steward: 'CX Operations',
      confidentiality: 'Restricted',
      integrityScore: 94,
      freshness: 'Real-time (Stream)',
      completeness: 92.4,
      transforms: [
        { name: 'HTML Stripping', detail: 'Cleaned rich-text into raw training segments', timestamp: mockTms(seed % 20), tool: 'NLP-Prep-Parser', icon: 'ListFilter', rowsIn: '120k', rowsOut: '120k', latency: '450ms', status: 'Success' },
        { name: 'Offensive Word Filtering', detail: 'Removed hazardous language patterns', timestamp: mockTms(seed % 20 + 2), tool: 'Safety-Guard-7', icon: 'ShieldCheck', rowsIn: '120k', rowsOut: '118k', latency: '3.1s', status: 'Warning' },
        { name: 'User ID Anonymization', detail: 'Salted-hash replacement for thread IDs', timestamp: mockTms(seed % 20 + 4), tool: 'Privacy-Proxy', icon: 'Fingerprint', rowsIn: '118k', rowsOut: '118k', latency: '92ms', status: 'Success' }
      ]
    };
    return { 
      origin: 'Cloud-Storage Landing Zone (S3 Bucket)', 
      steward: 'Auto-Ingest System',
      confidentiality: 'Internal',
      integrityScore: 91,
      freshness: 'Varies',
      completeness: 88.5,
      transforms: [
        { name: 'UTF-8 Normalization', detail: 'Character encoding conflict resolution', timestamp: mockTms(seed % 15), tool: 'Ingest-Pipe', icon: 'Settings', rowsIn: '??', rowsOut: '942k', latency: '340ms', status: 'Success' },
        { name: 'Null Value Imputation', detail: 'Median value replacement for sparse vectors', timestamp: mockTms(seed % 15 + 1), tool: 'ML-Featurizer', icon: 'GitMerge', rowsIn: '942k', rowsOut: '942k', latency: '8.4s', status: 'Success' }
      ]
    };
  };

  const [newItemText, setNewItemText] = useState('');
  const [newItemType, setNewItemType] = useState<'trainingSources' | 'trainingRuns' | 'businessRules'>('trainingSources');
  const [newSourceText, setNewSourceText] = useState('');
  const [newRunText, setNewRunText] = useState('');
  const [ruleValidationFeedback, setRuleValidationFeedback] = useState<{status: 'validating'|'valid'|'ambiguous'|'error', message: string, example?: string, suggestion?: string} | null>(null);

  const [isCreatingSystem, setIsCreatingSystem] = useState(false);
  const [newSystemName, setNewSystemName] = useState('');
  const [newSystemDomain, setNewSystemDomain] = useState('');

  const selectedManifest = manifests.find(m => m.id === selectedManifestId);

  useEffect(() => {
    if (!selectedManifest?.dependencyGraph || !graphContainerRef.current) return;

    const width = graphContainerRef.current.clientWidth || 800;
    const height = 500;
    const nodes = selectedManifest.dependencyGraph.nodes.map(n => ({ ...n, x: 0, y: 0 }));
    const links = selectedManifest.dependencyGraph.links.map(l => ({ ...l, source: l.from, target: l.to }));
    
    const newPositions: Record<string, { x: number, y: number }> = {};

    if (graphLayout === 'force') {
      const simulation = d3.forceSimulation(nodes as any)
        .force("link", d3.forceLink(links as any).id((d: any) => d.id).distance(150))
        .force("charge", d3.forceManyBody().strength(-300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(80))
        .stop();

      for (let i = 0; i < 300; ++i) simulation.tick();

      nodes.forEach((n: any) => {
        newPositions[n.id] = { x: n.x, y: n.y };
      });
    } else if (graphLayout === 'radial') {
      const radius = Math.min(width, height) / 2 - 80;
      nodes.forEach((n, i) => {
        const angle = (i / nodes.length) * 2 * Math.PI;
        newPositions[n.id] = {
          x: width / 2 + radius * Math.cos(angle),
          y: height / 2 + radius * Math.sin(angle)
        };
      });
    } else if (graphLayout === 'grid') {
      const cols = Math.ceil(Math.sqrt(nodes.length));
      const cellWidth = width / cols;
      const cellHeight = height / Math.ceil(nodes.length / cols);
      nodes.forEach((n, i) => {
        newPositions[n.id] = {
          x: (i % cols) * cellWidth + cellWidth / 2,
          y: Math.floor(i / cols) * cellHeight + cellHeight / 2
        };
      });
    } else {
      // Hierarchical (Layered)
      const layers = { source: 0, run: 1, rule: 2 };
      const nodesByLayer: Record<number, any[]> = { 0: [], 1: [], 2: [] };
      nodes.forEach(n => {
        nodesByLayer[layers[n.type]].push(n);
      });

      Object.entries(nodesByLayer).forEach(([layer, layerNodes]) => {
        const layerIdx = parseInt(layer);
        const y = (layerIdx + 1) * (height / 4);
        layerNodes.forEach((n, i) => {
          const x = (i + 1) * (width / (layerNodes.length + 1));
          newPositions[n.id] = { x, y };
        });
      });
    }

    setNodePositions(newPositions);
  }, [selectedManifest?.dependencyGraph, graphLayout, selectedManifest?.id]);

  const analyzeDependencies = async (manifestId: string) => {
    const target = manifests.find(m => m.id === manifestId);
    if (!target) return;

    setAnalyzingGraphMap(prev => ({ ...prev, [manifestId]: true }));
    try {
      // @ts-ignore
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is required.");
      
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Analyze the interdependencies between these intelligence assets for the system "${target.systemName}":
      
      Training Sources: ${target.trainingSources.join(', ')}
      Training Runs: ${target.trainingRuns.join(', ')}
      Business Rules: ${target.businessRules.join(', ')}
      
      Determine which Sources influence which Runs, and which Rules govern which Runs based on their names and context.
      Return a JSON object representing a dependency graph.
      
      The response must be:
      {
        "nodes": [ { "id": "string", "label": "string", "type": "source|run|rule" } ],
        "links": [ { "from": "id", "to": "id" } ]
      }
      
      IDs should be sanitized versions of the asset names.`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ['source', 'run', 'rule'] }
                  },
                  required: ['id', 'label', 'type']
                }
              },
              links: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    from: { type: Type.STRING },
                    to: { type: Type.STRING }
                  },
                  required: ['from', 'to']
                }
              }
            },
            required: ['nodes', 'links']
          }
        }
      });
      
      const graph: DependencyGraph = JSON.parse(response.text || '{"nodes":[],"links":[]}');
      setManifests(prev => prev.map(m => m.id === manifestId ? { ...m, dependencyGraph: graph } : m));
    } catch (error) {
      console.error("Dependency Analysis Error", error);
    } finally {
      setAnalyzingGraphMap(prev => ({ ...prev, [manifestId]: false }));
    }
  };

  const generatePurpose = async (manifestId: string) => {
    const target = manifests.find(m => m.id === manifestId);
    if (!target) return;

    setGeneratingMap(prev => ({ ...prev, [manifestId]: true }));
    try {
      // @ts-ignore - Injected directly by AI Studio runtime
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is required.");
      
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `System Name: ${target.systemName}\nDomain: ${target.ownerDomain}\nTraining Sources: ${target.trainingSources.join(', ')}\nTraining Runs: ${target.trainingRuns.join(', ')}\nBusiness Rules: ${target.businessRules.join(', ')}\n\nAnalyze the intelligence assets above and write a highly technical, 2-to-3 sentence summary of this autonomous system's purpose. You must explicitly focus on its operational purview, technical capabilities, and rigid constraints required for compliance due diligence. Use cold, factual language. Avoid any generic filler or introductory phrases like "This system is designed to..." or "The purpose of this system is...". Start directly with the technical scope.`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt
      });
      
      setManifests(prev => prev.map(m => m.id === manifestId ? { ...m, systemPurpose: response.text } : m));
    } catch (error) {
      console.error("Gemini API Error", error);
      setManifests(prev => prev.map(m => m.id === manifestId ? { ...m, systemPurpose: "System purpose synthesis failed via API. Ensure environment configuration is complete." } : m));
    } finally {
      setGeneratingMap(prev => ({ ...prev, [manifestId]: false }));
    }
  };

  const detectConflicts = async (manifestId: string) => {
    const target = manifests.find(m => m.id === manifestId);
    if (!target) return;

    setConflictMap(prev => ({ ...prev, [manifestId]: true }));
    try {
      // @ts-ignore
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is required.");
      
      const ai = new GoogleGenAI({ apiKey });
      
      const sevNames = severities.map(s => s.name);
      const sevContext = severities.map(s => `- ${s.name}: ${s.impact}`).join('\n      ');
      const tsStr = target.trainingSources.join(', ');
      const trStr = target.trainingRuns.join(', ');
      const brStr = target.businessRules.join(', ');

      const prompt = `Analyze the following system manifest for intelligence conflicts:
      1. 'Logical Contradiction': Direct conflict between Business Rules and Training Sources/Runs (e.g., rule demands US-only but data is Global).
      2. 'Rule Ambiguity': Internal logic flaws, vague qualifiers (e.g., "fast", "large"), or missing edge cases within Business Rules.
      3. 'Scope Creep': Rules that demand capabilities not represented in the linked training runs.
      
      For EACH conflict, accurately identify which specific assets from the lists below are involved.
      Return their exact names in an 'involvedAssets' array.
      
      For 'Rule Ambiguity' conflicts, you MUST provide:
      - 'example': A specific scenario or input where the vague language leads to unpredictable AI behavior.
      - 'suggestion': A concrete, mathematically precise, or specific rule replacement.
      
      Categorize severity based on:
      ${sevContext}
      
      Training Sources: ${tsStr}
      Training Runs: ${trStr}
      Business Rules: ${brStr}
      
      Return ONLY a JSON array of conflict objects.`;

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                severity: { type: Type.STRING, enum: sevNames.length > 0 ? sevNames : ['Unknown'] },
                type: { type: Type.STRING, enum: ['Data Source vs. Rule', 'Rule Ambiguity', 'Other'] },
                example: { type: Type.STRING },
                suggestion: { type: Type.STRING },
                involvedAssets: { type: Type.ARRAY, items: { type: Type.STRING } },
                impactScore: { type: Type.NUMBER }
              },
              required: ['description', 'severity', 'type']
            }
          }
        }
      });
      
      let conflicts: Conflict[] = [];
      try {
        const cleanedText = response.text || '[]';
        conflicts = JSON.parse(cleanedText).map((c: any, i: number) => ({
          ...c,
          id: `conflict-${Date.now()}-${i}`,
          resolved: false
        }));
      } catch (e) {
        console.warn("Failed to parse Gemini conflict JSON", e);
      }
      
      setManifests(prev => prev.map(m => m.id === manifestId ? { ...m, detectedConflicts: conflicts } : m));
    } catch (error) {
      console.error("Conflict Detection API Error", error);
      setManifests(prev => prev.map(m => m.id === manifestId ? { ...m, detectedConflicts: [] } : m));
    } finally {
      setConflictMap(prev => ({ ...prev, [manifestId]: false }));
    }
  };

  const handleResolveConflict = (manifestId: string, conflictId: string, justification: string) => {
    setManifests(prev => prev.map(m => {
      if (m.id !== manifestId || !m.detectedConflicts) return m;
      return {
        ...m,
        detectedConflicts: m.detectedConflicts.map(c => 
          c.id === conflictId ? { ...c, resolved: true, justification } : c
        )
      };
    }));
    setResolvingConflictId(null);
    setJustificationText('');
  };

  useEffect(() => {
    if (newItemType !== 'businessRules' || !newItemText.trim() || !selectedManifest) {
      setRuleValidationFeedback(null);
      return;
    }

    if (newItemText.length < 5) {
      setRuleValidationFeedback({ status: 'validating', message: 'Waiting for more context...' });
      return;
    }

    setRuleValidationFeedback({ status: 'validating', message: 'Analyzing rule semantics...' });

    const timeout = setTimeout(async () => {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return;
        
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Perform real-time analysis on this proposed business rule.
        Detect 'Rule Ambiguity' (vague terms like "mostly", "rarely", "appropriate"), syntax errors, or contradictions with: ${selectedManifest.businessRules.join('; ')}
        
        Rule: "${newItemText}"
        
        If ambiguous or erroneous, you MUST provide:
        - example: A specific case showing why it's unclear.
        - suggestion: A more precise, actionable version of the rule.
        
        Return JSON object with 'status' (valid|ambiguous|error), 'message', 'example', and 'suggestion'.`;

        const response = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                status: { type: Type.STRING, enum: ['valid', 'ambiguous', 'error'] },
                message: { type: Type.STRING },
                example: { type: Type.STRING },
                suggestion: { type: Type.STRING }
              },
              required: ['status', 'message']
            }
          }
        });

        const result = JSON.parse(response.text || '{}');
        if (result.status && result.message) {
          setRuleValidationFeedback(result);
        }
      } catch (err) {
        console.warn('Real-time rule validation failed', err);
        setRuleValidationFeedback(null);
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [newItemText, newItemType, selectedManifest?.id, selectedManifest?.businessRules]);

  useEffect(() => {
    if (!selectedManifest) return;
    if (!selectedManifest.systemPurpose && !generatingMap[selectedManifest.id]) {
      generatePurpose(selectedManifest.id);
    }
    if (selectedManifest.detectedConflicts === undefined && !conflictMap[selectedManifest.id]) {
      detectConflicts(selectedManifest.id);
    }
    if (selectedManifest.dependencyGraph === undefined && !analyzingGraphMap[selectedManifest.id]) {
      analyzeDependencies(selectedManifest.id);
    }
  }, [selectedManifest?.id, selectedManifest?.systemPurpose, selectedManifest?.detectedConflicts, selectedManifest?.dependencyGraph]);

  useEffect(() => {
    if (selectedManifest) {
      setEditingPurpose(selectedManifest.systemPurpose || '');
      setSaveStatus('idle');
    }
  }, [selectedManifest?.id]);

  useEffect(() => {
    if (!selectedManifest || editingPurpose === (selectedManifest.systemPurpose || '')) {
      return;
    }

    const timeout = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        // Simulate a brief network latency for the save operation
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setManifests(prev => prev.map(m => 
          m.id === selectedManifest.id ? { ...m, systemPurpose: editingPurpose, attested: false } : m
        ));
        setSaveStatus('saved');
        
        // Clear "saved" status after 3 seconds
        setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (error) {
        setSaveStatus('error');
      }
    }, 2000);

    return () => clearTimeout(timeout);
  }, [editingPurpose, selectedManifest?.id]);

  const generateStateHash = async (manifest: Manifest): Promise<string> => {
    // Deterministic serialization of core IP assets
    const payload = JSON.stringify({
      ts: [...manifest.trainingSources].sort(),
      tr: [...manifest.trainingRuns].sort(),
      br: [...manifest.businessRules].sort()
    });
    const msgBuffer = new TextEncoder().encode(payload);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return 'sha256-' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleCreateSystem = () => {
    if (!newSystemName.trim() || !newSystemDomain.trim()) return;
    const newManifest: Manifest = {
      id: Date.now().toString(),
      systemName: newSystemName.trim().replace(/\s+/g, '_'),
      ownerDomain: newSystemDomain.trim(),
      trainingSources: [],
      trainingRuns: [],
      businessRules: [],
      attested: false,
      ciSettings: { provider: 'none' }
    };
    setManifests(prev => [...prev, newManifest]);
    setSelectedManifestId(newManifest.id);
    setIsCreatingSystem(false);
    setNewSystemName('');
    setNewSystemDomain('');
  };

  const handleBindCI = (manifestId: string, provider: 'github' | 'jenkins' | 'none') => {
    setManifests(prev => prev.map(m => m.id === manifestId ? { ...m, ciSettings: { provider } } : m));
  };

  const handleSimulateCI = async (manifestId: string) => {
    setManifests(prev => prev.map(m => m.id === manifestId ? { ...m, ciSettings: { ...m.ciSettings!, lastRunStatus: 'running' } } : m));
    await new Promise(r => setTimeout(r, 2000));
    
    // Simulate a 10% realistic CI/CD failure rate
    const isFailure = Math.random() < 0.1;
    
    if (isFailure) {
       setManifests(prev => prev.map(m => m.id === manifestId ? { ...m, ciSettings: { ...m.ciSettings!, lastRunStatus: 'failure', lastRunAt: new Date().toISOString() } } : m));
       return;
    }

    const target = manifests.find(m => m.id === manifestId);
    if (!target) return;
    const signature = await generateStateHash(target);

    setManifests(prev => prev.map(m => 
      m.id === manifestId ? { 
        ...m, 
        attested: true,
        attestationSignature: signature,
        attestedAt: new Date().toISOString(),
        ciSettings: { ...m.ciSettings!, provider: m.ciSettings!.provider, lastRunStatus: 'success', lastRunAt: new Date().toISOString() }
      } : m
    ));
  };

  const handleAttest = async () => {
    if (!selectedManifest) return;
    setIsAttesting(true);
    
    setAttestationStep('Connecting to MLOps Pipeline...');
    await new Promise(r => setTimeout(r, 600));
    
    setAttestationStep('Computing Deterministic State Hash...');
    const signature = await generateStateHash(selectedManifest);
    await new Promise(r => setTimeout(r, 800));
    
    setAttestationStep('Securing Cryptographic Ledger...');
    await new Promise(r => setTimeout(r, 600));

    setManifests(prev => prev.map(m => 
      m.id === selectedManifest.id ? { 
        ...m, 
        attested: true,
        attestationSignature: signature,
        attestedAt: new Date().toISOString()
      } : m
    ));
    setIsAttesting(false);
    setAttestationStep('');
  };

  const handleAddSpecificItem = (type: 'trainingSources' | 'trainingRuns' | 'businessRules', text: string, clearText: () => void) => {
    if (!text.trim() || !selectedManifest || isAttesting) return;
    
    setManifests(prev => prev.map(m => {
      if (m.id === selectedManifest.id) {
        return {
          ...m,
          [type]: [...m[type], text.trim()],
          attested: false,
          detectedConflicts: undefined,
          systemPurpose: undefined,
          ciSettings: m.ciSettings ? { ...m.ciSettings, lastRunStatus: undefined } : undefined
        };
      }
      return m;
    }));
    clearText();
  };

  const handleAddItem = () => {
    if (!newItemText.trim() || !selectedManifest || isAttesting) return;
    
    setManifests(prev => prev.map(m => {
      if (m.id === selectedManifest.id) {
        return {
          ...m,
          [newItemType]: [...m[newItemType], newItemText.trim()],
          attested: false,
          detectedConflicts: undefined,
          systemPurpose: undefined,
          ciSettings: m.ciSettings ? { ...m.ciSettings, lastRunStatus: undefined } : undefined
        };
      }
      return m;
    }));
    setNewItemText('');
  };

  const handleRemoveItem = (type: 'trainingSources' | 'trainingRuns' | 'businessRules', index: number) => {
    if (!selectedManifest || isAttesting) return;
    
    setManifests(prev => prev.map(m => {
      if (m.id === selectedManifest.id) {
        const newArray = [...m[type]];
        newArray.splice(index, 1);
        return {
          ...m,
          [type]: newArray,
          attested: false,
          detectedConflicts: undefined,
          systemPurpose: undefined,
          ciSettings: m.ciSettings ? { ...m.ciSettings, lastRunStatus: undefined } : undefined
        };
      }
      return m;
    }));
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 1500);
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">
          Proprietary Intelligence Manifest
        </h2>
        <p className="text-lg text-slate-500 mt-2 leading-relaxed">
          Generate and manage a real-time manifest of proprietary intelligence assets for each agentic system. Enforce CI/CD pipeline attestation to cryptographically lock the manifest and prevent shadow-IT contamination.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* System Selector */}
        <div className="col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
            <Fingerprint className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Agentic Systems</h3>
          </div>
          <div className="p-4 space-y-2 flex-1 overflow-y-auto">
            {manifests.map(manifest => (
              <button
                key={manifest.id}
                onClick={() => setSelectedManifestId(manifest.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedManifestId === manifest.id
                    ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                    : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900">{manifest.systemName}</div>
                  <div className="flex items-center gap-2">
                    {!manifest.attested && manifest.attestationSignature && (
                      <span title="Modified since last attestation" className="flex items-center gap-1 text-[10px] uppercase font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        <AlertTriangle className="w-3 h-3" /> Out of Sync
                      </span>
                    )}
                    {manifest.attested && <Lock className="w-3 h-3 text-emerald-500" />}
                  </div>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Database className="w-3 h-3" /> {manifest.ownerDomain}
                </div>
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-slate-200 bg-slate-50/50">
            {!isCreatingSystem ? (
              <button 
                onClick={() => setIsCreatingSystem(true)}
                className="w-full py-2.5 flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Agentic System
              </button>
            ) : (
              <div className="space-y-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm animate-in slide-in-from-bottom-2 fade-in duration-200">
                <input 
                  type="text" 
                  placeholder="System Name (e.g. Risk_Parser)"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={newSystemName}
                  onChange={e => setNewSystemName(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Owner Domain (e.g. Legal Operations)"
                  className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={newSystemDomain}
                  onChange={e => setNewSystemDomain(e.target.value)}
                />
                <div className="flex gap-2 pt-1">
                  <button 
                    onClick={handleCreateSystem}
                    disabled={!newSystemName.trim() || !newSystemDomain.trim()}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white text-sm py-2 rounded-lg font-semibold transition-colors"
                  >
                    Create
                  </button>
                  <button 
                    onClick={() => {
                      setIsCreatingSystem(false);
                      setNewSystemName('');
                      setNewSystemDomain('');
                    }}
                    className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-sm py-2 rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Manifest Editor */}
        {selectedManifest && (
          <div className="col-span-1 lg:col-span-2 bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-800">
            <div className="bg-slate-950 border-b border-slate-800 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1 w-full sm:w-auto">
                <div className="flex items-center gap-3">
                  <FileCode className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold text-white">IP Manifest: {selectedManifest.systemName}</h3>
                </div>
                {selectedManifest.attested && !!selectedManifest.attestationSignature && (
                  <div className="flex items-center gap-3 ml-8 mt-1">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">
                      <CheckCircle className="w-3 h-3" /> Signed State
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]" title={selectedManifest.attestationSignature}>
                      {selectedManifest.attestationSignature}
                    </span>
                  </div>
                )}
                {!selectedManifest.attested && !!selectedManifest.attestationSignature && (
                  <div className="flex items-center gap-2 ml-8 mt-1">
                    <span className="text-[9px] font-bold text-amber-500 uppercase tracking-tighter bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Signature Invalidated
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 line-through truncate max-w-[150px]">
                      {selectedManifest.attestationSignature}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
                {!selectedManifest.attested && (
                  <button 
                    onClick={() => detectConflicts(selectedManifest.id)}
                    disabled={conflictMap[selectedManifest.id]}
                    className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-rose-500/20 transition-all"
                  >
                    <AlertOctagon className={`w-3.5 h-3.5 ${conflictMap[selectedManifest.id] ? 'animate-spin' : ''}`} />
                    {conflictMap[selectedManifest.id] ? 'Scanning...' : 'Integrity Scan'}
                  </button>
                )}
                {selectedManifest.attested ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-bold tracking-wider text-[10px] uppercase bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <Lock className="w-3 h-3" />
                    ATTESTED
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-1 w-full sm:w-auto">
                    <button 
                      onClick={handleAttest}
                      disabled={isAttesting}
                      className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 border border-slate-700"
                    >
                      <RefreshCw className={`w-4 h-4 ${isAttesting ? 'animate-spin' : ''}`} /> 
                      {isAttesting ? 'Hashing & Signing...' : 'Sync Pipeline Attestation'}
                    </button>
                    {isAttesting && (
                      <span className="text-[10px] text-emerald-400 font-mono animate-pulse w-full text-center sm:text-right">
                        {attestationStep}
                      </span>
                    )}
                  </div>
                )}
                <button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  <Download className="w-4 h-4" /> {isExporting ? 'Exporting...' : 'Export JSON'}
                </button>
                <button 
                  onClick={() => setExpandedSystemGraph(!expandedSystemGraph)}
                  className={`px-4 py-2 hover:bg-slate-800 rounded-lg text-indigo-400 transition-all flex items-center gap-2 text-sm font-semibold border border-slate-700 ${expandedSystemGraph ? 'bg-slate-800 border-indigo-500/50' : 'bg-slate-900'}`}
                >
                  <Network className="w-4 h-4" /> Dependency Graph
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-8 flex-1 overflow-y-auto relative">
              {/* Attestation Prominence Banner */}
              {selectedManifest.attested && selectedManifest.attestationSignature && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative group mb-8"
                >
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                  <div className="relative bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl overflow-hidden">
                    {/* Background Visuals */}
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <Lock className="w-32 h-32 text-emerald-400 rotate-12" />
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-inner">
                          <Fingerprint className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-black uppercase tracking-widest text-emerald-400">Verified Intelligence State</h4>
                            <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full shadow-[0_0_15px_rgba(16,185,129,0.3)]">SECURE</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <p className="text-xs text-slate-400 font-medium">This manifest is cryptographically locked and attested against corporate governance standards.</p>
                            <div className="flex items-center gap-4 mt-1">
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                                <Clock className="w-3 h-3" />
                                <span>Verified {new Date(selectedManifest.attestedAt!).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-emerald-500 font-mono">
                                <CheckCircle className="w-3 h-3" />
                                <span>Policy Compliant</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 min-w-0 md:w-1/3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">State Signature</span>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(selectedManifest.attestationSignature!);
                            }}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                          >
                            Copy Hash
                          </button>
                        </div>
                        <div className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl font-mono text-[10px] text-emerald-400/80 break-all leading-relaxed shadow-inner">
                          {selectedManifest.attestationSignature}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Invalidated State Warning */}
              {!selectedManifest.attested && selectedManifest.attestationSignature && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-8 flex items-center gap-5 shadow-lg"
                >
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-500 mb-0.5">Asset State Drift Detected</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">Changes have been detected in the system's intelligence assets since the last attestation on <span className="text-slate-300 font-semibold">{new Date(selectedManifest.attestedAt!).toLocaleString()}</span>. Re-attestation is required to maintain compliance.</p>
                  </div>
                </motion.div>
              )}

              {/* System Dependency Graph */}
              {expandedSystemGraph && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 mb-8 animate-in zoom-in-95 duration-200 overflow-hidden shadow-2xl relative">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-indigo-400 mb-1">System Asset Interdependencies</h4>
                      <p className="text-[10px] text-slate-500 font-mono italic">Topological mapping of training data, compute runs, and governing logic.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative group">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                          type="text" 
                          placeholder="Search nodes..."
                          className="pl-8 pr-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-300 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 w-32 md:w-48 transition-all"
                          value={graphSearchTerm}
                          onChange={e => setGraphSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      <div className="flex border border-slate-800 rounded-lg overflow-hidden">
                        <button 
                          onClick={() => setGraphLayout('hierarchical')}
                          className={`p-1.5 transition-colors ${graphLayout === 'hierarchical' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-900 text-slate-500 hover:text-slate-300'}`}
                          title="Hierarchical Layout"
                        >
                          <Layers className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setGraphLayout('grid')}
                          className={`p-1.5 transition-colors ${graphLayout === 'grid' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-900 text-slate-500 hover:text-slate-300'}`}
                          title="Grid Layout"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setGraphLayout('force')}
                          className={`p-1.5 transition-colors ${graphLayout === 'force' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-900 text-slate-500 hover:text-slate-300'}`}
                          title="Force-Directed Layout"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setGraphLayout('radial')}
                          className={`p-1.5 transition-colors ${graphLayout === 'radial' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-900 text-slate-500 hover:text-slate-300'}`}
                          title="Radial Layout"
                        >
                          <Orbit className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {analyzingGraphMap[selectedManifest.id] && (
                        <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase animate-pulse">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Analyzing...
                        </div>
                      )}
                      <button 
                        onClick={() => analyzeDependencies(selectedManifest.id)}
                        className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3 h-3" /> Refresh Analysis
                      </button>
                    </div>
                  </div>

                  {analyzingGraphMap[selectedManifest.id] ? (
                    <div className="h-[500px] flex flex-col items-center justify-center gap-4">
                      <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                      <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Generating Dependency Matrix...</div>
                    </div>
                  ) : (
                    <div ref={graphContainerRef} className="relative h-[500px] py-8 overflow-hidden rounded-xl bg-slate-950/20 border border-slate-800/30">
                      {/* SVG Link Layer */}
                      <svg className="absolute inset-0 pointer-events-none w-full h-full">
                        <defs>
                          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="22" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#475569" opacity="0.5" />
                          </marker>
                        </defs>
                        {selectedManifest.dependencyGraph?.links.map((link, idx) => {
                          const fromPos = nodePositions[link.from];
                          const toPos = nodePositions[link.to];
                          if (!fromPos || !toPos) return null;
                          
                          const isActive = link.from.toLowerCase().includes(graphSearchTerm.toLowerCase()) || 
                                           link.to.toLowerCase().includes(graphSearchTerm.toLowerCase());

                          return (
                            <motion.line
                              key={`${link.from}-${link.to}-${idx}`}
                              initial={{ pathLength: 0, opacity: 0 }}
                              animate={{ pathLength: 1, opacity: isActive ? 1 : 0.2 }}
                              x1={fromPos.x}
                              y1={fromPos.y}
                              x2={toPos.x}
                              y2={toPos.y}
                              stroke={isActive ? "#6366f1" : "#475569"}
                              strokeWidth={isActive ? 2 : 1}
                              markerEnd="url(#arrowhead)"
                            />
                          );
                        })}
                      </svg>

                      {/* Nodes Layer */}
                      {selectedManifest.dependencyGraph?.nodes.map((node, nIdx) => {
                        const pos = nodePositions[node.id];
                        if (!pos) return null;

                        const isSearching = graphSearchTerm.trim() !== '';
                        const matchesSearch = node.label.toLowerCase().includes(graphSearchTerm.toLowerCase()) || 
                                              node.type.toLowerCase().includes(graphSearchTerm.toLowerCase());
                        
                        if (isSearching && !matchesSearch) return null;

                        return (
                          <motion.div 
                            key={node.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ 
                              opacity: 1, 
                              scale: 1,
                              x: pos.x - 100, // offset by half width to center
                              y: pos.y - 25   // offset by half height to center
                            }}
                            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                            className="absolute z-20"
                            style={{ width: 200 }}
                          >
                            <div className={`bg-slate-900 border p-3 rounded-xl flex items-center gap-3 shadow-xl transition-all hover:ring-2 relative ${
                              node.type === 'source' ? 'border-blue-500/30 hover:ring-blue-400/30' :
                              node.type === 'run' ? 'border-indigo-500/30 hover:ring-indigo-400/30' :
                              'border-emerald-500/30 hover:ring-emerald-400/30'
                            }`}>
                              {node.type === 'source' ? <Database className="w-5 h-5 text-blue-400" /> :
                               node.type === 'run' ? <Play className="w-5 h-5 text-indigo-400" /> :
                               <ShieldCheck className="w-5 h-5 text-emerald-400" />}
                              <div className="flex flex-col min-w-0 pr-2">
                                <span className={`text-[9px] font-black uppercase tracking-tight leading-none mb-1 ${
                                  node.type === 'source' ? 'text-blue-500' :
                                  node.type === 'run' ? 'text-indigo-400' :
                                  'text-emerald-400'
                                }`}>{node.type}</span>
                                <span className="text-[11px] font-mono text-slate-100 truncate">{node.label}</span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}

                      {graphSearchTerm && selectedManifest.dependencyGraph?.nodes.filter(n => n.label.toLowerCase().includes(graphSearchTerm.toLowerCase())).length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3">
                          <Search className="w-8 h-8 opacity-20" />
                          <p className="text-sm italic">No nodes matching "{graphSearchTerm}"</p>
                        </div>
                      )}

                      {/* Visual Mesh Background */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden -z-10">
                        <svg className="w-full h-full opacity-5">
                          <pattern id="graph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-slate-700" />
                          </pattern>
                          <rect width="100%" height="100%" fill="url(#graph-grid)" />
                        </svg>
                      </div>
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between">
                     <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.5)]"></div>
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ingestion</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]"></div>
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Distillation</span>
                        </div>
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 rounded bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enforcement</span>
                        </div>
                     </div>
                     <button 
                       onClick={() => setExpandedSystemGraph(false)}
                       className="text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors"
                     >
                       Close Topology
                     </button>
                  </div>
                </div>
              )}

              {/* AI Purpose Summary */}
              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/50"></div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4" /> Synthesized System Purpose
                  </h4>
                  <button 
                    onClick={() => generatePurpose(selectedManifest.id)} 
                    disabled={generatingMap[selectedManifest.id]} 
                    className="text-slate-500 hover:text-indigo-400 transition-colors disabled:opacity-50"
                    title="Regenerate from current assets"
                  >
                    <RefreshCw className={`w-3 h-3 ${generatingMap[selectedManifest.id] ? 'animate-spin text-indigo-400' : ''}`} />
                  </button>
                </div>
                {generatingMap[selectedManifest.id] ? (
                  <div className="text-sm text-slate-400 font-mono animate-pulse">
                    Integrating topological context via LLM synthesis...
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={editingPurpose}
                      onChange={(e) => setEditingPurpose(e.target.value)}
                      className="w-full bg-transparent border-none text-sm text-slate-300 leading-relaxed outline-none focus:ring-0 resize-none p-0 min-h-[60px]"
                      placeholder="System purpose is awaiting synthesis or manual entry..."
                    />
                    <div className="flex items-center justify-end gap-2 text-[9px] font-bold uppercase tracking-widest">
                      {saveStatus === 'saving' && (
                        <span className="text-indigo-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                        </span>
                      )}
                      {saveStatus === 'saved' && (
                        <span className="text-emerald-500 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Saved
                        </span>
                      )}
                      {saveStatus === 'error' && (
                        <span className="text-rose-500 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Error saving.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Conflict Detection UI */}
              {conflictMap[selectedManifest.id] && (
                <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                  <AlertOctagon className="w-5 h-5 text-rose-500/50" />
                  <span className="text-sm text-rose-400/70 font-mono">Scanning asset topology for logical contradictions...</span>
                </div>
              )}
              {!conflictMap[selectedManifest.id] && selectedManifest.detectedConflicts && selectedManifest.detectedConflicts.length === 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Zero Logical Conflicts Detected</span>
                  </div>
                  <button 
                    onClick={() => detectConflicts(selectedManifest.id)}
                    className="text-slate-500 hover:text-emerald-400 transition-colors"
                    title="Run conflict scan again"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {!conflictMap[selectedManifest.id] && selectedManifest.detectedConflicts && selectedManifest.detectedConflicts.length > 0 && (
                <div className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                      <AlertOctagon className="w-4 h-4" /> Logical Conflicts Detected
                    </h4>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setIsConfiguringSeverities(!isConfiguringSeverities)}
                        className={`text-slate-500 hover:text-indigo-400 transition-colors p-1 rounded hover:bg-slate-700/50 ${isConfiguringSeverities ? 'text-indigo-400 bg-slate-700/50' : ''}`}
                        title="Configure Risk Matrix"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => detectConflicts(selectedManifest.id)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1 rounded hover:bg-slate-700/50"
                        title="Run conflict scan again"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Severity Configuration Panel */}
                  {isConfiguringSeverities && (
                    <div className="mb-6 bg-slate-900 border border-slate-700 p-4 rounded-xl animate-in slide-in-from-top-2 fade-in">
                      <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-indigo-400" /> Risk Assessment Configuration
                      </h5>
                      <p className="text-xs text-slate-400 mb-4">Define custom severities. These definitions are passed directly to the AI agent to calibrate its severity assignments.</p>
                      
                      <div className="space-y-2 mb-4">
                        {severities.map((sev) => (
                          <div key={sev.id} className="flex items-start justify-between bg-slate-800 p-3 rounded-lg border border-slate-700">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${SEVERITY_COLORS[sev.color]}`}>
                                  {sev.name}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed">{sev.impact}</p>
                            </div>
                            <button 
                              onClick={() => setSeverities(prev => prev.filter(s => s.id !== sev.id))}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              disabled={severities.length === 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {newSevMode ? (
                        <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 space-y-3">
                          <input 
                            placeholder="Severity Name (e.g., Extreme, Blocked)"
                            className="w-full bg-slate-900 border border-slate-700 text-sm text-slate-200 rounded p-2 outline-none focus:border-indigo-500"
                            value={newSevMode.name || ''}
                            onChange={e => setNewSevMode(prev => ({ ...prev!, name: e.target.value }))}
                          />
                          <input 
                            placeholder="Impact Definition (e.g., Immediate cease and desist)"
                            className="w-full bg-slate-900 border border-slate-700 text-sm text-slate-200 rounded p-2 outline-none focus:border-indigo-500"
                            value={newSevMode.impact || ''}
                            onChange={e => setNewSevMode(prev => ({ ...prev!, impact: e.target.value }))}
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Color:</span>
                            {(['rose', 'amber', 'emerald', 'blue', 'purple', 'slate'] as const).map(color => (
                              <button 
                                key={color}
                                onClick={() => setNewSevMode(prev => ({ ...prev!, color }))}
                                className={`w-5 h-5 rounded-full border-2 transition-all ${newSevMode.color === color ? 'border-indigo-400 scale-110' : 'border-transparent opacity-50 hover:opacity-100'} ${color === 'rose' ? 'bg-rose-500' : color === 'amber' ? 'bg-amber-500' : color === 'emerald' ? 'bg-emerald-500' : color === 'blue' ? 'bg-blue-500' : color === 'purple' ? 'bg-purple-500' : 'bg-slate-500'}`}
                              />
                            ))}
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button 
                              onClick={() => {
                                if (newSevMode.name && newSevMode.impact && newSevMode.color) {
                                  setSeverities(prev => [...prev, { id: `sev-${Date.now()}`, name: newSevMode.name!, impact: newSevMode.impact!, color: newSevMode.color! as any }]);
                                  setNewSevMode(null);
                                }
                              }}
                              className="text-xs font-semibold px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors"
                            >
                              Add Definition
                            </button>
                            <button 
                              onClick={() => setNewSevMode(null)}
                              className="text-xs font-semibold px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setNewSevMode({ color: 'purple' })}
                          className="w-full py-2 border border-dashed border-slate-700 text-slate-400 hover:text-slate-300 hover:bg-slate-800 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Add Custom Severity
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Filters */}
                  <div className="flex flex-wrap gap-2 mb-4 bg-slate-900/50 p-2 rounded-lg border border-slate-800">
                    <span className="text-[10px] uppercase font-bold text-slate-500 flex items-center px-2">Filter By:</span>
                    
                    <select 
                      className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 outline-none focus:border-indigo-500"
                      value={conflictSeverityFilter || ''}
                      onChange={e => setConflictSeverityFilter(e.target.value || null)}
                    >
                      <option value="">All Severities</option>
                      {severities.map(sev => (
                        <option key={sev.id} value={sev.name}>{sev.name}</option>
                      ))}
                    </select>

                    <select 
                      className="bg-slate-800 border border-slate-700 text-xs text-slate-300 rounded px-2 py-1 outline-none focus:border-indigo-500"
                      value={conflictTypeFilter || ''}
                      onChange={e => setConflictTypeFilter(e.target.value || null)}
                    >
                      <option value="">All Types</option>
                      <option value="Data Source vs. Rule">Data Source vs. Rule</option>
                      <option value="Rule Ambiguity">Rule Ambiguity</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <ul className="space-y-3">
                    {selectedManifest.detectedConflicts
                      .filter(c => !c.resolved)
                      .filter(c => !conflictSeverityFilter || c.severity === conflictSeverityFilter)
                      .filter(c => !conflictTypeFilter || c.type === conflictTypeFilter)
                      .map((conflict) => {
                        const matchedSev = severities.find(s => s.name === conflict.severity);
                        const SevColorClass = matchedSev ? SEVERITY_COLORS[matchedSev.color] : SEVERITY_COLORS.slate;
                        
                        return (
                          <li key={conflict.id} className="bg-rose-500/5 border border-rose-500/10 p-3 rounded-lg flex flex-col gap-2 transition-all group">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${SevColorClass}`} title={matchedSev?.impact}>
                                  {conflict.severity}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${
                                  conflict.type === 'Rule Ambiguity' 
                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' 
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}>
                                  {conflict.type === 'Rule Ambiguity' && <HelpCircle className="w-2.5 h-2.5" />}
                                  {conflict.type}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => setExpandedConflictMaps(prev => ({ ...prev, [conflict.id]: !prev[conflict.id] }))}
                                  className={`px-2 py-1 hover:bg-slate-800 border border-slate-700/50 rounded text-indigo-400 transition-all flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${expandedConflictMaps[conflict.id] ? 'bg-slate-800 border-indigo-500/50' : 'opacity-70 hover:opacity-100'}`}
                                  title="Visualize Asset Topology"
                                >
                                  <Network className="w-3.5 h-3.5" /> Visualize Asset Topology
                                </button>
                                <button 
                                  onClick={() => setResolvingConflictId(conflict.id)}
                                  className="text-[10px] uppercase font-bold text-slate-500 hover:text-emerald-400 flex items-center gap-1 transition-colors bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded"
                                >
                                  <CheckCircle className="w-3 h-3" /> Resolve
                                </button>
                              </div>
                            </div>
                            
                            <div>
                              <span className="text-sm text-slate-300 leading-relaxed block pl-1">
                                {conflict.description}
                              </span>
                              {matchedSev && (
                                <p className="text-[10px] text-slate-500 italic pl-1 mt-1">Impact: {matchedSev.impact}</p>
                              )}
                            </div>

                            {conflict.type === 'Rule Ambiguity' && (conflict.example || conflict.suggestion) && (
                              <div className="mt-2 ml-1 p-2 bg-slate-900/50 rounded border border-slate-700/50 space-y-2">
                                {conflict.example && (
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    <span className="text-amber-500 font-bold uppercase mr-2">Example Trap:</span>
                                    {conflict.example}
                                  </div>
                                )}
                                {conflict.suggestion && (
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    <span className="text-emerald-500 font-bold uppercase mr-2">Suggested Correction:</span>
                                    <span className="text-emerald-400/90 italic">"{conflict.suggestion}"</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {expandedConflictMaps[conflict.id] && (
                              <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden">
                                <div className="flex items-center justify-between mb-6">
                                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Asset Conflict Topology</div>
                                  <div className="flex items-center gap-2">
                                     <span className="text-[10px] text-slate-500">Integrity Impact:</span>
                                     <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full transition-all duration-1000 ${
                                            (conflict.impactScore || 50) > 70 ? 'bg-rose-500' : 
                                            (conflict.impactScore || 50) > 30 ? 'bg-amber-500' : 'bg-emerald-500'
                                          }`}
                                          style={{ width: `${conflict.impactScore || 50}%` }}
                                        />
                                     </div>
                                     <span className={`text-[10px] font-bold ${
                                        (conflict.impactScore || 50) > 70 ? 'text-rose-400' : 
                                        (conflict.impactScore || 50) > 30 ? 'text-amber-400' : 'text-emerald-400'
                                     }`}>
                                        {conflict.impactScore || 50}%
                                     </span>
                                  </div>
                                </div>

                                <div className="relative flex flex-col items-center gap-12 py-6">
                                  {/* Involved Assets Row */}
                                  <div className="flex flex-wrap justify-center gap-4 relative z-10 px-4">
                                    {(conflict.involvedAssets || ['Primary Asset Index']).map((asset, aidx) => (
                                      <div key={aidx} className="flex flex-col items-center group/asset relative">
                                         <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg flex items-center gap-2 shadow-lg group-hover/asset:border-indigo-500/60 group-hover/asset:shadow-indigo-500/10 transition-all transform group-hover/asset:-translate-y-1">
                                            {asset.includes('run') ? <Play className="w-3.5 h-3.5 text-indigo-400" /> : 
                                             asset.includes('Rule') || asset.length > 30 ? <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> : 
                                             <Database className="w-3.5 h-3.5 text-blue-400" />}
                                            <span className="text-[10px] font-mono text-slate-300 max-w-[140px] truncate">{asset}</span>
                                         </div>
                                         {/* Hover Tooltip */}
                                         <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 p-2 rounded text-[9px] text-slate-200 w-32 opacity-0 group-hover/asset:opacity-100 transition-opacity pointer-events-none z-30 shadow-2xl">
                                           <div className="font-bold text-indigo-400 mb-0.5">Asset Link identified</div>
                                           <div className="text-slate-400 leading-tight">Integrity compromise risk: {Math.floor((conflict.impactScore || 50) * 0.8)}%</div>
                                         </div>
                                         <div className="h-10 w-px bg-gradient-to-b from-slate-700 to-transparent"></div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Conflict Hub */}
                                  <div className="relative flex flex-col items-center">
                                     {/* Animated Connecting Mesh */}
                                     <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[120%] flex justify-center pointer-events-none overflow-hidden h-16">
                                        <div className="w-full max-w-[90%] h-32 border-rose-500/30 border-t-2 border-x-2 rounded-t-[100px] animate-pulse"></div>
                                     </div>

                                     <div className={`p-6 rounded-3xl border-2 ${SevColorClass} shadow-[0_0_30px_rgba(244,63,94,0.1)] relative z-10 flex flex-col items-center gap-3 max-w-[240px] text-center bg-slate-950 group/hub transition-all hover:scale-105`}>
                                        <div className="absolute inset-0 bg-rose-500/5 blur-2xl rounded-full opacity-0 group-hover/hub:opacity-100 transition-opacity"></div>
                                        <AlertOctagon className="w-8 h-8 text-rose-500 animate-bounce" />
                                        <div className="flex flex-col">
                                          <div className="text-[11px] font-black uppercase tracking-tighter text-slate-100">Deterministic Logic Collision</div>
                                          <div className="text-[9px] text-slate-500 font-mono mt-1 px-2 line-clamp-2">Scope influence: {conflict.involvedAssets?.length || 1} asset paths identified in contradiction</div>
                                        </div>
                                        
                                        {/* Score Breakdown Tooltip on Hub Hover */}
                                        <div className="absolute -top-16 left-full ml-4 bg-slate-900 border border-slate-800 p-3 rounded-xl w-40 opacity-0 group-hover/hub:opacity-100 transition-all translate-x-4 group-hover/hub:translate-x-0 shadow-2xl z-40 text-left">
                                          <h6 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-800 pb-1">Impact Analysis</h6>
                                          <ul className="space-y-1.5">
                                            <li className="flex justify-between text-[8px]">
                                              <span className="text-slate-500">Integrity Loss:</span>
                                              <span className="text-rose-400">-{Math.floor((conflict.impactScore || 50) * 0.6)}%</span>
                                            </li>
                                            <li className="flex justify-between text-[8px]">
                                              <span className="text-slate-500">Compliance Risk:</span>
                                              <span className="text-amber-400">Critical</span>
                                            </li>
                                            <li className="flex justify-between text-[8px]">
                                              <span className="text-slate-500">Remedial Cost:</span>
                                              <span className="text-blue-400">~12.5h</span>
                                            </li>
                                          </ul>
                                        </div>
                                     </div>

                                     <div className="h-10 w-px bg-gradient-to-b from-rose-500/40 to-transparent mt-4 relative">
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-rose-500/20 blur-md rounded-full"></div>
                                     </div>
                                     
                                     <div className="bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 shadow-lg">
                                        <GitMerge className="w-3.5 h-3.5 text-rose-500" /> System Integrity Delta Measured
                                     </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {resolvingConflictId === conflict.id && (
                              <div className="mt-3 bg-slate-900/80 border border-slate-700 p-3 rounded-lg animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Resolution Justification</label>
                                <textarea
                                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-emerald-500 resize-none"
                                  rows={2}
                                  placeholder="Why is this conflict functionally acceptable? Provide override justification..."
                                  value={justificationText}
                                  onChange={(e) => setJustificationText(e.target.value)}
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                  <button 
                                    className="text-xs text-slate-500 hover:text-slate-300 px-2 py-1"
                                    onClick={() => { setResolvingConflictId(null); setJustificationText(''); }}
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    disabled={!justificationText.trim()}
                                    className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-3 py-1 rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    onClick={() => handleResolveConflict(selectedManifest.id, conflict.id, justificationText)}
                                  >
                                    Commit Resolution
                                  </button>
                                </div>
                              </div>
                            )}
                          </li>
                        )
                      })}
                    {selectedManifest.detectedConflicts.filter(c => !c.resolved && (!conflictSeverityFilter || c.severity === conflictSeverityFilter) && (!conflictTypeFilter || c.type === conflictTypeFilter)).length === 0 && (
                      <div className="text-sm text-slate-500 italic p-2 text-center">No conflicts match the selected filters.</div>
                    )}
                  </ul>

                  {/* Resolved Conflicts Section */}
                  {selectedManifest.detectedConflicts.filter(c => c.resolved).length > 0 && (
                    <div className="mt-6 border-t border-slate-700/50 pt-4">
                      <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-slate-500" /> Resolved Overrides ({selectedManifest.detectedConflicts.filter(c => c.resolved).length})
                      </h5>
                      <ul className="space-y-2 opacity-60 hover:opacity-100 transition-opacity">
                        {selectedManifest.detectedConflicts.filter(c => c.resolved).map(conflict => (
                          <li key={conflict.id} className="bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-slate-400 px-2 py-0.5 rounded">
                                {conflict.severity}
                              </span>
                              <span className="text-xs text-slate-400 line-through truncate flex-1">{conflict.description}</span>
                            </div>
                            <div className="bg-slate-900/50 rounded p-2 border-l-2 border-emerald-500/30 text-xs text-slate-400 font-mono italic">
                              <span className="text-emerald-500/50 mr-2 font-bold not-italic">Justification:</span>
                              {conflict.justification}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Export Overlay Simulation */}
              {isExporting && (
                <div className="absolute inset-0 z-10 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
                  <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-2xl max-w-md w-full">
                    <h4 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                      <Fingerprint className="w-5 h-5" /> Clean-Room Export Generated
                    </h4>
                    <pre className="bg-slate-950 p-4 rounded-xl text-xs text-slate-300 font-mono overflow-x-auto">
                      {JSON.stringify(selectedManifest, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Training Sources */}
              <section>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4" /> Training Data Sources
                </h4>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add new data source..."
                      className="flex-1 p-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      value={newSourceText}
                      onChange={e => setNewSourceText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddSpecificItem('trainingSources', newSourceText, () => setNewSourceText(''))}
                      disabled={isAttesting || selectedManifest.attested}
                    />
                    <button 
                      onClick={() => handleAddSpecificItem('trainingSources', newSourceText, () => setNewSourceText(''))}
                      disabled={!newSourceText.trim() || isAttesting || selectedManifest.attested}
                      className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
                      title="Add Data Source"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedManifest.trainingSources.map((source, idx) => (
                    <div key={idx} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg group">
                        <span className="text-sm text-slate-300 font-mono flex items-center gap-2 break-all pr-2">
                          {source}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <button 
                            onClick={() => setExpandedLineage(prev => ({ ...prev, [source]: !prev[source] }))}
                            className={`opacity-0 group-hover:opacity-100 px-2 py-1 hover:bg-slate-700 rounded text-indigo-400 transition-all flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${expandedLineage[source] ? 'opacity-100 bg-slate-700' : ''}`}
                            title="View Data Lineage"
                          >
                            <GitCommit className="w-3 h-3" /> Lineage
                          </button>
                          <button 
                            onClick={() => handleRemoveItem('trainingSources', idx)} 
                            disabled={isAttesting || selectedManifest.attested}
                            className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {/* Lineage View UI */}
                      {expandedLineage[source] && (
                        <div className="ml-4 pl-4 border-l-2 border-indigo-500/30 py-4 space-y-6 animate-in slide-in-from-top-2 fade-in relative mb-4">
                          {(() => {
                            const lineage = simulateLineage(source, selectedManifest.id);
                            const getIcon = (iconName: string) => {
                              switch(iconName) {
                                case 'Lock': return <Lock className="w-4 h-4 text-rose-400" />;
                                case 'RefreshCw': return <RefreshCw className="w-4 h-4 text-emerald-400" />;
                                case 'Activity': return <Activity className="w-4 h-4 text-blue-400" />;
                                case 'ListFilter': return <ListFilter className="w-4 h-4 text-indigo-400" />;
                                case 'ShieldCheck': return <ShieldCheck className="w-4 h-4 text-emerald-400" />;
                                case 'Fingerprint': return <Fingerprint className="w-4 h-4 text-amber-400" />;
                                case 'Settings': return <Settings className="w-4 h-4 text-slate-400" />;
                                case 'GitMerge': return <GitMerge className="w-4 h-4 text-purple-400" />;
                                default: return <Filter className="w-4 h-4 text-indigo-400" />;
                              }
                            };
                            
                            return (
                              <>
                                {/* Pipeline Pipeline Metrics */}
                                <div className="bg-slate-950/50 border border-slate-800 p-3 rounded-xl flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-4">
                                    <div>
                                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Integrity Rank</div>
                                      <div className="text-sm font-black text-emerald-400">{lineage.integrityScore}%</div>
                                    </div>
                                    <div className="h-6 w-px bg-slate-800"></div>
                                    <div>
                                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Completeness</div>
                                      <div className="text-sm font-black text-blue-400">{lineage.completeness}%</div>
                                    </div>
                                    <div className="h-6 w-px bg-slate-800"></div>
                                    <div>
                                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Freshness</div>
                                      <div className="text-sm font-black text-amber-400">{lineage.freshness}</div>
                                    </div>
                                  </div>
                                  <div className="flex -space-x-2">
                                    {lineage.transforms.map((_, i) => (
                                      <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-[8px] font-bold text-slate-500">
                                        {i + 1}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* State 0: Origin */}
                                <div className="flex items-start gap-3 relative">
                                  <div className="absolute -left-[25px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-slate-400 bg-slate-900 shadow-[0_0_8px_rgba(148,163,184,0.3)]" />
                                  <div className="bg-slate-800 p-2 rounded-lg border border-slate-700 mt-0.5 shadow-inner">
                                    <Database className="w-4 h-4 text-slate-400" />
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Source System Origin</div>
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                        lineage.confidentiality === 'Highly Confidential' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                                        lineage.confidentiality === 'Restricted' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                      }`}>
                                        {lineage.confidentiality}
                                      </span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-100">{lineage.origin}</div>
                                    <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1.5">
                                      <Fingerprint className="w-3 h-3" /> Steward: {lineage.steward}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Transformation Pipeline */}
                                {lineage.transforms.map((t, i) => (
                                  <div key={i} className="flex items-start gap-3 relative group/step">
                                    <div className="absolute -left-[25px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-indigo-500 bg-slate-900 group-hover/step:bg-indigo-500 transition-colors shadow-[0_0_8px_rgba(99,102,241,0.3)]" />
                                    <div className={`p-2 rounded-lg border mt-0.5 shadow-inner transition-colors ${
                                      t.icon === 'Lock' ? 'bg-rose-500/10 border-rose-500/20 group-hover/step:border-rose-500/40' :
                                      t.icon === 'RefreshCw' ? 'bg-emerald-500/10 border-emerald-500/20 group-hover/step:border-emerald-500/40' :
                                      'bg-indigo-500/10 border-indigo-500/20 group-hover/step:border-indigo-500/40'
                                    }`}>
                                      {getIcon(t.icon)}
                                    </div>
                                    <div className="flex-1 bg-slate-800/30 p-3 rounded-xl border border-slate-700/30 hover:border-indigo-500/20 transition-colors">
                                      <div className="flex items-center justify-between mb-1">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Step {i+1}: {t.name}</div>
                                        <div className="flex items-center gap-2">
                                          <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'Success' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                                          <div className="text-[9px] font-mono text-slate-500">{t.timestamp}</div>
                                        </div>
                                      </div>
                                      <div className="text-xs font-medium text-slate-300 leading-relaxed mb-3">{t.detail}</div>
                                      <div className="grid grid-cols-3 gap-2 mb-3">
                                        <div className="bg-slate-900/50 p-1.5 rounded border border-slate-700/50">
                                          <div className="text-[8px] uppercase text-slate-500 font-bold">Input Rows</div>
                                          <div className="text-[10px] font-mono text-slate-300">{t.rowsIn}</div>
                                        </div>
                                        <div className="bg-slate-900/50 p-1.5 rounded border border-slate-700/50">
                                          <div className="text-[8px] uppercase text-slate-500 font-bold">Output Rows</div>
                                          <div className="text-[10px] font-mono text-slate-300">{t.rowsOut}</div>
                                        </div>
                                        <div className="bg-slate-900/50 p-1.5 rounded border border-slate-700/50">
                                          <div className="text-[8px] uppercase text-slate-500 font-bold">Latency</div>
                                          <div className="text-[10px] font-mono text-slate-300">{t.latency}</div>
                                        </div>
                                      </div>
                                      <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between">
                                        <div className="text-[9px] text-slate-600 font-mono italic">Engine: {t.tool}</div>
                                        <div className="flex gap-1 text-[8px] font-black uppercase text-indigo-500/50 tracking-tighter">
                                          Trace: {Math.random().toString(36).substring(2, 8)}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                
                                {/* Final State: Target Asset */}
                                <div className="flex items-start gap-3 relative">
                                  <div className="absolute -left-[25px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-emerald-400 bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]" />
                                  <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 mt-0.5 shadow-inner">
                                    <FileCode className="w-4 h-4 text-emerald-400" />
                                  </div>
                                  <div className="flex-1 bg-emerald-500/5 border border-emerald-500/10 p-3 rounded-xl">
                                    <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/80 mb-1">Training Distribution Asset</div>
                                    <div className="text-xs font-mono font-bold text-emerald-300 break-all leading-tight">
                                      {source}
                                    </div>
                                    <div className="mt-2 flex items-center gap-4">
                                      <div className="flex items-center gap-1.5 text-[9px] text-emerald-500/60 uppercase font-black tracking-tighter">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        Active in Index
                                      </div>
                                      <div className="text-[9px] text-slate-600">Integrity Check: sha256:verified</div>
                                    </div>
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Training Runs */}
              <section>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Play className="w-4 h-4" /> Specific Training Runs
                </h4>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Add new training run..."
                      className="flex-1 p-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      value={newRunText}
                      onChange={e => setNewRunText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddSpecificItem('trainingRuns', newRunText, () => setNewRunText(''))}
                      disabled={isAttesting || selectedManifest.attested}
                    />
                    <button 
                      onClick={() => handleAddSpecificItem('trainingRuns', newRunText, () => setNewRunText(''))}
                      disabled={!newRunText.trim() || isAttesting || selectedManifest.attested}
                      className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 text-white rounded-lg transition-colors flex items-center justify-center shrink-0"
                      title="Add Training Run"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {selectedManifest.trainingRuns.map((run, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg group">
                      <span className="text-sm text-slate-300 font-mono">{run}</span>
                      <button 
                        onClick={() => handleRemoveItem('trainingRuns', idx)} 
                        disabled={isAttesting || selectedManifest.attested}
                        className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Business Rules */}
              <section>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Hardcoded Business Rules
                </h4>
                <div className="space-y-2">
                  {selectedManifest.businessRules.map((rule, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg group">
                      <span className="text-sm text-slate-300">{rule}</span>
                      <button 
                        onClick={() => handleRemoveItem('businessRules', idx)} 
                        disabled={isAttesting || selectedManifest.attested}
                        className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity disabled:hidden"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Add New Item */}
              <div className={`pt-6 border-t border-slate-800 transition-opacity ${(isAttesting || selectedManifest.attested) ? 'opacity-50 pointer-events-none' : ''}`}>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Add Manual Asset Entry</h4>
                <div className="flex gap-3">
                  <select 
                    className="p-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    value={newItemType}
                    onChange={e => setNewItemType(e.target.value as any)}
                    disabled={isAttesting || selectedManifest.attested}
                  >
                    <option value="trainingSources">Training Source</option>
                    <option value="trainingRuns">Training Run</option>
                    <option value="businessRules">Business Rule</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Enter asset details..."
                    className="flex-1 p-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    value={newItemText}
                    onChange={e => setNewItemText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddItem()}
                    disabled={isAttesting || selectedManifest.attested}
                  />
                  <button 
                    onClick={handleAddItem}
                    disabled={isAttesting || selectedManifest.attested}
                    className="px-4 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-colors flex items-center justify-center shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {newItemType === 'businessRules' && ruleValidationFeedback && (
                  <div className={`mt-3 flex flex-col gap-2 text-xs p-3 rounded-lg w-full transition-all duration-300 ${
                    ruleValidationFeedback.status === 'validating' ? 'text-slate-400 bg-slate-800 border border-slate-700' :
                    ruleValidationFeedback.status === 'valid' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' :
                    ruleValidationFeedback.status === 'ambiguous' ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' :
                    'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                  }`}>
                    <div className="flex items-center gap-2">
                      {ruleValidationFeedback.status === 'validating' && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                      {ruleValidationFeedback.status === 'valid' && <CheckCircle className="w-4 h-4 shrink-0" />}
                      {ruleValidationFeedback.status === 'ambiguous' && <AlertTriangle className="w-4 h-4 shrink-0" />}
                      {ruleValidationFeedback.status === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
                      <span className="font-medium text-sm">{ruleValidationFeedback.message}</span>
                    </div>

                    {(ruleValidationFeedback.example || ruleValidationFeedback.suggestion) && ruleValidationFeedback.status !== 'validating' && (
                      <div className="mt-2 pl-6 space-y-3">
                        {ruleValidationFeedback.example && (
                          <div className="opacity-80">
                            <span className="font-bold uppercase tracking-wider text-[10px] block mb-1">Why it's problematic:</span>
                            <span className="italic">{ruleValidationFeedback.example}</span>
                          </div>
                        )}
                        {ruleValidationFeedback.suggestion && (
                          <div>
                            <span className="font-bold uppercase tracking-wider text-[10px] block mb-1 opacity-80">Suggested Phrasing:</span>
                            <button 
                              onClick={() => {
                                setNewItemText(ruleValidationFeedback.suggestion!);
                                setRuleValidationFeedback({ status: 'validating', message: 'Re-evaluating...' });
                              }}
                              className="text-left bg-slate-900 border border-slate-700 hover:border-indigo-500 px-3 py-2 rounded text-slate-300 hover:text-indigo-300 transition-colors w-full break-normal shadow-sm"
                            >
                              "{ruleValidationFeedback.suggestion}"
                            </button>
                            <span className="text-[10px] text-slate-500 italic mt-1 block">Click to apply this fix</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CI/CD Pipeline Integration */}
              <section className={`pt-6 border-t border-slate-800 transition-opacity ${(isAttesting || selectedManifest.attested) ? 'opacity-50 pointer-events-none' : ''}`}>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Webhook className="w-4 h-4" /> CI/CD DevSecOps Pipeline Integration
                </h4>
                {(!selectedManifest.ciSettings || selectedManifest.ciSettings.provider === 'none') ? (
                  <div className="bg-slate-800/30 border border-slate-700/50 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <h5 className="text-sm font-semibold text-white">Pipeline Unbound</h5>
                      <p className="text-xs text-slate-400 mt-1">Bind this manifest to an external orchestration tool.</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleBindCI(selectedManifest.id, 'github')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs text-slate-300 font-semibold rounded-lg transition-colors">GitHub Actions</button>
                      <button onClick={() => handleBindCI(selectedManifest.id, 'jenkins')} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs text-slate-300 font-semibold rounded-lg transition-colors">Jenkins</button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <Terminal className="w-5 h-5 text-indigo-400" />
                        <div>
                          <h5 className="text-sm font-bold text-white capitalize">{selectedManifest.ciSettings.provider} Integration Active</h5>
                          <div className="flex flex-col gap-0.5">
                            <p className="text-xs text-slate-400 font-mono">POST /v1/manifests/{selectedManifest.id}/attest</p>
                            {selectedManifest.ciSettings.lastRunAt && (
                              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Last run: {new Date(selectedManifest.ciSettings.lastRunAt).toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {selectedManifest.ciSettings.lastRunStatus === 'running' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
                          <Loader2 className="w-3 h-3 animate-spin" /> Awaiting Payload...
                        </span>
                      )}
                      {selectedManifest.ciSettings.lastRunStatus === 'success' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> Pipeline Passed
                        </span>
                      )}
                      {selectedManifest.ciSettings.lastRunStatus === 'failure' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-500/20">
                          <XCircle className="w-3 h-3" /> Pipeline Failed
                        </span>
                      )}
                    </div>

                    <div className="p-4 space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs text-slate-400 font-semibold">Integration Snippet</div>
                        <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto">
{selectedManifest.ciSettings.provider === 'github' ?
`name: Attest Manifest
on: [push]
jobs:
  attest:
    runs-on: ubuntu-latest
    steps:
    - name: Sync AI Asset Ledger
      run: |
        curl -X POST https://api.internal/v1/manifests/${selectedManifest.id}/attest \\
             -H "Authorization: Bearer \${{ secrets.CI_TOKEN }}"`
:
`pipeline {
  agent any
  stages {
    stage('Attest Manifest') {
      steps {
        sh '''curl -X POST https://api.internal/v1/manifests/${selectedManifest.id}/attest \\
             -H "Authorization: Bearer $CI_TOKEN"'''
      }
    }
  }
}`
}
                        </pre>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => handleBindCI(selectedManifest.id, 'none')} className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors">Disconnect Component</button>
                        <button 
                          onClick={() => handleSimulateCI(selectedManifest.id)}
                          disabled={selectedManifest.ciSettings.lastRunStatus === 'running'}
                          className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-sm shadow-indigo-500/20 transition-all flex items-center gap-2"
                          title="Simulates an external webhook trigger from GitHub or Jenkins"
                        >
                          <Webhook className={`w-3 h-3 ${selectedManifest.ciSettings.lastRunStatus === 'running' ? 'animate-pulse' : ''}`} /> 
                          {selectedManifest.ciSettings.lastRunStatus === 'running' ? 'Processing Webhook...' : 'Trigger Webhook Simulation'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
