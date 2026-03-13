import { useState } from 'react';
import { Globe, ShieldAlert, ShieldCheck, Tag, MapPin, Server } from 'lucide-react';

type Region = 'US' | 'EU' | 'CN' | 'UK';
type SovereigntyTag = 'GDPR' | 'PIPL' | 'HIPAA' | 'CCPA' | 'UK-GDPR';

interface DataAsset {
  id: string;
  name: string;
  description: string;
  tags: SovereigntyTag[];
}

const REGIONS: { id: Region; name: string; flag: string }[] = [
  { id: 'US', name: 'United States', flag: '🇺🇸' },
  { id: 'EU', name: 'European Union', flag: '🇪🇺' },
  { id: 'CN', name: 'China', flag: '🇨🇳' },
  { id: 'UK', name: 'United Kingdom', flag: '🇬🇧' },
];

const TAG_REQUIREMENTS: Record<SovereigntyTag, Region[]> = {
  'GDPR': ['EU'],
  'PIPL': ['CN'],
  'HIPAA': ['US'],
  'CCPA': ['US'],
  'UK-GDPR': ['UK'],
};

const INITIAL_ASSETS: DataAsset[] = [
  { id: '1', name: 'Global Customer Profiles', description: 'Aggregated user data from EU and US markets.', tags: ['GDPR', 'CCPA'] },
  { id: '2', name: 'Shanghai Operations Logs', description: 'Telemetry and user activity from mainland China.', tags: ['PIPL'] },
  { id: '3', name: 'US Healthcare Records', description: 'Anonymized patient outcomes and billing data.', tags: ['HIPAA'] },
];

export default function JurisdictionalAwareness() {
  const [assets, setAssets] = useState<DataAsset[]>(INITIAL_ASSETS);
  const [agentLocation, setAgentLocation] = useState<Region>('US');
  const [selectedAssetId, setSelectedAssetId] = useState<string>(INITIAL_ASSETS[0].id);
  const [simResult, setSimResult] = useState<{ allowed: boolean; reason: string; conflicts: SovereigntyTag[] } | null>(null);

  const handleSimulate = () => {
    const asset = assets.find(a => a.id === selectedAssetId);
    if (!asset) return;

    const conflicts: SovereigntyTag[] = [];

    // Check each tag on the asset to see if the agent's location is allowed
    asset.tags.forEach(tag => {
      const allowedRegions = TAG_REQUIREMENTS[tag];
      if (!allowedRegions.includes(agentLocation)) {
        conflicts.push(tag);
      }
    });

    if (conflicts.length > 0) {
      setSimResult({
        allowed: false,
        reason: `Geofence Blocked: Agent processing location (${agentLocation}) violates data sovereignty requirements.`,
        conflicts
      });
    } else {
      setSimResult({
        allowed: true,
        reason: `Geofence Cleared: Agent processing location (${agentLocation}) complies with all asset sovereignty tags.`,
        conflicts: []
      });
    }
  };

  const toggleTag = (assetId: string, tag: SovereigntyTag) => {
    setAssets(prev => prev.map(asset => {
      if (asset.id === assetId) {
        const hasTag = asset.tags.includes(tag);
        return {
          ...asset,
          tags: hasTag ? asset.tags.filter(t => t !== tag) : [...asset.tags, tag]
        };
      }
      return asset;
    }));
    setSimResult(null); // Reset simulation on change
  };

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">
          Jurisdictional Awareness & Geofencing
        </h2>
        <p className="text-lg text-slate-500 mt-2 leading-relaxed">
          Track and restrict the physical and logical location of data processing. Apply sovereignty tags to data assets to ensure compliance with regional regulations (GDPR, PIPL, etc.) during cross-border operations.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Asset Tagging Section */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Data Asset Sovereignty Tags</h3>
          </div>
          
          <div className="p-4 space-y-4 flex-1 overflow-y-auto max-h-[500px]">
            {assets.map(asset => (
              <div key={asset.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50">
                <h4 className="font-bold text-slate-900 mb-1">{asset.name}</h4>
                <p className="text-sm text-slate-500 mb-4">{asset.description}</p>
                
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(TAG_REQUIREMENTS) as SovereigntyTag[]).map(tag => {
                    const isActive = asset.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(asset.id, tag)}
                        className={`px-3 py-1 text-xs font-bold rounded-full border transition-colors ${
                          isActive 
                            ? 'bg-indigo-100 border-indigo-300 text-indigo-700' 
                            : 'bg-white border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geofence Simulator */}
        <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-800">
          <div className="bg-slate-950 border-b border-slate-800 p-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-white">Geofence Processing Simulator</h3>
          </div>
          
          <div className="p-6 space-y-6 flex-1">
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Agent Processing Location
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {REGIONS.map(region => (
                    <button
                      key={region.id}
                      onClick={() => { setAgentLocation(region.id); setSimResult(null); }}
                      className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                        agentLocation === region.id
                          ? 'bg-indigo-500/20 border-indigo-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <span className="text-xl">{region.flag}</span>
                      <span className="font-medium text-sm">{region.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Server className="w-4 h-4" /> Target Data Asset
                </label>
                <select 
                  className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                  value={selectedAssetId} 
                  onChange={e => { setSelectedAssetId(e.target.value); setSimResult(null); }}
                >
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>

            <button 
              onClick={handleSimulate}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
            >
              Attempt Data Processing
            </button>

            {simResult && (
              <div className={`p-5 rounded-xl border ${simResult.allowed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className="flex items-center gap-3 mb-4">
                  {simResult.allowed ? <ShieldCheck className="w-7 h-7 text-emerald-400" /> : <ShieldAlert className="w-7 h-7 text-rose-400" />}
                  <h4 className={`text-lg font-bold ${simResult.allowed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {simResult.allowed ? 'PROCESSING ALLOWED' : 'PROCESSING BLOCKED'}
                  </h4>
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {simResult.reason}
                  </p>
                  
                  {!simResult.allowed && simResult.conflicts.length > 0 && (
                    <div className="bg-rose-950/50 p-3 rounded-lg border border-rose-900/50">
                      <div className="text-xs text-rose-400/80 uppercase tracking-wider font-semibold mb-2">Sovereignty Conflicts</div>
                      <div className="flex flex-wrap gap-2">
                        {simResult.conflicts.map(tag => (
                          <span key={tag} className="px-2 py-1 bg-rose-500/20 text-rose-300 text-xs font-mono rounded border border-rose-500/30">
                            {tag} (Requires {TAG_REQUIREMENTS[tag].join(', ')})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
