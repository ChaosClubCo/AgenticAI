import { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Circle } from 'lucide-react';

export default function ReadinessTest() {
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({
    q1: null,
    q2: null,
    q3: null,
    q4: null,
    q5: null,
  });

  const questions = [
    {
      id: 'q1',
      text: "Can this system operate under a different corporate identity tomorrow?",
      detail: "If the parent company's identity systems, security infrastructure, or enterprise agreements were removed, would the agent still function?"
    },
    {
      id: 'q2',
      text: "Is the boundary of the intellectual property clear?",
      detail: "Can the organization demonstrate exactly which training data, business rules, and model weights belong to which entity?"
    },
    {
      id: 'q3',
      text: "Are permissions handled via configurable infrastructure?",
      detail: "Instead of being hard-coded into the agent's logic, is authorization externalized?"
    },
    {
      id: 'q4',
      text: "Does the architecture inherently understand residency requirements?",
      detail: "Can it separate data subject to different regulations (GDPR, HIPAA, PIPL) dynamically?"
    },
    {
      id: 'q5',
      text: "Is it clear which entity retains historical event streams?",
      detail: "Are derived insights and event streams explicitly attributed to business units at the design phase?"
    }
  ];

  const handleAnswer = (id: string, value: boolean) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const calculateScore = () => {
    const answeredCount = Object.values(answers).filter(a => a !== null).length;
    if (answeredCount < questions.length) return null;

    const yesCount = Object.values(answers).filter(a => a === true).length;
    
    if (yesCount === questions.length) return 'GREEN';
    if (yesCount >= 3) return 'YELLOW';
    return 'RED';
  };

  const score = calculateScore();
  const answeredCount = Object.values(answers).filter(a => a !== null).length;
  const progressPercentage = (answeredCount / questions.length) * 100;

  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-4xl font-display font-bold text-slate-900 tracking-tight">
          Transformation Readiness Test
        </h2>
        <p className="text-xl text-slate-500 mt-4 leading-relaxed">
          Evaluate the accumulation of transformation debt in your agentic AI investments.
        </p>
      </header>
      
      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div 
          className="bg-indigo-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      <div className="space-y-6">
        {questions.map((q, idx) => (
          <div key={q.id} className={`p-6 rounded-2xl border transition-colors ${
            answers[q.id] === true ? 'bg-emerald-50 border-emerald-200' :
            answers[q.id] === false ? 'bg-rose-50 border-rose-200' :
            'bg-white border-slate-200'
          }`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {answers[q.id] === true && <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />}
                  {answers[q.id] === false && <XCircle className="w-6 h-6 text-rose-500 shrink-0" />}
                  {answers[q.id] === null && <Circle className="w-6 h-6 text-slate-300 shrink-0" />}
                  <h3 className="text-lg font-semibold text-slate-900">
                    {q.text}
                  </h3>
                </div>
                <p className="text-slate-600 text-sm ml-9">{q.detail}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 ml-9 md:ml-0">
                <button
                  onClick={() => handleAnswer(q.id, true)}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${
                    answers[q.id] === true 
                      ? 'bg-emerald-500 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={() => handleAnswer(q.id, false)}
                  className={`px-6 py-2 rounded-full text-sm font-semibold transition-colors ${
                    answers[q.id] === false 
                      ? 'bg-rose-500 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {score && (
        <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className={`p-10 rounded-3xl border-2 shadow-xl relative overflow-hidden ${
            score === 'GREEN' ? 'bg-emerald-50 border-emerald-200' :
            score === 'YELLOW' ? 'bg-amber-50 border-amber-200' :
            'bg-rose-50 border-rose-200'
          }`}>
            {/* Background Decoration */}
            <div className={`absolute -right-10 -top-10 opacity-10 ${
              score === 'GREEN' ? 'text-emerald-500' :
              score === 'YELLOW' ? 'text-amber-500' :
              'text-rose-500'
            }`}>
              {score === 'GREEN' && <CheckCircle2 className="w-64 h-64" />}
              {score === 'YELLOW' && <AlertTriangle className="w-64 h-64" />}
              {score === 'RED' && <XCircle className="w-64 h-64" />}
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className={`w-32 h-32 shrink-0 rounded-full flex items-center justify-center border-8 ${
                score === 'GREEN' ? 'bg-emerald-100 border-emerald-200 text-emerald-600' :
                score === 'YELLOW' ? 'bg-amber-100 border-amber-200 text-amber-600' :
                'bg-rose-100 border-rose-200 text-rose-600'
              }`}>
                <span className="text-4xl font-display font-black">{score}</span>
              </div>
              
              <div>
                <h3 className="text-3xl font-display font-bold text-slate-900 mb-3">
                  {score === 'GREEN' ? 'Approved for Deployment' :
                   score === 'YELLOW' ? 'Requires Quarterly Review' :
                   'Project Rejected'}
                </h3>
                <p className={`text-lg leading-relaxed ${
                  score === 'GREEN' ? 'text-emerald-800' :
                  score === 'YELLOW' ? 'text-amber-800' :
                  'text-rose-800'
                }`}>
                  {score === 'GREEN' ? 'System is fully divisible; passes both identity and IP clarity tests. You are building a transplantable asset.' :
                   score === 'YELLOW' ? 'System has minor dependencies but includes a documented 90-day separation roadmap. Monitor closely during transformations.' :
                   'System is tightly coupled to parent infrastructure; no manifest exists. You are accumulating transformation debt. Redesign mandatory.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
