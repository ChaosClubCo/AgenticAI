import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Database, Play, ShieldCheck, Network, Layers, LayoutGrid, Share2, Orbit, Search, RefreshCw } from 'lucide-react';
import * as d3 from 'd3';
import { DependencyGraph as IDependencyGraph, Manifest } from '../types';

interface DependencyGraphProps {
  manifest: Manifest;
  analyzing: boolean;
  onRefresh: (id: string) => void;
  onClose: () => void;
}

export default function DependencyGraph({ manifest, analyzing, onRefresh, onClose }: DependencyGraphProps) {
  const [graphSearchTerm, setGraphSearchTerm] = useState('');
  const [graphLayout, setGraphLayout] = useState<'hierarchical' | 'grid' | 'force' | 'radial'>('hierarchical');
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number, y: number }>>({});
  const graphContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!manifest.dependencyGraph || !graphContainerRef.current) return;

    const width = graphContainerRef.current.clientWidth || 800;
    const height = 500;
    const nodes = manifest.dependencyGraph.nodes.map(n => ({ ...n, x: 0, y: 0 }));
    const links = manifest.dependencyGraph.links.map(l => ({ ...l, source: l.from, target: l.to }));
    
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
  }, [manifest.dependencyGraph, graphLayout, manifest.id]);

  return (
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

          {analyzing && (
            <div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold uppercase animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" /> Analyzing...
            </div>
          )}
          <button 
            onClick={() => onRefresh(manifest.id)}
            className="text-[10px] font-bold text-slate-500 hover:text-indigo-400 uppercase tracking-widest transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" /> Refresh Analysis
          </button>
        </div>
      </div>

      {analyzing ? (
        <div className="h-[500px] flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Generating Dependency Matrix...</div>
        </div>
      ) : (
        <div ref={graphContainerRef} className="relative h-[500px] py-8 overflow-hidden rounded-xl bg-slate-950/20 border border-slate-800/30">
          <svg className="absolute inset-0 pointer-events-none w-full h-full">
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="22" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#475569" opacity="0.5" />
              </marker>
            </defs>
            {manifest.dependencyGraph?.links.map((link, idx) => {
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

          {manifest.dependencyGraph?.nodes.map((node) => {
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
                  x: pos.x - 100,
                  y: pos.y - 25
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

          {graphSearchTerm && manifest.dependencyGraph?.nodes.filter(n => n.label.toLowerCase().includes(graphSearchTerm.toLowerCase())).length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Search className="w-8 h-8 opacity-20" />
              <p className="text-sm italic">No nodes matching "{graphSearchTerm}"</p>
            </div>
          )}

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
           onClick={onClose}
           className="text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors"
         >
           Close Topology
         </button>
      </div>
    </div>
  );
}
