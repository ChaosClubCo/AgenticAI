import { useState } from 'react';
import { Database, Network, Unplug, Plug, ArrowRightLeft, Search, Download, Plus, Link } from 'lucide-react';

interface Domain {
  id: string;
  name: string;
  color: 'emerald' | 'blue' | 'purple' | 'amber';
  localTerms: Record<string, { definition: string; type: string; lastUpdated: string }>;
  description: string;
}

const INITIAL_DOMAINS: Record<string, Domain> = {
  retail: {
    id: 'retail',
    name: 'Retail Ops',
    color: 'emerald',
    description: 'B2C commerce and inventory management',
    localTerms: {
      'customer': { definition: '30-day active buyer', type: 'Entity', lastUpdated: '2024-04-20' },
      'revenue': { definition: 'gross sales (pre-tax)', type: 'Metric', lastUpdated: '2024-04-21' },
      'product': { definition: 'SKU in inventory', type: 'Entity', lastUpdated: '2024-04-19' }
    }
  },
  b2b: {
    id: 'b2b',
    name: 'B2B Enterprise',
    color: 'blue',
    description: 'High-volume contract sales and SLA compliance',
    localTerms: {
      'client': { definition: 'active contract holder', type: 'Entity', lastUpdated: '2024-04-22' },
      'arr': { definition: 'annual recurring revenue', type: 'Metric', lastUpdated: '2024-04-22' },
      'service': { definition: 'SLA-backed offering', type: 'Entity', lastUpdated: '2024-04-18' }
    }
  }
};

const COLOR_MAP = {
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    text: 'text-emerald-900',
    icon: 'text-emerald-600',
    dot: 'bg-emerald-500'
  },
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    text: 'text-blue-900',
    icon: 'text-blue-600',
    dot: 'bg-blue-500'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-100',
    text: 'text-purple-900',
    icon: 'text-purple-600',
    dot: 'bg-purple-500'
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    text: 'text-amber-900',
    icon: 'text-amber-600',
    dot: 'bg-amber-500'
  }
};

// The Semantic Adapter maps local terms to the enterprise context
const INITIAL_ADAPTER: Record<string, { domainId: string; localTerm: string }[]> = {
  'Enterprise_Entity': [
    { domainId: 'retail', localTerm: 'customer' },
    { domainId: 'b2b', localTerm: 'client' }
  ],
  'Enterprise_Value': [
    { domainId: 'retail', localTerm: 'revenue' },
    { domainId: 'b2b', localTerm: 'arr' }
  ]
};

export default function DomainMetadata() {
  const [domains, setDomains] = useState<Record<string, Domain>>(INITIAL_DOMAINS);
  const [semanticAdapter, setSemanticAdapter] = useState(INITIAL_ADAPTER);
  
  const [enterpriseConnected, setEnterpriseConnected] = useState(true);
  const [queryTerm, setQueryTerm] = useState('Enterprise_Entity');
  const [queryResult, setQueryResult] = useState<any>(null);

  // New Term Form State
  const [activeFormDomain, setActiveFormDomain] = useState<string | null>(null);
  const [newTermName, setNewTermName] = useState('');
  const [newTermDef, setNewTermDef] = useState('');
  const [newTermType, setNewTermType] = useState('Entity');
  const [newEnterpriseMap, setNewEnterpriseMap] = useState('');

  // Domain Federation state
  const [isFederating, setIsFederating] = useState(false);
  const [federateName, setFederateName] = useState('');
  const [federateDesc, setFederateDesc] = useState('');
  const [domainDescription, setDomainDescription] = useState('');

  const handleQuery = () => {
    if (!enterpriseConnected) {
      // When severed, enterprise queries fail, but local queries would still work
      setQueryResult({
        status: 'error',
        message: 'Enterprise Catalog Unreachable. Domains operating independently.'
      });
      return;
    }

    const mapping = semanticAdapter[queryTerm];
    if (mapping) {
      const results = mapping.map(m => {
        const domain = domains[m.domainId];
        const termData = domain.localTerms[m.localTerm];
        return {
          domainName: domain.name,
          localTerm: m.localTerm,
          definition: termData.definition,
          type: termData.type
        };
      });
      setQueryResult({ status: 'success', data: results });
    } else {
      setQueryResult({ status: 'error', message: 'Term not found in Enterprise Catalog.' });
    }
  };

  const handleExtractDomain = (domainId: string) => {
    const domain = domains[domainId];
    const exportData = {
      domainId: domain.id,
      domainName: domain.name,
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      localTerms: domain.localTerms
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${domain.id}-metadata-schema.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddTerm = (domainId: string) => {
    if (!newTermName || !newTermDef) return;

    setDomains(prev => ({
      ...prev,
      [domainId]: {
        ...prev[domainId],
        localTerms: {
          ...prev[domainId].localTerms,
          [newTermName]: {
            definition: newTermDef,
            type: newTermType,
            lastUpdated: new Date().toISOString().split('T')[0]
          }
        }
      }
    }));

    if (newEnterpriseMap) {
      setSemanticAdapter(prev => {
        const existingMap = prev[newEnterpriseMap] || [];
        // prevent duplicates
        if (existingMap.some(m => m.domainId === domainId && m.localTerm === newTermName)) {
          return prev;
        }
        return {
          ...prev,
          [newEnterpriseMap]: [...existingMap, { domainId, localTerm: newTermName }]
        };
      });
      // Optionally switch query to newly mapped term
      setQueryTerm(newEnterpriseMap);
      setQueryResult(null);
    }

    setNewTermName('');
    setNewTermDef('');
    setNewTermType('Entity');
    setNewEnterpriseMap('');
    setActiveFormDomain(null);
  };

  const handleFederateDomain = () => {
    if (!federateName) return;
    const id = federateName.toLowerCase().replace(/\s+/g, '_');
    const colors: ('purple' | 'amber')[] = ['purple', 'amber'];
    const newDomain: Domain = {
      id,
      name: federateName,
      color: colors[Math.floor(Math.random() * colors.length)],
      description: domainDescription || federateDesc || 'Newly federated business unit metadata repository.',
      localTerms: {}
    };
    setDomains(prev => ({ ...prev, [id]: newDomain }));
    setFederateName('');
    setFederateDesc('');
    setDomainDescription('');
    setIsFederating(false);
  };

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">
              Decoupled Metadata Repositories
            </h2>
            <p className="text-lg text-slate-500 mt-2 leading-relaxed max-w-2xl">
              Domains maintain internal coherence with local vocabularies. Semantic adapters map these to the enterprise context, allowing domains to detach and function independently during corporate restructuring.
            </p>
          </div>
          <button
            onClick={() => {
              setEnterpriseConnected(!enterpriseConnected);
              setQueryResult(null);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-sm ${
              enterpriseConnected 
                ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100' 
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {enterpriseConnected ? <Unplug className="w-5 h-5" /> : <Plug className="w-5 h-5" />}
            {enterpriseConnected ? 'Sever Enterprise Link (Simulate Divestiture)' : 'Restore Enterprise Link'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Enterprise Catalog (Central) */}
        <div className={`col-span-1 lg:col-span-3 bg-slate-900 rounded-2xl p-6 border transition-all duration-500 ${
          enterpriseConnected ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/10' : 'border-slate-800 opacity-50 grayscale'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <Network className={`w-6 h-6 ${enterpriseConnected ? 'text-indigo-400' : 'text-slate-500'}`} />
            <h3 className="text-xl font-display font-bold text-white">Enterprise Semantic Catalog</h3>
            {!enterpriseConnected && <span className="ml-auto text-xs font-bold px-2 py-1 bg-rose-500/20 text-rose-400 rounded-md">OFFLINE</span>}
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Query Enterprise Term</label>
              <select 
                className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                value={queryTerm}
                onChange={e => setQueryTerm(e.target.value)}
                disabled={!enterpriseConnected}
              >
                {Object.keys(semanticAdapter).map(term => (
                  <option key={term} value={term}>{term}</option>
                ))}
              </select>
            </div>
            <button 
              onClick={handleQuery}
              disabled={!enterpriseConnected}
              className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold rounded-xl transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Resolve Term
            </button>
          </div>

          {queryResult && (
            <div className={`mt-6 p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 ${
              queryResult.status === 'success' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-rose-500/10 border-rose-500/20'
            }`}>
              {queryResult.status === 'error' ? (
                <p className="text-rose-400 font-medium">{queryResult.message}</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-indigo-300 font-medium mb-2">Semantic Adapter resolved '{queryTerm}' to:</p>
                  {queryResult.data.map((res: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                      <span className="text-xs font-bold text-slate-400 w-24">{res.domainName}</span>
                      <ArrowRightLeft className="w-4 h-4 text-slate-600 shrink-0" />
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <span className="text-emerald-400 font-mono text-sm">{res.localTerm}</span>
                          <span className="text-slate-500 text-sm ml-2">({res.definition})</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-500 border border-slate-700">
                          {res.type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Domain Selection & Federation Header */}
        <div className="col-span-1 lg:col-span-3 flex items-center justify-between mb-2">
          <h3 className="text-xl font-display font-bold text-slate-900 border-l-4 border-indigo-500 pl-4">
            Standalone Domain Repositories
          </h3>
          <button 
            onClick={() => setIsFederating(!isFederating)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Federate New Domain
          </button>
        </div>

        {isFederating && (
          <div className="col-span-1 lg:col-span-3 bg-indigo-50 border border-indigo-100 rounded-2xl p-6 animate-in slide-in-from-top-4 fade-in">
            <div className="max-w-2xl mx-auto space-y-4">
              <h4 className="font-bold text-indigo-900 flex items-center gap-2 text-lg">
                <Network className="w-5 h-5" /> Initialize Federated Metadata Repository
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Domain Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Supply Chain" 
                    value={federateName}
                    onChange={e => setFederateName(e.target.value)}
                    className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Primary Responsibility</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Logistics and vendor management" 
                    value={federateDesc}
                    onChange={e => setFederateDesc(e.target.value)}
                    className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Description</label>
                <textarea 
                  placeholder="Enter domain description..." 
                  value={domainDescription}
                  onChange={e => setDomainDescription(e.target.value)}
                  className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none min-h-[80px]"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => setIsFederating(false)}
                  className="px-4 py-2 text-indigo-600 font-semibold text-sm hover:text-indigo-800"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleFederateDomain}
                  disabled={!federateName}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md"
                >
                  Create Domain Node
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Local Domains */}
        {Object.values(domains).map((domain: Domain) => {
          const colors = COLOR_MAP[domain.color];
          return (
            <div key={domain.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              <div className={`${colors.bg} border-b ${colors.border} p-4 flex items-center justify-between`}>
                <div className="flex items-center gap-2">
                  <Database className={`w-5 h-5 ${colors.icon}`} />
                  <h3 className={`font-bold ${colors.text}`}>{domain.name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleExtractDomain(domain.id)}
                    className="p-1.5 hover:bg-white/50 rounded-md transition-colors text-slate-500 hover:text-slate-900"
                    title="Export Local Schema (Detachment)"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200">
                    Local Repository
                  </span>
                </div>
              </div>
              
              <div className="p-6 flex-1">
                <p className="text-sm text-slate-500 mb-6">
                  {domain.description}
                </p>
                
                <div className="space-y-4 mb-4">
                  {Object.entries(domain.localTerms).map(([term, data]) => (
                    <div key={term} className="border-l-2 border-slate-200 pl-4 group relative">
                      <div className="font-mono text-sm font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                          {term}
                        </div>
                        {/* Identify if it has an enterprise binding */}
                        {Object.entries(semanticAdapter).find(([entTerm, maps]: [string, any[]]) => 
                          maps.some(m => m.domainId === domain.id && m.localTerm === term)
                        ) && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded flex items-center gap-1 border border-indigo-100">
                            <Link className="w-3 h-3" /> Federated
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600">{data.definition}</div>
                      <div className="mt-1 flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                        <span>Type: {data.type}</span>
                        <span>•</span>
                        <span>Valid as of: {data.lastUpdated}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Term Form inline */}
                {activeFormDomain === domain.id ? (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-3 mt-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Local Term</label>
                        <input 
                          type="text" 
                          placeholder="e.g. churn_risk"
                          value={newTermName}
                          onChange={e => setNewTermName(e.target.value)}
                          className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Term Type</label>
                        <select
                          value={newTermType}
                          onChange={e => setNewTermType(e.target.value)}
                          className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none mt-1 bg-white"
                        >
                          <option value="Entity">Entity</option>
                          <option value="Metric">Metric</option>
                          <option value="State">State</option>
                          <option value="Action">Action</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Strict Semantic Definition</label>
                      <input 
                        type="text" 
                        placeholder="e.g. user completely dropped traffic for 14d"
                        value={newTermDef}
                        onChange={e => setNewTermDef(e.target.value)}
                        className="w-full text-sm p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
                        <Network className="w-3 h-3" /> Map to Enterprise Concept (Optional)
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Enterprise_Risk_Score"
                        value={newEnterpriseMap}
                        onChange={e => setNewEnterpriseMap(e.target.value)}
                        className="w-full text-sm p-2 border border-indigo-200 bg-indigo-50 text-indigo-900 rounded-lg focus:ring-1 focus:ring-indigo-500 outline-none mt-1"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={() => handleAddTerm(domain.id)}
                        disabled={!newTermName || !newTermDef}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                      >
                        Save & Commit
                      </button>
                      <button 
                        onClick={() => {
                          setActiveFormDomain(null);
                          setNewTermName('');
                          setNewTermDef('');
                          setNewEnterpriseMap('');
                        }}
                        className="px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setActiveFormDomain(domain.id)}
                    className="w-full mt-2 py-2 border border-dashed border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 hover:bg-slate-50 text-sm font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Register Local Term
                  </button>
                )}
              </div>

              <div className={`p-3 text-center text-xs font-medium border-t ${
                enterpriseConnected 
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                  : 'bg-amber-50 text-amber-600 border-amber-100'
              }`}>
                {enterpriseConnected ? 'Synced via Semantic Adapter' : 'Operating Independently (Self-Sufficient)'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
