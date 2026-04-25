import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Key, 
  RotateCw, 
  Trash2, 
  Plus, 
  ShieldCheck, 
  History, 
  Copy, 
  Check, 
  ExternalLink,
  Shield,
  Eye,
  EyeOff,
  Search,
  Lock,
  Clock,
  User,
  Activity
} from 'lucide-react';
import { Manifest, APIKey, AuditEvent, APIKeyPermission } from '../types';

interface APIKeyManagementProps {
  manifest: Manifest;
  onUpdate: (manifestId: string, updates: Partial<Manifest>) => void;
}

export default function APIKeyManagement({ manifest, onUpdate }: APIKeyManagementProps) {
  const [showKeyId, setShowKeyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newPermissions, setNewPermissions] = useState<APIKeyPermission[]>([APIKeyPermission.READ_ONLY]);
  const [activeTab, setActiveTab] = useState<'keys' | 'audit'>('keys');

  const keys = manifest.apiKeys || [];
  const logs = manifest.auditLog || [];

  const filteredKeys = keys.filter(k => 
    k.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = logs.filter(l => 
    l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.action.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const generateKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'sk-ant-';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return;

    const newKey: APIKey = {
      id: crypto.randomUUID(),
      name: newKeyName,
      key: generateKey(),
      permissions: newPermissions,
      createdAt: new Date().toISOString(),
      status: 'active'
    };

    const newAudit: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action: 'key_generated',
      actor: 'System Admin',
      details: `Generated new API key: ${newKey.name} with permissions: ${newPermissions.join(', ')}`,
      metadata: { keyId: newKey.id, permissions: newPermissions }
    };

    onUpdate(manifest.id, {
      apiKeys: [newKey, ...keys],
      auditLog: [newAudit, ...logs]
    });

    setNewKeyName('');
    setNewPermissions([APIKeyPermission.READ_ONLY]);
    setIsAdding(false);
  };

  const handleRotateKey = (keyId: string) => {
    const targetKey = keys.find(k => k.id === keyId);
    if (!targetKey) return;

    const updatedKeys = keys.map(k => {
      if (k.id === keyId) {
        return {
          ...k,
          key: generateKey(),
          rotatedAt: new Date().toISOString()
        };
      }
      return k;
    });

    const newAudit: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action: 'key_rotated',
      actor: 'System Admin',
      details: `Rotated API key: ${targetKey.name}`,
      metadata: { keyId }
    };

    onUpdate(manifest.id, {
      apiKeys: updatedKeys,
      auditLog: [newAudit, ...logs]
    });
  };

  const handleRevokeKey = (keyId: string) => {
    const targetKey = keys.find(k => k.id === keyId);
    if (!targetKey) return;

    const updatedKeys = keys.map(k => {
      if (k.id === keyId) {
        return {
          ...k,
          status: 'revoked' as const,
          revokedAt: new Date().toISOString()
        };
      }
      return k;
    });

    const newAudit: AuditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action: 'key_revoked',
      actor: 'System Admin',
      details: `Revoked API key: ${targetKey.name}`,
      metadata: { keyId }
    };

    onUpdate(manifest.id, {
      apiKeys: updatedKeys,
      auditLog: [newAudit, ...logs]
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/30">
        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-400" /> API Gateway & Access Control
          </h3>
          <p className="text-xs text-slate-500 font-mono mt-1">Manage secure integration endpoints and cryptographic access tokens.</p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button 
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'keys' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Access Keys
          </button>
          <button 
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'audit' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Audit Log
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              placeholder={activeTab === 'keys' ? "Search access keys..." : "Search audit events..."}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {activeTab === 'keys' && (
            <button 
              onClick={() => setIsAdding(true)}
              className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center gap-2 active:scale-95 shrink-0"
            >
              <Plus className="w-4 h-4" /> Generate Gateway Key
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'keys' ? (
            <motion.div 
              key="keys-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {isAdding && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-slate-900 border border-indigo-500/30 p-5 rounded-2xl flex flex-col gap-6 shadow-[0_0_40px_rgba(99,102,241,0.15)]"
                >
                  <div className="flex flex-col md:flex-row items-center gap-4">
                    <div className="relative flex-1 w-full">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Key Identifier (e.g. CI/CD Pipeline, External Observer)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-indigo-400 font-mono transition-all"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                      />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button 
                        onClick={handleCreateKey}
                        className="flex-1 md:flex-none px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95"
                      >
                        Confirm Generation
                      </button>
                      <button 
                        onClick={() => setIsAdding(false)}
                        className="flex-1 md:flex-none px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                      >
                        Abort
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-slate-500" />
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Assign Granular Permissions</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.values(APIKeyPermission).map((permission) => (
                        <button
                          key={permission}
                          onClick={() => {
                            setNewPermissions(prev => 
                              prev.includes(permission) 
                                ? prev.filter(p => p !== permission && prev.length > 1) 
                                : [...prev, permission]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                            newPermissions.includes(permission)
                              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                              : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'
                          }`}
                        >
                          {permission.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                    <p className="text-[9px] text-slate-600 font-mono italic">Keys must have at least one permission assigned for operational validity.</p>
                  </div>
                </motion.div>
              )}

              {filteredKeys.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-2xl">
                  <Key className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-mono italic">No active gateway keys identified in current scope.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredKeys.map((key) => (
                    <div 
                      key={key.id} 
                      className={`group bg-slate-900/50 border rounded-2xl p-5 transition-all hover:bg-slate-900 ${key.status === 'revoked' ? 'border-slate-800 opacity-60' : 'border-slate-800 hover:border-slate-700 shadow-lg'}`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${key.status === 'revoked' ? 'bg-slate-800 text-slate-500' : 'bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]'}`}>
                            <Shield className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-white uppercase tracking-tight">{key.name}</h4>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${key.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                {key.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                                <Clock className="w-3 h-3" /> Issued: {new Date(key.createdAt).toLocaleDateString()}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] font-mono">
                                <span className="text-slate-500">Scopes:</span>
                                <div className="flex gap-1">
                                  {key.permissions?.map(p => (
                                    <span key={p} className="text-indigo-400/80 bg-indigo-500/5 px-1 rounded border border-indigo-500/10 text-[9px] uppercase font-bold tracking-tighter">
                                      {p.split('_')[0]}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              {key.rotatedAt && (
                                <div className="flex items-center gap-1.5 text-[10px] text-amber-500/70 font-mono">
                                  <RotateCw className="w-3 h-3" /> Rotated: {new Date(key.rotatedAt).toLocaleDateString()}
                                </div>
                              )}
                              {key.revokedAt && (
                                <div className="flex items-center gap-1.5 text-[10px] text-rose-500/70 font-mono">
                                  <Trash2 className="w-3 h-3" /> Revoked: {new Date(key.revokedAt).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {key.status === 'active' && (
                          <div className="flex items-center gap-2 transition-opacity">
                            <button 
                              onClick={() => {
                                if (confirm(`Are you sure you want to rotate the key for "${key.name}"? This will invalidate the previous key immediately.`)) {
                                  handleRotateKey(key.id);
                                }
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-amber-400 rounded-lg transition-colors border border-ml-slate-700 flex items-center gap-2"
                              title="Rotate Key"
                            >
                              <RotateCw className="w-3.5 h-3.5" />
                              <span>Rotate</span>
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm(`Are you sure you want to revoke the key for "${key.name}"? This action is permanent.`)) {
                                  handleRevokeKey(key.id);
                                }
                              }}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-rose-500/10 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-400 rounded-lg transition-colors border border-slate-700 flex items-center gap-2"
                              title="Revoke Gateway Access"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="relative group/key">
                        <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
                          <code className="text-xs font-mono text-slate-400 select-all overflow-hidden whitespace-nowrap mask-fade-right">
                            {showKeyId === key.id ? key.key : '••••••••••••••••••••••••••••••••••••••••'}
                          </code>
                          <div className="flex items-center gap-2 shrink-0 ml-4">
                            <button 
                              onClick={() => setShowKeyId(showKeyId === key.id ? null : key.id)}
                              className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              {showKeyId === key.id ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => copyToClipboard(key.key, key.id)}
                              className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors relative"
                            >
                              <AnimatePresence>
                                {copiedId === key.id ? (
                                  <motion.div 
                                    initial={{ scale: 0 }} 
                                    animate={{ scale: 1 }} 
                                    exit={{ scale: 0 }}
                                    className="absolute inset-0 flex items-center justify-center bg-slate-950"
                                  >
                                    <Check className="w-4 h-4 text-emerald-400" />
                                  </motion.div>
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </AnimatePresence>
                              <Copy className="w-4 h-4 opacity-0" />
                            </button>
                          </div>
                        </div>
                        {key.status === 'revoked' && (
                          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                            <span className="text-[10px] font-black uppercase text-rose-500/80 tracking-widest decoration-double line-through">Access Permanently Extinguished</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="audit-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {filteredLogs.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-2xl">
                  <History className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-mono italic">No cryptographic events logged in current audit window.</p>
                </div>
              ) : (
                <div className="border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-900/50 border-b border-slate-800">
                      <tr>
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500 tracking-widest">Event Timestamp</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500 tracking-widest">Action</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500 tracking-widest">Principal</th>
                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-500 tracking-widest">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/40 transition-colors group">
                          <td className="px-4 py-3 text-[11px] font-mono text-slate-400">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${
                              log.action.includes('revoked') ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                              log.action.includes('rotated') ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                              log.action.includes('generated') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                              'bg-slate-800 border-slate-700 text-slate-400'
                            }`}>
                              {log.action.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center">
                                <User className="w-3 h-3 text-slate-500" />
                              </div>
                              <span className="text-[11px] font-bold text-slate-300">{log.actor}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-[11px] text-slate-400 leading-relaxed font-mono">{log.details}</p>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4 bg-slate-900/50 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Gateway Health: Optimized</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Encryption: AES-256-GCM</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono">
          <History className="w-3.5 h-3.5" /> Retention Policy: 365 Days
        </div>
      </div>
    </div>
  );
}
