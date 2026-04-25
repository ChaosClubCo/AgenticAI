/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, AlertTriangle, Layers, CheckSquare, ChevronRight, ShieldCheck, Database, Globe, Fingerprint, Menu, X, Loader2 } from 'lucide-react';

// Lazy load Components for graceful degradation and performance
const ExecutiveSummary = lazy(() => import('./components/ExecutiveSummary'));
const TheCrisis = lazy(() => import('./components/TheCrisis'));
const CorePrinciples = lazy(() => import('./components/CorePrinciples'));
const ExternalizedAuth = lazy(() => import('./components/ExternalizedAuth'));
const DomainMetadata = lazy(() => import('./components/DomainMetadata'));
const JurisdictionalAwareness = lazy(() => import('./components/JurisdictionalAwareness'));
const IntelligenceManifest = lazy(() => import('./components/IntelligenceManifest'));
const ReadinessTest = lazy(() => import('./components/ReadinessTest'));

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

/**
 * Custom Error Boundary to cleanly catch lazy-loading failures (e.g., chunk errors)
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 m-8 border border-rose-200 bg-rose-50 rounded-xl text-rose-600 flex flex-col items-center justify-center text-center">
          <AlertTriangle className="w-10 h-10 mb-4 text-rose-500" />
          <h3 className="text-lg font-bold mb-2">Component Failed to Load</h3>
          <p className="text-sm opacity-80 mb-4">The module could not be fetched. This may happen if the application was updated.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-rose-600 text-white rounded-lg shadow font-medium"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState(SECTIONS[0].id);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const ActiveComponent = SECTIONS.find(s => s.id === activeSection)?.component || ExecutiveSummary;

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden flex-col md:flex-row relative">
      
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 z-30 shadow-md">
        <h1 className="text-lg font-display font-bold text-white truncate pr-4">
          Transplantable Skeleton
        </h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors focus:ring-2 focus:ring-indigo-500"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Sidebar Backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Responsive Drawer/Fixed */}
      <aside 
        className={`fixed md:relative inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shadow-2xl md:shadow-none transition-transform duration-300 ease-in-out shrink-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-6 border-b border-slate-800 hidden md:block">
          <h1 className="text-xl font-display font-bold text-white leading-tight">
            The Transplantable Skeleton
          </h1>
          <p className="text-xs mt-2 text-slate-400 uppercase tracking-wider font-semibold">
            Agentic AI Infrastructure
          </p>
        </div>
        
        {/* Mobile Header duplicated inside drawer for better affordance */}
        <div className="p-6 border-b border-slate-800 md:hidden flex justify-between items-start">
          <div>
            <h1 className="text-lg font-display font-bold text-white leading-tight">
              Skeleton
            </h1>
            <p className="text-xs mt-1 text-slate-400 uppercase tracking-wider font-semibold">
              AI Infrastructure
            </p>
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(section.id);
                  setIsMobileMenuOpen(false);
                }}
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
      <main className="flex-1 overflow-y-auto relative bg-white h-[calc(100vh-65px)] md:h-screen w-full">
        <ErrorBoundary>
          <Suspense fallback={
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
              <span className="text-sm font-medium uppercase tracking-widest">Loading Module</span>
            </div>
          }>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="max-w-5xl mx-auto p-6 sm:p-8 md:p-12 pb-24"
              >
                <ActiveComponent />
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </ErrorBoundary>
      </main>
    </div>
  );
}
