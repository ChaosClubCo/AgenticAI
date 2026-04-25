import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  GitMerge, 
  CheckCircle, 
  AlertOctagon, 
  Loader2, 
  Filter,
  XCircle
} from 'lucide-react';
import { Settings, Plus, Trash2, Activity } from 'lucide-react';
import { Conflict, Manifest, SeverityLevel } from '../types';
import { SEVERITY_COLORS } from '../constants';

interface ConflictListProps {
  manifest: Manifest;
  detecting: boolean;
  onDetect: (id: string) => void;
  onResolve: (manifestId: string, conflictId: string, justification: string) => void;
  onUnresolve: (manifestId: string, conflictId: string) => void;
  severities: SeverityLevel[];
  onUpdateSeverities: (severities: SeverityLevel[]) => void;
}

export default function ConflictList({ 
  manifest, 
  detecting, 
  onDetect, 
  onResolve, 
  onUnresolve,
  severities,
  onUpdateSeverities
}: ConflictListProps) {
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [newSev, setNewSev] = useState<Partial<SeverityLevel> | null>(null);

  const activeConflicts = manifest.detectedConflicts.filter(c => 
    !c.resolved && 
    (!severityFilter || c.severity === severityFilter) &&
    (!typeFilter || c.type === typeFilter)
  );

  const resolvedConflicts = manifest.detectedConflicts.filter(c => c.resolved);

  const handleCommitResolve = (conflictId: string) => {
    if (!justification.trim()) return;
    onResolve(manifest.id, conflictId, justification);
    setResolvingId(null);
    setJustification('');
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 mb-8 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-5">
        <AlertTriangle className="w-32 h-32" />
      </div>
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div>
          <h4 className="text-sm font-black uppercase tracking-widest text-rose-400 mb-1">Inference & Logic Conflict Analysis</h4>
          <p className="text-[10px] text-slate-500 font-mono italic px-1">Statistical and symbolic verification of business rule coherence.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsConfiguring(!isConfiguring)}
            className={`p-2 rounded-lg border transition-all ${isConfiguring ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'}`}
            title="Configure Severity Matrix"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div className="flex border border-slate-800 rounded-lg overflow-hidden">
             <select 
               className="bg-slate-900 text-[10px] text-slate-400 px-2 py-1 outline-none border-r border-slate-800 uppercase font-bold"
               value={severityFilter || ''}
               onChange={(e) => setSeverityFilter(e.target.value || null)}
             >
               <option value="">All Severities</option>
               {severities.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
             </select>
             <select 
               className="bg-slate-900 text-[10px] text-slate-400 px-2 py-1 outline-none uppercase font-bold"
               value={typeFilter || ''}
               onChange={(e) => setTypeFilter(e.target.value || null)}
             >
               <option value="">All Types</option>
               <option value="Data Source vs. Rule">Data Source vs. Rule</option>
               <option value="Rule Ambiguity">Rule Ambiguity</option>
               <option value="Other">Other</option>
             </select>
          </div>
          <button 
            onClick={() => onDetect(manifest.id)}
            disabled={detecting}
            className="text-[10px] font-black text-rose-500 hover:text-rose-400 uppercase tracking-widest transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <GitMerge className="w-3.5 h-3.5" />}
            {detecting ? 'Analyzing...' : 'Re-scan Conflicts'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isConfiguring && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
              <h5 className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-4 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Severity Matrix Configuration
              </h5>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
                {severities.map((sev) => (
                  <div key={sev.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 group relative">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${SEVERITY_COLORS[sev.color]}`}>
                        {sev.name}
                      </span>
                      <button 
                        onClick={() => onUpdateSeverities(severities.filter(s => s.id !== sev.id))}
                        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-rose-500 transition-all p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight italic">{sev.impact}</p>
                  </div>
                ))}
                
                {newSev ? (
                  <div className="bg-slate-950 p-3 rounded-lg border border-indigo-500/30 space-y-2 animate-in zoom-in-95">
                    <input 
                       className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-[10px] text-slate-200 uppercase font-black outline-none focus:border-indigo-500"
                       placeholder="Severity Name"
                       value={newSev.name || ''}
                       onChange={e => setNewSev({...newSev, name: e.target.value})}
                    />
                    <textarea 
                       className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-[10px] text-slate-400 italic outline-none focus:border-indigo-500"
                       placeholder="Impact definition..."
                       rows={2}
                       value={newSev.impact || ''}
                       onChange={e => setNewSev({...newSev, impact: e.target.value})}
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {(['rose', 'amber', 'emerald', 'blue', 'purple', 'slate'] as const).map(c => (
                          <button 
                            key={c}
                            onClick={() => setNewSev({...newSev, color: c})}
                            className={`w-3 h-3 rounded-full border border-white/20 ${c === 'rose' ? 'bg-rose-500' : c === 'amber' ? 'bg-amber-500' : c === 'emerald' ? 'bg-emerald-500' : c === 'blue' ? 'bg-blue-500' : c === 'purple' ? 'bg-purple-500' : 'bg-slate-500'} ${newSev.color === c ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950' : ''}`}
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            if (newSev.name && newSev.impact && newSev.color) {
                              onUpdateSeverities([...severities, { ...newSev, id: Date.now().toString() } as any]);
                              setNewSev(null);
                            }
                          }}
                          className="bg-indigo-500 hover:bg-indigo-600 text-white p-1 rounded"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setNewSev(null)} className="text-slate-500 pt-1"><XCircle className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button 
                    onClick={() => setNewSev({ color: 'blue' })}
                    className="border-2 border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center p-3 text-slate-600 hover:text-slate-400 hover:border-slate-700 transition-all"
                  >
                    <Plus className="w-4 h-4 mb-1" />
                    <span className="text-[10px] font-black uppercase">Add Definition</span>
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-4 relative z-10">
        <AnimatePresence mode="popLayout">
          {activeConflicts.map((conflict) => (
            <motion.div
              key={conflict.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`p-4 rounded-xl border ${
                conflict.severity === 'High' ? 'bg-rose-500/5 border-rose-500/20' :
                conflict.severity === 'Medium' ? 'bg-amber-500/5 border-amber-500/20' :
                'bg-blue-500/5 border-blue-500/20'
              } group relative`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className={`mt-1 p-2 rounded-lg ${
                    conflict.severity === 'High' ? 'bg-rose-500/20 text-rose-400' :
                    conflict.severity === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    <AlertOctagon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                        conflict.severity === 'High' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                        conflict.severity === 'Medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                        'bg-blue-500/10 border-blue-500/20 text-blue-400'
                      }`}>{conflict.severity} Risk</span>
                      <span className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">{conflict.type}</span>
                    </div>
                    <h5 className="text-sm font-bold text-slate-200 mb-1.5">{conflict.description}</h5>
                    {conflict.suggestion && (
                      <div className="text-[11px] text-slate-400 italic mb-2 bg-slate-900/50 p-2 rounded border border-slate-800/50">
                        <span className="text-emerald-500 font-bold not-italic mr-1">Mitigation:</span> {conflict.suggestion}
                      </div>
                    )}
                    {conflict.involvedAssets && (
                       <div className="flex flex-wrap gap-2 mt-2">
                          {conflict.involvedAssets.map(asset => (
                             <span key={asset} className="text-[9px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700/50 font-mono">
                                {asset}
                             </span>
                          ))}
                       </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                   <button 
                     onClick={() => setResolvingId(conflict.id)}
                     className="text-[10px] font-black uppercase bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-3 py-1.5 rounded-lg transition-all active:scale-95"
                   >
                     Resolve
                   </button>
                </div>
              </div>

              {resolvingId === conflict.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-4 pt-4 border-t border-slate-800"
                >
                   <label className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-2">Resolution Justification (Audit Required)</label>
                   <div className="flex gap-3">
                      <textarea 
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 outline-none focus:border-emerald-500/50 transition-colors"
                        rows={2}
                        placeholder="Detail why this conflict is functionally acceptable for production release..."
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                      />
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => handleCommitResolve(conflict.id)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-[10px] px-4 py-2 rounded-xl transition-colors shadow-lg shadow-emerald-500/10"
                        >
                          Commit
                        </button>
                        <button 
                          onClick={() => { setResolvingId(null); setJustification(''); }}
                          className="text-[10px] font-black uppercase text-slate-600 hover:text-slate-400 py-1"
                        >
                          Cancel
                        </button>
                      </div>
                   </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {activeConflicts.length === 0 && (
          <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-2xl opacity-40">
             <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
             <p className="text-xs font-mono uppercase tracking-widest text-slate-500">Atomic Integrity Verified</p>
          </div>
        )}

        {resolvedConflicts.length > 0 && (
           <div className="mt-12 pt-8 border-t border-slate-800/50">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-4 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" /> Historical Overrides ({resolvedConflicts.length})
              </h5>
              <div className="space-y-3">
                {resolvedConflicts.map(conflict => (
                   <div key={conflict.id} className="bg-slate-900/30 border border-slate-800/50 p-4 rounded-xl flex items-start justify-between group/res">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 opacity-50">
                           <span className="text-[9px] font-bold uppercase py-0.5 px-1.5 rounded bg-slate-800 text-slate-400">{conflict.severity}</span>
                           <h6 className="text-xs font-medium text-slate-400 line-through">{conflict.description}</h6>
                        </div>
                        <div className="bg-slate-950/50 p-3 rounded-lg border-l-2 border-emerald-500/30">
                           <p className="text-[11px] text-slate-500 italic leading-relaxed">
                            <span className="text-emerald-500/50 font-black not-italic mr-2">AUDIT:</span>
                            {conflict.justification}
                           </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onUnresolve(manifest.id, conflict.id)}
                        className="opacity-0 group-hover/res:opacity-100 text-[9px] font-black uppercase text-slate-500 hover:text-amber-500 transition-all p-1"
                      >
                        Re-open
                      </button>
                   </div>
                ))}
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
