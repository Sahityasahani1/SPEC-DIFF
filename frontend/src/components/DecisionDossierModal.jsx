import React from 'react';
import { X, Printer, CheckCircle, AlertTriangle } from 'lucide-react';

export default function DecisionDossierModal({ comparisonData, onClose }) {
  if (!comparisonData || !comparisonData.products) return null;
  const { products, priority, winner_reason } = comparisonData;

  const handlePrint = () => {
    window.print();
  };

  const reportId = `SD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const timestamp = new Date().toLocaleString();

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:block">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto print:max-h-none print:shadow-none print:rounded-none">
        
        {/* Screen Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-[#e8e5dc] p-4 flex justify-between items-center print:hidden z-10">
          <h2 className="font-bold text-forest-950">Decision Dossier Preview</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="px-4 py-2 bg-forest-900 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-forest-800">
              <Printer className="w-4 h-4" /> Print Dossier
            </button>
            <button onClick={onClose} className="p-2 hover:bg-porcelain-100 rounded-lg text-forest-900/60">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Print Content Area */}
        <div id="dossier-content" className="p-8 print:p-0 text-black">
          
          {/* Header */}
          <div className="border-b-4 border-black pb-4 mb-6">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter mb-1">Hardware Decision Dossier</h1>
                <p className="font-mono text-sm">SpecDiff AI Intelligence Platform</p>
              </div>
              <div className="text-right font-mono text-xs">
                <p>Date: {new Date().toLocaleDateString()}</p>
                <p>Report ID: {reportId}</p>
                <p>Priority: {priority.toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Winner Highlight */}
          {winner_reason && (
            <div className="bg-gray-100 border-l-4 border-black p-4 mb-8">
              <h3 className="font-bold uppercase text-sm mb-1">Executive Summary</h3>
              <p className="text-sm">{winner_reason}</p>
            </div>
          )}

          {/* Comparison Table */}
          <div className="mb-8">
            <h3 className="font-bold uppercase border-b border-gray-300 pb-2 mb-4">Specifications Matrix</h3>
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="py-2">Feature</th>
                  {products.map(p => (
                    <th key={p.id} className="py-2 font-bold">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="py-2 font-semibold">Price</td>
                  {products.map(p => <td key={p.id} className="py-2">{p.formatted_price}</td>)}
                </tr>
                <tr>
                  <td className="py-2 font-semibold">Processor</td>
                  {products.map(p => <td key={p.id} className="py-2">{p.processor}</td>)}
                </tr>
                <tr>
                  <td className="py-2 font-semibold">Memory</td>
                  {products.map(p => <td key={p.id} className="py-2">{p.ram_gb}GB</td>)}
                </tr>
                <tr>
                  <td className="py-2 font-semibold">Storage</td>
                  {products.map(p => <td key={p.id} className="py-2">{p.storage_gb}GB</td>)}
                </tr>
                <tr>
                  <td className="py-2 font-semibold">Display</td>
                  {products.map(p => <td key={p.id} className="py-2">{p.display_tech}</td>)}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Product Deep Dives */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 mb-8">
            {products.map(p => (
              <div key={p.id} className="border border-gray-300 p-4 rounded-lg print:rounded-none">
                <h4 className="font-black text-lg mb-1">{p.name} {p.is_winner && '(WINNER)'}</h4>
                <p className="font-mono text-xs text-gray-600 mb-4">{p.brand} • {p.formatted_price}</p>
                
                {/* Pros/Cons */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <strong className="uppercase text-[10px] text-gray-500 block mb-1">Strengths</strong>
                    <ul className="space-y-1">
                      {p.pros?.map((pro, i) => (
                        <li key={i} className="flex gap-1 items-start">
                          <CheckCircle className="w-3 h-3 mt-1 shrink-0" /> <span className="leading-tight">{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong className="uppercase text-[10px] text-gray-500 block mb-1">Limitations</strong>
                    <ul className="space-y-1">
                      {p.cons?.map((con, i) => (
                        <li key={i} className="flex gap-1 items-start">
                          <AlertTriangle className="w-3 h-3 mt-1 shrink-0" /> <span className="leading-tight">{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Price Signal */}
                {p.price_signal && (
                  <div className="bg-gray-50 p-2 rounded text-xs mb-3">
                    <strong className="block mb-1">Price Analysis: {p.price_signal.signal}</strong>
                    <p>{p.price_signal.signal_reason}</p>
                  </div>
                )}

                {/* Benchmarks Summary */}
                {p.benchmarks && (
                  <div className="text-xs">
                    <strong className="block mb-1 border-b border-gray-200 pb-1">Performance Benchmarks</strong>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {p.benchmarks.geekbench_single && <div>GB6 Single: {p.benchmarks.geekbench_single}</div>}
                      {p.benchmarks.geekbench_multi && <div>GB6 Multi: {p.benchmarks.geekbench_multi}</div>}
                      {p.benchmarks.cinebench_r23_multi && <div>Cinebench: {p.benchmarks.cinebench_r23_multi}</div>}
                      {p.benchmarks.battery_index && <div>Battery Index: {p.benchmarks.battery_index}/100</div>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t-2 border-black pt-4 text-xs font-mono text-gray-500 text-center">
            <p className="mb-1 font-bold">All specifications verified. Benchmark scores derived from standardized testing methodologies.</p>
            <p>Generated by SpecDiff AI Hardware Intelligence Platform • {timestamp}</p>
          </div>

        </div>
      </div>
    </div>
  );
}
