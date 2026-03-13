import { ArrowRight } from 'lucide-react';

export default function ExecutiveSummary() {
  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight">
          Building Agentic AI for Corporate Fluidity
        </h2>
        <p className="text-xl text-slate-500 mt-4 leading-relaxed">
          As enterprises increasingly adopt agentic AI, a critical structural flaw has emerged: most AI infrastructure is built on the assumption that corporate boundaries are permanent.
        </p>
      </header>

      <div className="prose prose-slate max-w-none">
        <p className="text-lg leading-relaxed text-slate-700">
          With Fortune 500 companies undergoing significant mergers, acquisitions, or divestitures every 3.5 years, "tightly coupled" AI systems are becoming a source of massive technical and financial debt. Gartner predicts that over 40% of agentic AI projects will be canceled by 2027, driven not just by cost and value concerns, but by a lack of portability.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <h3 className="text-lg font-display font-semibold text-slate-900 mb-2">The Brain</h3>
          <p className="text-slate-600 text-sm leading-relaxed">
            The Large Language Model (LLM) and its raw cognitive potential. Highly portable, generic reasoning engine that rapidly evolves.
          </p>
        </div>
        <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
          <h3 className="text-lg font-display font-semibold text-indigo-900 mb-2">The Skeleton</h3>
          <p className="text-indigo-800 text-sm leading-relaxed">
            The underlying infrastructure providing form, movement, and identity. Often rigidly fused to a single corporate identity, becoming a liability during restructuring.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 text-white p-8 rounded-3xl mt-12 shadow-xl">
        <h3 className="text-2xl font-display font-semibold mb-4">The Strategic Imperative</h3>
        <p className="text-slate-300 leading-relaxed mb-6">
          To ensure long-term viability, CIOs must pivot from focusing solely on the "brain" to the "skeleton". This infrastructure must be "transplantable"—capable of being surgically separated or integrated during corporate restructuring without catastrophic failure.
        </p>
        <div className="flex items-center text-indigo-400 font-medium text-sm tracking-wide uppercase">
          Success requires architectural divisibility <ArrowRight className="w-4 h-4 ml-2" />
        </div>
      </div>
    </div>
  );
}
