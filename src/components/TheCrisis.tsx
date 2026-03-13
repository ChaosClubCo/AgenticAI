import { AlertCircle, Clock, DollarSign, TrendingDown } from 'lucide-react';

export default function TheCrisis() {
  const metrics = [
    {
      icon: Clock,
      value: "3.5 Years",
      label: "Frequency of Change",
      description: "Major M&A or divestiture frequency for average Fortune 500 firms."
    },
    {
      icon: AlertCircle,
      value: "12-24 Months",
      label: "Disentanglement Time",
      description: "Time required to separate infrastructure dependencies."
    },
    {
      icon: DollarSign,
      value: "$40M+",
      label: "Unplanned Spend",
      description: "Cost per major divestiture to resolve infrastructure debt."
    },
    {
      icon: TrendingDown,
      value: ">40%",
      label: "Project Failure Rate",
      description: "Gartner predicts cancellation of agentic AI projects by 2027."
    }
  ];

  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight">
          The Portability Crisis
        </h2>
        <p className="text-xl text-slate-500 mt-4 leading-relaxed">
          Defining Transformation Debt in Agentic AI
        </p>
      </header>

      <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl">
        <h3 className="text-rose-900 font-semibold mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          What is Transformation Debt?
        </h3>
        <p className="text-rose-800 text-sm leading-relaxed">
          The accumulation of technical and operational liabilities created when agentic AI infrastructure is tightly coupled to a specific organizational context. This debt manifests as the inability to surgically "transplant" AI systems without massive financial and temporal costs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div key={idx} className="p-6 border border-slate-200 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4 text-slate-600">
                <Icon className="w-6 h-6" />
              </div>
              <div className="text-3xl font-display font-bold text-slate-900 mb-1">{metric.value}</div>
              <div className="text-sm font-semibold text-slate-900 mb-2">{metric.label}</div>
              <div className="text-sm text-slate-500">{metric.description}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-12">
        <h3 className="text-2xl font-display font-bold text-slate-900 mb-6">The Three Pillars of Transformation Debt</h3>
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">1</div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900">Identity Infrastructure and Knowledge Graphs</h4>
              <p className="text-slate-600 mt-1">AI agents are often hard-coded into a parent company's security systems. If these are not divisible, the agent loses its "memory" and ability to function when the security perimeter changes.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">2</div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900">Monolithic Data Lakes and Observability</h4>
              <p className="text-slate-600 mt-1">When agents rely on a single data repository, "carving out" unit-specific data is nearly impossible, losing the audit trail for the new entity.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">3</div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900">API Dependencies and Authorization Boundaries</h4>
              <p className="text-slate-600 mt-1">Without externalized authorization, agents may attempt unauthorized actions across newly merged or separated organizational lines.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
