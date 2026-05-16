function getSolid(value, fallback) {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.value || fallback;
}

function layerRank(node) {
  if (node.name?.toLowerCase().includes('background')) return 0;
  if (node.type === 'shape') return 1;
  if (node.name?.toLowerCase().includes('product')) return 2;
  if (node.type === 'image') return 3;
  if (node.type === 'text') return 4;
  return 4;
}

export default function WireframePreview({ layout }) {
  const rootId = layout?.rootNodes?.[0];
  const artboard = rootId ? layout.nodes?.[rootId] : null;
  if (!artboard) return <div className="text-sm text-slate-400">No layout.</div>;

  const bg = artboard.data?.backgroundColor || '#ffffff';
  const children = (artboard.children || [])
    .map((id) => layout.nodes?.[id])
    .filter(Boolean)
    .sort((a, b) => layerRank(a) - layerRank(b));

  return (
    <div className="flex justify-center">
      <div
        className="relative w-full max-w-[680px] shadow-2xl ring-1 ring-slate-700/60"
        style={{
          aspectRatio: `${artboard.width} / ${artboard.height}`,
          background: bg,
          overflow: 'hidden'
        }}
      >
        {children.map((node) => {
          const visual = node.style?.visual || {};
          const left = (node.nx ?? 0) * 100;
          const top = (node.ny ?? 0) * 100;
          const width = (node.nw ?? 0) * 100;
          const height = (node.nh ?? 0) * 100;
          const commonStyle = {
            position: 'absolute',
            left: `${left}%`,
            top: `${top}%`,
            width: `${width}%`,
            height: `${height}%`,
            overflow: 'hidden',
            boxSizing: 'border-box'
          };

          if (node.type === 'image') {
            const src = node.data?.sourceUrl;
            const isBackground = node.name?.toLowerCase().includes('background');
            const isProduct = node.name?.toLowerCase().includes('product');
            return (
              <div
                key={node.id}
                style={{
                  ...commonStyle,
                  opacity: isBackground ? 0.16 : isProduct ? 1 : 0.75,
                  mixBlendMode: isBackground ? 'multiply' : 'normal'
                }}
              >
                {src ? (
                  <img
                    src={src}
                    alt={node.name}
                    className="h-full w-full object-cover"
                    draggable="false"
                  />
                ) : (
                  <div className="h-full w-full bg-sky-100" />
                )}
              </div>
            );
          }

          if (node.type === 'shape') {
            const fill = getSolid(visual.fill, '#E0F2FE');
            const radius = visual.borderRadius ?? 18;
            return (
              <div
                key={node.id}
                style={{
                  ...commonStyle,
                  background: fill,
                  borderRadius: `${radius}px`,
                  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.12)'
                }}
              />
            );
          }

          if (node.type === 'text') {
            const fontSize = visual.fontSize || 28;
            const color = getSolid(visual.color, '#0F172A');
            const weight = visual.fontWeight || 600;
            const style = visual.fontStyle || 'normal';
            const isHeadline = (node.data?.content || '').toLowerCase().includes('luxury');
            return (
              <div
                key={node.id}
                style={{
                  ...commonStyle,
                  color,
                  fontSize: `${Math.max(8, fontSize * (isHeadline ? 0.36 : 0.42))}px`,
                  fontWeight: weight,
                  fontStyle: style,
                  lineHeight: 1.05,
                  whiteSpace: 'pre-wrap',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  textAlign: 'center',
                  letterSpacing: 0
                }}
              >
                {node.data?.content || node.name}
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}
