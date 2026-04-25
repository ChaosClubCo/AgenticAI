import { useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Plus, Trash2, Play, Info } from 'lucide-react';

type Effect = 'ALLOW' | 'DENY';

interface Policy {
  id: string;
  role: string;
  domain: string;
  action: string;
  effect: Effect;
  priority: number;
}

const DEFAULT_POLICIES: Policy[] = [
  { id: '1', role: 'AIOps_Agent', domain: 'Global_Network', action: 'Restart_Server', effect: 'ALLOW', priority: 1 },
  { id: '2', role: 'AIOps_Agent', domain: 'Retail_Ops', action: 'Restart_Server', effect: 'ALLOW', priority: 1 },
  { id: '3', role: 'Customer_Agent', domain: 'Retail_Ops', action: 'Issue_Refund', effect: 'ALLOW', priority: 1 },
  { id: '4', role: 'Customer_Agent', domain: 'B2B_Enterprise', action: 'Issue_Refund', effect: 'DENY', priority: 2 },
];

const ROLES = ['AIOps_Agent', 'Customer_Agent', 'Financial_Agent'];
const DOMAINS = ['Global_Network', 'Retail_Ops', 'B2B_Enterprise'];
const ACTIONS = ['Restart_Server', 'Issue_Refund', 'Access_Financials', 'Deploy_Code'];

export default function ExternalizedAuth() {
  const [policies, setPolicies] = useState<Policy[]>(DEFAULT_POLICIES);
  const [isLockdownMode, setIsLockdownMode] = useState(false);
  
  // Simulation State
  const [simRole, setSimRole] = useState(ROLES[0]);
  const [simDomain, setSimDomain] = useState(DOMAINS[0]);
  const [simAction, setSimAction] = useState(ACTIONS[0]);
  const [simContext, setSimContext] = useState<'Standard' | 'Emergency' | 'Maintenance'>('Standard');
  const [simResult, setSimResult] = useState<{ allowed: boolean; reason: string; matchedPolicy: Policy | null } | null>(null);

  // New Policy State
  const [newRole, setNewRole] = useState(ROLES[0]);
  const [newDomain, setNewDomain] = useState(DOMAINS[0]);
  const [newAction, setNewAction] = useState(ACTIONS[0]);
  const [newEffect, setNewEffect] = useState<Effect>('ALLOW');
  const [newPriority, setNewPriority] = useState(1);

  const addPolicy = () => {
    const policy: Policy = {
      id: Math.random().toString(36).substring(7),
      role: newRole,
      domain: newDomain,
      action: newAction,
      effect: newEffect,
      priority: newPriority
    };
    setPolicies([...policies, policy].sort((a, b) => b.priority - a.priority));
  };

  const removePolicy = (id: string) => {
    setPolicies(policies.filter(p => p.id !== id));
  };

  // The Externalized Policy Engine
  const evaluateAccess = () => {
    if (isLockdownMode) {
      setSimResult({
        allowed: false,
        reason: 'DYNAMIC ADJUSTMENT: Global Lockdown Mode is active. All agent actions are suspended regardless of individual policies.',
        matchedPolicy: null
      });
      return;
    }

    if (simContext === 'Maintenance' && (simAction === 'Restart_Server' || simAction === 'Deploy_Code')) {
       // Automatic allow during maintenance for certain roles maybe?
    }

    // Default Deny
    let isAllowed = false;
    let matchedPolicy: Policy | null = null;

    // Policies are sorted by priority (descending)
    for (const policy of policies) {
      if (
        (policy.role === '*' || policy.role === simRole) &&
        (policy.domain === '*' || policy.domain === simDomain) &&
        (policy.action === '*' || policy.action === simAction)
      ) {
        matchedPolicy = policy;
        if (policy.effect === 'DENY') {
          isAllowed = false;
          break; // Explicit deny overrides everything at the same or lower priority
        } else if (policy.effect === 'ALLOW') {
          isAllowed = true;
          break; // First match wins (since we sorted by priority)
        }
      }
    }

    if (matchedPolicy) {
      setSimResult({
        allowed: isAllowed,
        reason: isAllowed 
          ? `Authorization GRANTED. Matched policy [ID: ${matchedPolicy.id}] with priority ${matchedPolicy.priority}.` 
          : `Authorization REFUSED. Matched a DENY policy [ID: ${matchedPolicy.id}] which overrides matching ALLOW rules.`,
        matchedPolicy
      });
    } else {
      setSimResult({
        allowed: false,
        reason: 'Implicit DENY: No matching policy was found in the centralized repository. Agents are prohibited from performing unmapped actions.',
        matchedPolicy: null
      });
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">
              Externalized Authorization Engine
            </h2>
            <p className="text-lg text-slate-500 mt-2 leading-relaxed max-w-2xl">
              Permissions are managed separately from the agent's core logic. Agents query this engine to determine if an action is permitted, allowing boundaries to shift without rewriting agent code.
            </p>
          </div>
          <button 
            onClick={() => {
              setIsLockdownMode(!isLockdownMode);
              setSimResult(null);
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
              isLockdownMode 
                ? 'bg-rose-600 text-white shadow-rose-500/30' 
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className={`w-5 h-5 ${isLockdownMode ? 'animate-pulse' : ''}`} />
            {isLockdownMode ? 'LIFT GLOBAL LOCKDOWN' : 'ACTIVATE GLOBAL LOCKDOWN'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Policy Configuration */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-slate-900">Policy Configuration</h3>
          </div>
          
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <select className="p-2 text-sm border border-slate-300 rounded-lg" value={newRole} onChange={e => setNewRole(e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select className="p-2 text-sm border border-slate-300 rounded-lg" value={newDomain} onChange={e => setNewDomain(e.target.value)}>
                {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="p-2 text-sm border border-slate-300 rounded-lg" value={newAction} onChange={e => setNewAction(e.target.value)}>
                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <div className="flex gap-2">
                <select className="flex-1 p-2 text-sm border border-slate-300 rounded-lg font-semibold" value={newEffect} onChange={e => setNewEffect(e.target.value as Effect)}>
                  <option value="ALLOW">ALLOW</option>
                  <option value="DENY">DENY</option>
                </select>
                <input 
                  type="number" 
                  min="1" 
                  max="10" 
                  title="Priority (1-10)"
                  className="w-12 p-2 text-sm border border-slate-300 rounded-lg text-center"
                  value={newPriority}
                  onChange={e => setNewPriority(parseInt(e.target.value))}
                />
              </div>
            </div>
            <button onClick={addPolicy} className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors">
              <Plus className="w-4 h-4" /> Add Policy Rule
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-96">
            {policies.map(policy => (
              <div key={policy.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mb-1 ${policy.effect === 'ALLOW' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {policy.effect}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">P{policy.priority}</span>
                  </div>
                  <div className="text-sm text-slate-700">
                    <span className="font-semibold text-indigo-600 font-mono">{policy.role}</span>
                    <span className="mx-1 opacity-50">→</span> 
                    <span className="font-semibold">{policy.action}</span>
                    <span className="mx-1 opacity-50">@</span>
                    <span className="font-semibold text-slate-500 italic">{policy.domain}</span>
                  </div>
                </div>
                <button onClick={() => removePolicy(policy.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {policies.length === 0 && (
              <div className="text-center text-slate-500 text-sm py-8">No policies defined. Default DENY applies to all actions.</div>
            )}
          </div>
        </div>

        {/* Agent Simulator */}
        <div className="bg-slate-900 rounded-2xl shadow-xl overflow-hidden flex flex-col border border-slate-800">
          <div className="bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-400" />
              <h3 className="font-semibold text-white">Agent Execution Simulator</h3>
            </div>
            {isLockdownMode && <span className="text-[10px] font-bold text-rose-500 animate-pulse uppercase tracking-widest bg-rose-500/10 px-2 py-1 rounded">System Lockdown</span>}
          </div>
          
          <div className="p-6 space-y-6 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Agent Identity</label>
                <select className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={simRole} onChange={e => setSimRole(e.target.value)}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Target Domain</label>
                <select className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={simDomain} onChange={e => setSimDomain(e.target.value)}>
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Requested Action</label>
                <select className="w-full p-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={simAction} onChange={e => setSimAction(e.target.value)}>
                  {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="block text-xs font-medium text-indigo-400 uppercase tracking-wider mb-2">Org Context</label>
                <select 
                  className="w-full p-3 bg-slate-800 border border-indigo-900/30 text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                  value={simContext} 
                  onChange={e => setSimContext(e.target.value as any)}
                >
                  <option value="Standard">Standard Ops</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Maintenance">Scheduled Maint</option>
                </select>
              </div>
            </div>

            <button 
              onClick={evaluateAccess}
              className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
            >
              Request Authorization
            </button>

            {simResult && (
              <div className={`p-5 rounded-xl border ${simResult.allowed ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'} animate-in fade-in slide-in-from-bottom-2`}>
                <div className="flex items-center gap-3 mb-4">
                  {simResult.allowed ? <ShieldCheck className="w-7 h-7 text-emerald-400" /> : <ShieldAlert className="w-7 h-7 text-rose-400" />}
                  <h4 className={`text-lg font-bold ${simResult.allowed ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {simResult.allowed ? 'ACTION AUTHORIZED' : 'ACTION DENIED'}
                  </h4>
                </div>
                
                <div className="space-y-3">
                  {simResult.matchedPolicy && (
                    <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800">
                      <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Matched Policy Rule</div>
                      <div className="text-sm text-slate-200 font-mono">
                        <span className={simResult.matchedPolicy.effect === 'ALLOW' ? 'text-emerald-400' : 'text-rose-400'}>[{simResult.matchedPolicy.effect}]</span> {simResult.matchedPolicy.role} → {simResult.matchedPolicy.action} @ {simResult.matchedPolicy.domain}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 items-start">
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {simResult.reason}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
