/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, AlertTriangle, Layers, CheckSquare, ChevronRight, ShieldCheck, Database, Globe, Fingerprint } from 'lucide-react';

// Components
import ExecutiveSummary from './components/ExecutiveSummary';
import TheCrisis from './components/TheCrisis';
import CorePrinciples from './components/CorePrinciples';
import ExternalizedAuth from './components/ExternalizedAuth';
import DomainMetadata from './components/DomainMetadata';
import JurisdictionalAwareness from './components/JurisdictionalAwareness';
import IntelligenceManifest from './components/IntelligenceManifest';
import ReadinessTest from './components/ReadinessTest';

const SECTIONS = [
  { id: 'summary', title: 'Executive Summary', icon: BookOpen, component: ExecutiveSummary },
  { id: 'crisis', title: 'The Portability Crisis', icon: AlertTriangle, component: TheCrisis },
  { id: 'principles', title: 'Core Principles', icon: Layers, component: CorePrinciples },
  { id: 'auth', title: 'Externalized Auth', icon: ShieldCheck, component: ExternalizedAuth },
  { id: 'metadata', title: 'Domain Metadata', icon: Database, component: DomainMetadata },
  { id: 'jurisdiction', title: 'Jurisdictional Awareness', icon: Globe, component: JurisdictionalAwareness },
  { id: 'manifest', title: 'Intelligence Manifest', icon: Fingerprint, component: IntelligenceManifest },
  { id: 'test', title: 'Readiness Test', icon: CheckSquare, component: ReadinessTest },
];

export default function App() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);

  const ActiveComponent = SECTIONS.find(s => s.id === activeSection)?.component || ExecutiveSummary;

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-display font-bold text-white leading-tight">
            The Transplantable Skeleton
          </h1>
          <p className="text-xs mt-2 text-slate-400 uppercase tracking-wider font-semibold">
            Agentic AI Infrastructure
          </p>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? 'bg-indigo-500/10 text-indigo-400' 
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span className="truncate">{section.title}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto shrink-0" />}
              </button>
            );
          })}
        </nav>
        <div className="p-6 border-t border-slate-800 text-xs text-slate-500">
          Strategic Assessment Framework v2026.1
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative bg-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="max-w-5xl mx-auto p-12 pb-24"
          >
            <ActiveComponent />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
