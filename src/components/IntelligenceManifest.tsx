import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Fingerprint, FileCode, Database, Plus, Trash2, Lock, RefreshCw, Play, ShieldCheck, AlertTriangle, Sparkles, Webhook, Terminal, CheckCircle, XCircle, Loader2, GitCommit, Settings, Activity, Network, GitMerge, Clock, Search, Github, Cpu, Download, AlertOctagon, HelpCircle, ListFilter, Filter, Key } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { 
  SeverityLevel, 
  Conflict, 
  DependencyGraph as IDependencyGraph, 
  Manifest, 
  DataLineage 
} from '../types';
import { 
  DEFAULT_SEVERITIES, 
  SEVERITY_COLORS, 
  INITIAL_MANIFESTS 
} from '../constants';
import DependencyGraph from './DependencyGraph';
import ConflictList from './ConflictList';
import CIIntegration from './CIIntegration';
import APIKeyManagement from './APIKeyManagement';

export default function IntelligenceManifest() {
  const [manifests, setManifests] = useState<Manifest[]>(INITIAL_MANIFESTS);
  const [selectedManifestId, setSelectedManifestId] = useState<string>(INITIAL_MANIFESTS[0].id);
  const [isExporting, setIsExporting] = useState(false);
  const [isAttesting, setIsAttesting] = useState(false);
  const [attestationStep, setAttestationStep] = useState<string>('');
  const [generatingMap, setGeneratingMap] = useState<Record<string, boolean>>({});
  const [conflictMap, setConflictMap] = useState<Record<string, boolean>>({});
  const [analyzingGraphMap, setAnalyzingGraphMap] = useState<Record<string, boolean>>({});
  const [expandedLineage, setExpandedLineage] = useState<Record<string, boolean>>({});
  const [expandedSystemGraph, setExpandedSystemGraph] = useState<boolean>(true);
  const [severities, setSeverities] = useState<SeverityLevel[]>(DEFAULT_SEVERITIES);
  const [isConfiguringSeverities, setIsConfiguringSeverities] = useState(false);
  const [newSevMode, setNewSevMode] = useState<Partial<SeverityLevel> | null>(null);
  const [editingPurpose, setEditingPurpose] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const maskPII = (text: string) => {
    if (!text) return text;
    // Simple regex for email and phone numbers
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    // Basic phone regex (matches common formats)
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    
    return text
      .replace(emailRegex, '[REDACTED_EMAIL]')
      .replace(phoneRegex, '[REDACTED_PHONE]');
  };

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
        { name: 'PII Masking', detail: 'Pattern-based redaction of emails and phone numbers in LLM response buffers', timestamp: new Date().toISOString().split('T')[0], tool: 'Privacy-Shield v3', icon: 'Lock', rowsIn: '120k', rowsOut: '120k', latency: '240ms', status: 'Success' },
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

  const [activeView, setActiveView] = useState<'dashboard' | 'access'>('dashboard');

  const selectedManifest = manifests.find(m => m.id === selectedManifestId);

  const handleUpdateManifest = (manifestId: string, updates: Partial<Manifest>) => {
    setManifests(prev => prev.map(m => m.id === manifestId ? { ...m, ...updates } : m));
  };

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
      
      const graph: IDependencyGraph = JSON.parse(response.text || '{"nodes":[],"links":[]}');
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
      
      const maskedPurpose = selectedManifest.systemName === 'Retail_Customer_Predictor' 
        ? maskPII(response.text) 
        : response.text;

      setManifests(prev => prev.map(m => m.id === manifestId ? { ...m, systemPurpose: maskedPurpose } : m));
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
        const detected = JSON.parse(cleanedText);
        
        // Preserve already resolved conflicts if they are still relevant (by description)
        const existingResolved = target.detectedConflicts?.filter(c => c.resolved) || [];
        
        conflicts = detected.map((c: any, i: number) => {
          const matchedResolved = existingResolved.find(r => r.description === c.description);
          if (matchedResolved) {
            return matchedResolved;
          }

          // Apply PII masking to description and example if it's the retail predictor
          const processedConflict = { ...c };
          if (target.systemName === 'Retail_Customer_Predictor') {
            processedConflict.description = maskPII(c.description);
            if (c.example) processedConflict.example = maskPII(c.example);
            if (c.suggestion) processedConflict.suggestion = maskPII(c.suggestion);
          }

          return {
            ...processedConflict,
            id: `conflict-${Date.now()}-${i}`,
            resolved: false
          };
        });

        // Also keep any resolved conflicts that might not have been detected this time 
        // (optional: depends on if we want to "garbage collect" resolved conflicts that no longer apply)
        // For now, let's keep them as "historical overrides"
        const remainingResolved = existingResolved.filter(r => !detected.some((d: any) => d.description === r.description));
        conflicts = [...conflicts, ...remainingResolved];

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
  };

  const handleUnresolveConflict = (manifestId: string, conflictId: string) => {
    setManifests(prev => prev.map(m => {
      if (m.id !== manifestId || !m.detectedConflicts) return m;
      return {
        ...m,
        detectedConflicts: m.detectedConflicts.map(c => 
          c.id === conflictId ? { ...c, resolved: false, justification: undefined } : c
        )
      };
    }));
  };

  useEffect(() => {
    if (newItemType !== 'businessRules' || !newItemText.trim() || !selectedManifest) {
      setRuleValidationFeedback(null);
      return;
    }

    if (newItemText.length < 3) {
      setRuleValidationFeedback(null);
      return;
    }

    setRuleValidationFeedback({ status: 'validating', message: 'Securing logic boundaries...' });

    const timeout = setTimeout(async () => {
      try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return;
        
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Act as a Senior Compliance Architect and AI Auditor. Perform a deep semantic analysis on this proposed business rule for the system "${selectedManifest.systemName}".
        
        CONTEXT:
        Existing Rules: ${selectedManifest.businessRules.length > 0 ? selectedManifest.businessRules.join('; ') : 'None yet.'}
        Operational Domain: ${selectedManifest.ownerDomain}
        
        PROPOSED RULE:
        "${newItemText}"
        
        CRITERIA:
        1. Ambiguity Detection: Flag vague qualifiers like "appropriate", "mostly", "rarely", "fast", "efficient", or "standard". AI models fail on relative terms.
        2. Logical Contradiction: Check if this creates a direct conflict with any existing rules.
        3. Compliance Risk: Identify if the rule is too broad or leaves dangerous gaps.
        
        REQUIRED OUTPUT SCHEMA (JSON):
        {
          "status": "valid" | "ambiguous" | "error",
          "message": "A 1-sentence executive summary of the finding.",
          "example": "A specific 'Stress Scenario' where this rule breaks down or causes unpredictable behavior.",
          "suggestion": "A mathematically precise, deterministic, or quantifiable version of the rule."
        }
        
        Return ONLY valid JSON.`;

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
          if (selectedManifest.systemName === 'Retail_Customer_Predictor') {
            result.message = maskPII(result.message);
            if (result.example) result.example = maskPII(result.example);
            if (result.suggestion) result.suggestion = maskPII(result.suggestion);
          }
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
    if (!newSystemName.trim() || !newSystemDomain.trim()) {
      return;
    }
    
    // Check for duplicates
    if (manifests.some(m => m.systemName.toLowerCase() === newSystemName.trim().replace(/\s+/g, '_').toLowerCase())) {
      alert("A system with this name already exists.");
      return;
    }

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
            {manifests.map(manifest => {
              const unresolvedConflicts = manifest.detectedConflicts?.filter(c => !c.resolved) || [];
              const hasConflicts = unresolvedConflicts.length > 0;
              const isOutOfSync = !manifest.attested && manifest.attestationSignature;

              return (
                <button
                  key={manifest.id}
                  onClick={() => setSelectedManifestId(manifest.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all relative ${
                    selectedManifestId === manifest.id
                      ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                      : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50'
                  }`}
                >
                  {hasConflicts && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg" title={`${unresolvedConflicts.length} unresolved conflicts`}>
                      <span className="text-[8px] font-black text-white">{unresolvedConflicts.length}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-slate-900 truncate pr-2">{manifest.systemName}</div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isOutOfSync && (
                        <span title="Modified since last attestation" className="flex items-center gap-1 text-[9px] uppercase font-bold text-amber-600 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          <Clock className="w-2.5 h-2.5" /> Drift
                        </span>
                      )}
                      {manifest.attested ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <div className={`w-1.5 h-1.5 rounded-full ${isOutOfSync ? 'bg-amber-400' : 'bg-slate-300'}`} />
                      )}
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-between">
                    <div className="flex items-center gap-1 truncate max-w-[120px]">
                      <Database className="w-3 h-3 text-slate-400" /> {manifest.ownerDomain}
                    </div>
                    {hasConflicts && (
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter flex items-center gap-1">
                        <AlertOctagon className="w-2.5 h-2.5" /> Logical Conflicts
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
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
                <div className="space-y-4 p-4 bg-white border border-slate-200 rounded-xl shadow-md animate-in slide-in-from-bottom-2 fade-in duration-200">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Name</label>
                      {newSystemName.length > 0 && !newSystemName.trim() && (
                        <span className="text-[10px] text-rose-500 font-medium">Invalid: Whitespace only</span>
                      )}
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. Risk_Parser"
                      className={`w-full p-2.5 text-sm bg-slate-50 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${newSystemName.length > 0 && !newSystemName.trim() ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'}`}
                      value={newSystemName}
                      onChange={e => setNewSystemName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Owner Domain</label>
                      {newSystemDomain.length > 0 && !newSystemDomain.trim() && (
                        <span className="text-[10px] text-rose-500 font-medium">Invalid: Whitespace only</span>
                      )}
                    </div>
                    <input 
                      type="text" 
                      placeholder="e.g. Legal Operations"
                      className={`w-full p-2.5 text-sm bg-slate-50 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${newSystemDomain.length > 0 && !newSystemDomain.trim() ? 'border-rose-300 bg-rose-50/30' : 'border-slate-200'}`}
                      value={newSystemDomain}
                      onChange={e => setNewSystemDomain(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button 
                      onClick={handleCreateSystem}
                      disabled={!newSystemName.trim() || !newSystemDomain.trim()}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white text-sm py-2 rounded-lg font-semibold transition-colors shadow-lg shadow-indigo-200 active:scale-95"
                    >
                      Create System
                    </button>
                    <button 
                      onClick={() => {
                        setIsCreatingSystem(false);
                        setNewSystemName('');
                        setNewSystemDomain('');
                      }}
                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-sm py-2 rounded-lg font-semibold transition-colors active:scale-95"
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
                <button 
                  onClick={() => setActiveView(activeView === 'dashboard' ? 'access' : 'dashboard')}
                  className={`px-4 py-2 hover:bg-slate-800 rounded-lg transition-all flex items-center gap-2 text-sm font-semibold border border-slate-700 ${activeView === 'access' ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-slate-900 text-slate-400'}`}
                >
                  <Key className="w-4 h-4" /> {activeView === 'access' ? 'Dashboard' : 'Access Control'}
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-8 flex-1 overflow-y-auto relative">
              {activeView === 'access' ? (
                <APIKeyManagement 
                  manifest={selectedManifest}
                  onUpdate={handleUpdateManifest}
                />
              ) : (
                <>
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

              {/* System Topology Graph */}
              {expandedSystemGraph && selectedManifest.dependencyGraph && (
                <DependencyGraph 
                  manifest={selectedManifest} 
                  analyzing={analyzingGraphMap[selectedManifest.id]}
                  onRefresh={analyzeDependencies}
                  onClose={() => setExpandedSystemGraph(false)}
                />
              )}

              {!expandedSystemGraph && (
                <button 
                  onClick={() => setExpandedSystemGraph(true)}
                  className="w-full py-4 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 hover:text-indigo-400 hover:border-indigo-500/50 transition-all font-mono text-[10px] uppercase tracking-widest mb-8"
                >
                  View System topology
                </button>
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

              {/* Conflict Analysis */}
              {selectedManifest.detectedConflicts && (
                <ConflictList 
                  manifest={selectedManifest}
                  detecting={conflictMap[selectedManifest.id]}
                  onDetect={detectConflicts}
                  onResolve={handleResolveConflict}
                  onUnresolve={handleUnresolveConflict}
                  severities={severities}
                  onUpdateSeverities={setSeverities}
                />
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
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 flex flex-col gap-3 text-xs p-4 rounded-2xl w-full transition-all duration-500 border shadow-sm ${
                      ruleValidationFeedback.status === 'validating' ? 'text-slate-400 bg-slate-800/50 border-slate-700/50 border-dashed' :
                      ruleValidationFeedback.status === 'valid' ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20 shadow-emerald-500/5' :
                      ruleValidationFeedback.status === 'ambiguous' ? 'text-amber-400 bg-amber-500/5 border-amber-500/20 shadow-amber-500/5' :
                      'text-rose-400 bg-rose-500/5 border-rose-500/20 shadow-rose-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${
                        ruleValidationFeedback.status === 'validating' ? 'bg-slate-700' :
                        ruleValidationFeedback.status === 'valid' ? 'bg-emerald-500/20' :
                        ruleValidationFeedback.status === 'ambiguous' ? 'bg-amber-500/20' :
                        'bg-rose-500/20'
                      }`}>
                        {ruleValidationFeedback.status === 'validating' && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
                        {ruleValidationFeedback.status === 'valid' && <ShieldCheck className="w-4 h-4 shrink-0" />}
                        {ruleValidationFeedback.status === 'ambiguous' && <AlertTriangle className="w-4 h-4 shrink-0" />}
                        {ruleValidationFeedback.status === 'error' && <XCircle className="w-4 h-4 shrink-0" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-[10px] uppercase tracking-widest opacity-60">AI Logic Auditor</span>
                        <span className="font-medium text-sm leading-tight">{ruleValidationFeedback.message}</span>
                      </div>
                    </div>

                    {(ruleValidationFeedback.example || ruleValidationFeedback.suggestion) && ruleValidationFeedback.status !== 'validating' && (
                      <div className="mt-1 pl-1 pr-1 space-y-4">
                        {ruleValidationFeedback.example && (
                          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/50">
                            <span className="font-black uppercase tracking-tighter text-[9px] text-slate-500 block mb-1.5">Problematic Stress Scenario:</span>
                            <span className="text-slate-300 italic block leading-relaxed">"{ruleValidationFeedback.example}"</span>
                          </div>
                        )}
                        {ruleValidationFeedback.suggestion && (
                          <div className="space-y-2">
                            <span className="font-black uppercase tracking-tighter text-[9px] text-slate-500 block">AI Recommended Phrasing:</span>
                            <button 
                              onClick={() => {
                                setNewItemText(ruleValidationFeedback.suggestion!);
                                setRuleValidationFeedback({ status: 'validating', message: 'Re-evaluating...' });
                              }}
                              className="text-left bg-slate-900/80 border border-indigo-500/30 hover:border-indigo-500/60 px-4 py-3 rounded-xl text-slate-200 hover:text-indigo-200 transition-all w-full break-normal shadow-lg shadow-indigo-500/5 group relative overflow-hidden"
                            >
                              <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Sparkles className="w-3 h-3 text-indigo-400" />
                              </div>
                              <span className="block text-[13px] font-medium leading-relaxed italic">"{ruleValidationFeedback.suggestion}"</span>
                              <div className="mt-2 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-400 group-hover:text-indigo-300 transition-colors">
                                <RefreshCw className="w-2.5 h-2.5" /> Apply Precise Replacement
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

                {/* CI/CD Pipeline Integration */}
                <CIIntegration 
                  manifest={selectedManifest}
                  onBind={handleBindCI}
                  onSimulate={handleSimulateCI}
                  disabled={isAttesting || selectedManifest.attested}
                />
              </>
            )}
          </div>
            </div>
          )}
        </div>
      </div>
    );
}
