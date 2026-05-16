export default function JsonViewer({ layout }) {
  return (
    <pre className="max-h-[72vh] overflow-auto rounded-lg bg-slate-950 p-3 text-[11px] leading-4 text-slate-100">
      {JSON.stringify(layout, null, 2)}
    </pre>
  );
}

