import { useState } from 'react';
import { Database, Network, Unplug, Plug, ArrowRightLeft, Search } from 'lucide-react';

interface Domain {
  id: string;
  name: string;
  color: string;
  localTerms: Record<string, string>;
}

const DOMAINS: Record<string, Domain> = {
  retail: {
    id: 'retail',
    name: 'Retail Ops',
    color: 'emerald',
    localTerms: {
      'customer': '30-day active buyer',
      'revenue': 'gross sales (pre-tax)',
      'product': 'SKU in inventory'
    }
  },
  b2b: {
    id: 'b2b',
    name: 'B2B Enterprise',
    color: 'blue',
    localTerms: {
      'client': 'active contract holder',
      'arr': 'annual recurring revenue',
      'service': 'SLA-backed offering'
    }
  }
};

// The Semantic Adapter maps local terms to the enterprise context
const SEMANTIC_ADAPTER: Record<string, { domainId: string; localTerm: string }[]> = {
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
  const [enterpriseConnected, setEnterpriseConnected] = useState(true);
  const [queryTerm, setQueryTerm] = useState('Enterprise_Entity');
  const [queryResult, setQueryResult] = useState<any>(null);

  const handleQuery = () => {
    if (!enterpriseConnected) {
      // When severed, enterprise queries fail, but local queries would still work
      setQueryResult({
        status: 'error',
        message: 'Enterprise Catalog Unreachable. Domains operating independently.'
      });
      return;
    }

    const mapping = SEMANTIC_ADAPTER[queryTerm];
    if (mapping) {
      const results = mapping.map(m => {
        const domain = DOMAINS[m.domainId];
        return {
          domainName: domain.name,
          localTerm: m.localTerm,
          definition: domain.localTerms[m.localTerm]
        };
      });
      setQueryResult({ status: 'success', data: results });
    } else {
      setQueryResult({ status: 'error', message: 'Term not found in Enterprise Catalog.' });
    }
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
                {Object.keys(SEMANTIC_ADAPTER).map(term => (
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
                      <div>
                        <span className="text-emerald-400 font-mono text-sm">{res.localTerm}</span>
                        <span className="text-slate-500 text-sm ml-2">({res.definition})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Local Domains */}
        {Object.values(DOMAINS).map(domain => (
          <div key={domain.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className={`bg-${domain.color}-50 border-b border-${domain.color}-100 p-4 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <Database className={`w-5 h-5 text-${domain.color}-600`} />
                <h3 className={`font-bold text-${domain.color}-900`}>{domain.name}</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200">
                Local Repository
              </span>
            </div>
            
            <div className="p-6 flex-1">
              <p className="text-sm text-slate-500 mb-6">
                Maintains internal coherence regardless of enterprise connection state. Agents in this domain use these definitions natively.
              </p>
              
              <div className="space-y-4">
                {Object.entries(domain.localTerms).map(([term, def]) => (
                  <div key={term} className="border-l-2 border-slate-200 pl-4">
                    <div className="font-mono text-sm font-bold text-slate-700 mb-1">{term}</div>
                    <div className="text-sm text-slate-600">{def}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className={`p-3 text-center text-xs font-medium border-t ${
              enterpriseConnected 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                : 'bg-amber-50 text-amber-600 border-amber-100'
            }`}>
              {enterpriseConnected ? 'Synced via Semantic Adapter' : 'Operating Independently (Self-Sufficient)'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
