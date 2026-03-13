import { Database, Shield, Network, FileText } from 'lucide-react';

export default function CorePrinciples() {
  const principles = [
    {
      icon: Network,
      title: "Semantic Coherence & Domain Autonomy",
      description: "The quest for a single, unified enterprise vocabulary is a myth. Maintain semantic coherence within internal domains while supporting external interoperability.",
      tactics: [
        "Mandate Decoupled Metadata Repositories",
        "Implement Semantic Adapter Patterns",
        "Ensure Domain Self-Sufficiency"
      ]
    },
    {
      icon: Database,
      title: "Explicit Ownership & Attribution",
      description: "Ownership cannot be an afterthought. Reject the monolithic data lake in favor of a federated data mesh where attribution is intrinsic to the data flow.",
      tactics: [
        "Historical Event Streams attribution",
        "Derived Insights documentation",
        "Domain Metadata stored locally"
      ]
    },
    {
      icon: Shield,
      title: "Externalized Authorization",
      description: "Agents must possess inherent boundary awareness. Reject hardcoded logic where permissions are embedded in the agent's behavioral code.",
      tactics: [
        "Permissions as configurable infrastructure",
        "Intelligence remains constant, scope adjusts",
        "Reconfigurable boundaries without code changes"
      ]
    },
    {
      icon: FileText,
      title: "Proprietary Intelligence Manifest",
      description: "Strategic competitive advantage is found in the lineage of intelligence. Maintain a real-time manifest documenting training sources and rules.",
      tactics: [
        "Precise inventory of Training Data Sources",
        "Versioned records of Specific Training Runs",
        "Documentation of Hardcoded Business Rules"
      ]
    }
  ];

  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight">
          Designing for Divisibility
        </h2>
        <p className="text-xl text-slate-500 mt-4 leading-relaxed">
          The core strategies for building a Transplantable Skeleton.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {principles.map((principle, idx) => {
          const Icon = principle.icon;
          return (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center shrink-0 text-indigo-600">
                  <Icon className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-display font-bold text-slate-900 mb-3">{principle.title}</h3>
                  <p className="text-slate-600 leading-relaxed mb-6">{principle.description}</p>
                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Architectural Directives</h4>
                    <ul className="space-y-2">
                      {principle.tactics.map((tactic, tIdx) => (
                        <li key={tIdx} className="flex items-center gap-2 text-sm text-slate-700 font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          {tactic}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
