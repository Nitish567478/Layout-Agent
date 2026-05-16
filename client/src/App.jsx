import { useMemo } from 'react';
import useLayoutAgent from './hooks/useLayoutAgent.js';
import ChatWindow from './components/ChatWindow.jsx';
import WireframePreview from './components/WireframePreview.jsx';
import JsonViewer from './components/JsonViewer.jsx';

export default function App() {
  const { layout, messages, loading, sendMessage, resetAgent } = useLayoutAgent();

  const artboard = useMemo(() => {
    const rootId = layout?.rootNodes?.[0];
    return rootId ? layout.nodes?.[rootId] : null;
  }, [layout]);

  const handleReset = () => {
    resetAgent();
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-950">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Layout Agent</h1>
            <p className="text-sm text-slate-500">Chat to transform the design JSON and preview the updated layout.</p>
          </div>
          <button 
            onClick={handleReset} 
            className="w-fit rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Reset
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-12">
        <section className="lg:col-span-4">
          <ChatWindow messages={messages} loading={loading} onSend={sendMessage} />
        </section>

        <section className="grid grid-cols-1 gap-4 lg:col-span-8 xl:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Wireframe Preview</h2>
              <div className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                {artboard ? `${Math.round(artboard.width)}x${Math.round(artboard.height)}` : ''}
              </div>
            </div>
            <WireframePreview layout={layout} />
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Layout JSON</h2>
              <div className="rounded-full bg-blue-50 px-2 py-1 text-xs text-blue-700">Auto-updates</div>
            </div>
            <JsonViewer layout={layout} />
          </div>
        </section>
      </main>
    </div>
  );
}
