import { motion, AnimatePresence } from 'motion/react';
import { 
  Github, 
  Cpu, 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Webhook, 
  Download, 
  Trash2,
  Activity
} from 'lucide-react';
import { Manifest } from '../types';

interface CIIntegrationProps {
  manifest: Manifest;
  onBind: (id: string, provider: 'github' | 'jenkins' | 'none') => void;
  onSimulate: (id: string) => void;
  disabled?: boolean;
}

export default function CIIntegration({ manifest, onBind, onSimulate, disabled }: CIIntegrationProps) {
  const ci = manifest.ciSettings;
  const isCIBound = ci && ci.provider !== 'none';

  const getCodeSnippet = () => {
    if (ci?.provider === 'github') {
      return `name: Attest Manifest
on: [push]
jobs:
  attest:
    runs-on: ubuntu-latest
    steps:
    - name: Sync AI Asset Ledger
      run: |
        curl -X POST https://api.internal/v1/attest \\
             -H "Authorization: Bearer \${{ secrets.CI_TOKEN }}"`;
    }
    return `pipeline {
  agent any
  stages {
    stage('Attest Manifest') {
      steps {
        sh '''curl -X POST https://api.internal/v1/attest \\
             -H "Authorization: Bearer $CI_TOKEN"'''
      }
    }
  }
}`;
  };

  return (
    <section className={`pt-8 border-t border-slate-800 transition-opacity ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between mb-6">
        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Webhook className="w-4 h-4 text-indigo-400" /> DevSecOps Pipeline Orchestration
        </h4>
        {isCIBound && (
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-bold text-emerald-500/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase">
              Webhook Active
            </span>
          </div>
        )}
      </div>

      {!isCIBound ? (
        <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 p-10 rounded-2xl flex flex-col items-center justify-center text-center gap-4 transition-all hover:bg-slate-900/80 group">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Activity className="w-8 h-8 text-slate-600" />
          </div>
          <div>
            <h5 className="text-sm font-black text-slate-300 uppercase tracking-tight">Bind Intelligence Ledger</h5>
            <p className="text-[11px] text-slate-500 mt-2 max-w-[340px] leading-relaxed">Automate systemic attestation by integrating your CI/CD provider. This enables real-time logic verification on every push.</p>
          </div>
          <div className="flex gap-4 mt-4">
            <button 
              onClick={() => onBind(manifest.id, 'github')} 
              className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-950 hover:bg-black border border-slate-700 hover:border-slate-500 text-[10px] text-slate-200 font-black uppercase tracking-widest rounded-xl transition-all shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              <Github className="w-4 h-4" /> GitHub Actions
            </button>
            <button 
              onClick={() => onBind(manifest.id, 'jenkins')} 
              className="flex items-center gap-2.5 px-5 py-2.5 bg-slate-950 hover:bg-black border border-slate-700 hover:border-slate-500 text-[10px] text-slate-200 font-black uppercase tracking-widest rounded-xl transition-all shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              <Cpu className="w-4 h-4 text-amber-500" /> Jenkins CI
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
            <div className="flex items-center gap-5">
              <div className={`p-4 rounded-2xl shadow-inner ${ci.provider === 'github' ? 'bg-slate-800' : 'bg-amber-500/10'}`}>
                {ci.provider === 'github' ? (
                  <Github className="w-8 h-8 text-white" />
                ) : (
                  <Cpu className="w-8 h-8 text-amber-500" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h5 className="text-base font-black text-white uppercase tracking-tighter">
                    {ci.provider === 'github' ? 'GitHub Actions' : 'Jenkins Master Pipeline'}
                  </h5>
                  <span className="px-2 py-1 bg-indigo-500/10 border border-indigo-500/20 text-[8px] font-black text-indigo-400 rounded uppercase tracking-widest">Linked</span>
                </div>
                <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase opacity-70 tracking-tighter">Branch: production-release — ref: HEAD:attest-v1</p>
              </div>
            </div>
            
            <AnimatePresence mode="wait">
              {ci.lastRunStatus === 'running' ? (
                <motion.div 
                  key="running"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.1 }}
                  className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.15)]"
                >
                  <Loader2 className="w-4 h-4 animate-spin" /> RUNNING: ATTESTATION_JOB
                </motion.div>
              ) : ci.lastRunStatus === 'success' ? (
                <motion.div 
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                >
                  <CheckCircle className="w-4 h-4" /> STATE VERIFIED
                </motion.div>
              ) : ci.lastRunStatus === 'failure' ? (
                <motion.div 
                  key="failure"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 text-xs font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 px-4 py-2 rounded-xl border border-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.15)]"
                >
                  <AlertTriangle className="w-4 h-4" /> INTEGRITY BREACH
                </motion.div>
              ) : (
                <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700/50">
                  Awaiting Trigger
                </div>
              )}
            </AnimatePresence>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl shadow-inner group/stat">
                <div className="text-[9px] font-black text-slate-600 group-hover:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 transition-colors">
                  <Clock className="w-3.5 h-3.5 text-indigo-500/50" /> Synchronization Timestamp
                </div>
                <div className="text-[11px] text-slate-300 font-mono">
                  {ci.lastRunAt ? new Date(ci.lastRunAt).toISOString().replace('T', ' ').slice(0, 19) : 'No execution data available'}
                </div>
              </div>
              <div className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl shadow-inner group/stat">
                <div className="text-[9px] font-black text-slate-600 group-hover:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2 transition-colors">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/50" /> Enforcement Policy
                </div>
                <div className="text-[11px] text-slate-300 font-mono font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
                  Deterministic Strict-Pass 1.0
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Integration Manifest Snippet</div>
                <div className="text-[10px] text-slate-700 font-mono italic">
                  {ci.provider === 'github' ? '.github/workflows/manifest-scan.yml' : 'Jenkinsfile.ledger'}
                </div>
              </div>
              <div className="relative group/code">
                <pre className="p-5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-400 overflow-x-auto leading-loose shadow-2xl">
                  {getCodeSnippet().split('\n').map((line, i) => (
                    <div key={i} className="flex">
                      <span className="w-8 inline-block opacity-20 text-right pr-4 select-none">{i + 1}</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </pre>
                <button 
                  className="absolute top-4 right-4 p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg opacity-0 group-hover/code:opacity-100 transition-all hover:scale-105 text-slate-400 hover:text-white flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                  onClick={() => navigator.clipboard.writeText(getCodeSnippet())}
                >
                  <Download className="w-3.5 h-3.5" /> Copy
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800/50">
              <button 
                onClick={() => onBind(manifest.id, 'none')} 
                className="px-4 py-2 text-[9px] font-black text-slate-600 hover:text-rose-500 uppercase tracking-widest transition-all flex items-center gap-2 hover:bg-rose-500/5 rounded-lg"
              >
                <Trash2 className="w-3.5 h-3.5" /> Decommission Integration
              </button>
              <button 
                onClick={() => onSimulate(manifest.id)}
                disabled={ci.lastRunStatus === 'running'}
                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl shadow-xl hover:shadow-indigo-500/20 transition-all flex items-center gap-3 hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
              >
                {ci.lastRunStatus === 'running' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Webhook className="w-4 h-4" /> 
                )}
                {ci.lastRunStatus === 'running' ? 'Inverting System State...' : 'Simulate External Hook'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
