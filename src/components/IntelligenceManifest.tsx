import { useState } from 'react';
import { Fingerprint, FileCode, Database, Plus, Trash2, Download } from 'lucide-react';

interface Manifest {
  id: string;
  systemName: string;
  ownerDomain: string;
  trainingSources: string[];
  trainingRuns: string[];
  businessRules: string[];
}

const INITIAL_MANIFESTS: Manifest[] = [
  {
    id: '1',
    systemName: 'Retail_Customer_Predictor',
    ownerDomain: 'Retail Ops',
    trainingSources: ['Global_Sales_History_2023-2025', 'Customer_Support_Transcripts_V2'],
    trainingRuns: ['run-retail-v2.1-base', 'run-retail-v2.2-finetuned'],
    businessRules: ['If customer LTV > $500, route to priority queue', 'Do not offer discounts exceeding 15% margin'],
  },
  {
    id: '2',
    systemName: 'Global_Network_Optimizer',
    ownerDomain: 'Global Network',
    trainingSources: ['Network_Telemetry_Logs_Q1-Q4', 'Incident_Postmortems_Archive'],
    trainingRuns: ['run-netops-v4.0-core'],
    businessRules: ['Never restart core router during peak hours (0800-1800 UTC)', 'Require human approval for BGP route changes'],
  }
];

export default function IntelligenceManifest() {
  const [manifests, setManifests] = useState<Manifest[]>(INITIAL_MANIFESTS);
  const [selectedManifestId, setSelectedManifestId] = useState<string>(INITIAL_MANIFESTS[0].id);
  const [isExporting, setIsExporting] = useState(false);

  const [newItemText, setNewItemText] = useState('');
  const [newItemType, setNewItemType] = useState<'trainingSources' | 'trainingRuns' | 'businessRules'>('trainingSources');

  const selectedManifest = manifests.find(m => m.id === selectedManifestId);

  const handleAddItem = () => {
    if (!newItemText.trim() || !selectedManifest) return;

    setManifests(prev => prev.map(m => {
      if (m.id === selectedManifest.id) {
        return {
          ...m,
          [newItemType]: [...m[newItemType], newItemText.trim()]
        };
      }
      return m;
    }));
    setNewItemText('');
  };

  const handleRemoveItem = (type: 'trainingSources' | 'trainingRuns' | 'businessRules', index: number) => {
    if (!selectedManifest) return;

    setManifests(prev => prev.map(m => {
      if (m.id === selectedManifest.id) {
        const newArray = [...m[type]];
        newArray.splice(index, 1);
        return {
          ...m,
          [type]: newArray
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
          Generate and manage a real-time manifest of proprietary intelligence assets for each agentic system. This documentation is crucial for IP protection and "clean-room" transfers during divestitures.
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
                <div className="font-bold text-slate-900">{manifest.systemName}</div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <Database className="w-3 h-3" /> {manifest.ownerDomain}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Manifest Editor */}
        {selectedManifest && (
          <div className="col-span-1 lg:col-span-2 bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-800">
            <div className="bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileCode className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-white">IP Manifest: {selectedManifest.systemName}</h3>
              </div>
              <button 
                onClick={handleExport}
                disabled={isExporting}
                className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/50 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> {isExporting ? 'Exporting...' : 'Export JSON'}
              </button>
            </div>
            
            <div className="p-6 space-y-8 flex-1 overflow-y-auto">
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
                  {selectedManifest.trainingSources.map((source, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg group">
                      <span className="text-sm text-slate-300 font-mono">{source}</span>
                      <button onClick={() => handleRemoveItem('trainingSources', idx)} className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                  {selectedManifest.trainingRuns.map((run, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 p-3 rounded-lg group">
                      <span className="text-sm text-slate-300 font-mono">{run}</span>
                      <button onClick={() => handleRemoveItem('trainingRuns', idx)} className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      <button onClick={() => handleRemoveItem('businessRules', idx)} className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Add New Item */}
              <div className="pt-6 border-t border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Add Asset to Manifest</h4>
                <div className="flex gap-3">
                  <select 
                    className="p-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    value={newItemType}
                    onChange={e => setNewItemType(e.target.value as any)}
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
                  />
                  <button 
                    onClick={handleAddItem}
                    className="px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl transition-colors flex items-center justify-center shrink-0"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
