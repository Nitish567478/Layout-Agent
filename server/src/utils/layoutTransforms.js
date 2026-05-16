function deepClone(obj) {
  return structuredClone(obj);
}

function getArtboard(layout) {
  const rootId = layout.rootNodes[0];
  return { rootId, artboard: layout.nodes[rootId] };
}

function clampNumber(n, min = -Infinity, max = Infinity) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(max, Math.max(min, n));
}

function syncAbsoluteFromNormalized(node, artboard) {
  node.x = clampNumber(node.nx * artboard.width);
  node.y = clampNumber(node.ny * artboard.height);
  node.width = clampNumber(node.nw * artboard.width);
  node.height = clampNumber(node.nh * artboard.height);
}

function syncNormalizedFromAbsolute(node, artboard) {
  node.nx = clampNumber(node.x / artboard.width);
  node.ny = clampNumber(node.y / artboard.height);
  node.nw = clampNumber(node.width / artboard.width, 0);
  node.nh = clampNumber(node.height / artboard.height, 0);
}

function clampNodeToCanvas(node) {
  node.nw = clampNumber(node.nw, 0.01, 1.5);
  node.nh = clampNumber(node.nh, 0.01, 1.5);
  node.nx = clampNumber(node.nx, -0.25, Math.max(0, 1 - node.nw + 0.25));
  node.ny = clampNumber(node.ny, -0.25, Math.max(0, 1 - node.nh + 0.25));
}

export function applyTransformsToLayout(layout, transforms = []) {
  const updated = deepClone(layout);
  if (!Array.isArray(transforms)) return updated;

  const { artboard } = getArtboard(updated);
  let addedNodeCounter = 0;

  for (const t of transforms) {
    if (!t || typeof t !== 'object') continue;

    if (t.type === 'resize_artboard') {
      const newW = Number(t.width);
      const newH = Number(t.height);
      if (!Number.isFinite(newW) || !Number.isFinite(newH)) continue;

      artboard.width = newW;
      artboard.height = newH;

      if (Array.isArray(artboard.children)) {
        for (const childId of artboard.children) {
          const node = updated.nodes[childId];
          if (!node) continue;
          syncAbsoluteFromNormalized(node, artboard);
        }
      }
    }

    if (t.type === 'set_text') {
      const node = updated.nodes[t.nodeId];
      if (!node || node.type !== 'text') continue;
      node.data = node.data || {};
      node.data.content = String(t.content ?? '');
    }

    if (t.type === 'set_node_rect') {
      const node = updated.nodes[t.nodeId];
      if (!node) continue;
      const root = updated.nodes[updated.rootNodes[0]];
      if (Number.isFinite(Number(t.nx))) node.nx = Number(t.nx);
      if (Number.isFinite(Number(t.ny))) node.ny = Number(t.ny);
      if (Number.isFinite(Number(t.nw))) node.nw = Number(t.nw);
      if (Number.isFinite(Number(t.nh))) node.nh = Number(t.nh);
      clampNodeToCanvas(node);
      syncAbsoluteFromNormalized(node, root);
    }

    if (t.type === 'move_node') {
      const node = updated.nodes[t.nodeId];
      if (!node) continue;

      const root = updated.nodes[updated.rootNodes[0]];

      const newX = t.xPx;
      const newY = t.yPx;

      if (typeof t.anchor === 'string') {
        const anchor = t.anchor;
        const nw = node.nw;
        const nh = node.nh;
        const marginX = Number.isFinite(Number(t.marginX)) ? Number(t.marginX) / root.width : 0.06;
        const marginY = Number.isFinite(Number(t.marginY)) ? Number(t.marginY) / root.height : 0.06;

        let nx;
        let ny;

        if (anchor === 'top') {
          nx = 0.5 - nw / 2;
          ny = marginY;
        } else if (anchor === 'bottom') {
          nx = 0.5 - nw / 2;
          ny = 1 - nh - marginY;
        } else if (anchor === 'left') {
          nx = marginX;
          ny = 0.5 - nh / 2;
        } else if (anchor === 'right') {
          nx = 1 - nw - marginX;
          ny = 0.5 - nh / 2;
        } else if (anchor === 'center') {
          nx = 0.5 - nw / 2;
          ny = 0.5 - nh / 2;
        } else if (anchor === 'top_left') {
          nx = marginX;
          ny = marginY;
        } else if (anchor === 'top_right') {
          nx = 1 - nw - marginX;
          ny = marginY;
        } else if (anchor === 'bottom_left') {
          nx = marginX;
          ny = 1 - nh - marginY;
        } else if (anchor === 'bottom_right') {
          nx = 1 - nw - marginX;
          ny = 1 - nh - marginY;
        }

        if (typeof nx === 'number') node.nx = clampNumber(nx);
        if (typeof ny === 'number') node.ny = clampNumber(ny);
      }

      if (typeof newX === 'number') {
        node.x = newX;
        node.nx = node.x / root.width;
      }
      if (typeof newY === 'number') {
        node.y = newY;
        node.ny = node.y / root.height;
      }

      if (Number.isFinite(Number(t.dx))) node.nx += Number(t.dx) / root.width;
      if (Number.isFinite(Number(t.dy))) node.ny += Number(t.dy) / root.height;

      clampNodeToCanvas(node);
      syncAbsoluteFromNormalized(node, root);
    }

    if (t.type === 'resize_node') {
      const node = updated.nodes[t.nodeId];
      if (!node) continue;

      const scale = Number(t.scale);
      if (!Number.isFinite(scale) || scale <= 0) continue;

      const root = updated.nodes[updated.rootNodes[0]];

      const centerX = node.nx + node.nw / 2;
      const centerY = node.ny + node.nh / 2;
      node.nw = clampNumber(node.nw * scale, 0.01, 1.5);
      node.nh = clampNumber(node.nh * scale, 0.01, 1.5);
      node.nx = centerX - node.nw / 2;
      node.ny = centerY - node.nh / 2;

      if (node.type === 'text' && node.style?.visual?.fontSize) {
        node.style.visual.fontSize = Math.max(8, Math.round(node.style.visual.fontSize * scale));
        node.fontSizeRatio = node.style.visual.fontSize / root.height;
      }

      clampNodeToCanvas(node);
      syncAbsoluteFromNormalized(node, root);
    }

    if (t.type === 'set_font_size') {
      const node = updated.nodes[t.nodeId];
      if (!node || node.type !== 'text') continue;

      const fs = Number(t.fontSize);
      if (!Number.isFinite(fs) || fs <= 0) continue;

      node.style = node.style || {};
      node.style.visual = node.style.visual || {};
      node.style.visual.fontSize = fs;
      node.fontSizeRatio = fs / updated.nodes[updated.rootNodes[0]].height;

      // Best-effort: keep normalized height/width stable for POC.
    }

    if (t.type === 'set_color') {
      const node = updated.nodes[t.nodeId];
      if (!node) continue;
      const color = String(t.color || '').trim();
      if (!/^#([0-9a-f]{3,8})$/i.test(color)) continue;
      node.style = node.style || {};
      node.style.visual = node.style.visual || {};
      node.style.visual.color = { type: 'solid', value: color };
    }

    if (t.type === 'set_fill') {
      const node = updated.nodes[t.nodeId];
      if (!node) continue;
      const color = String(t.color || '').trim();
      if (!/^#([0-9a-f]{3,8})$/i.test(color)) continue;
      node.style = node.style || {};
      node.style.visual = node.style.visual || {};
      node.style.visual.fill = { type: 'solid', value: color };
      if (node.style.visual.stroke) node.style.visual.stroke = { type: 'solid', value: color };
    }

    if (t.type === 'set_artboard_background') {
      const root = updated.nodes[updated.rootNodes[0]];
      const color = String(t.color || '').trim();
      if (!/^#([0-9a-f]{3,8})$/i.test(color)) continue;
      root.data = root.data || {};
      root.data.backgroundColor = color;
    }

    if (t.type === 'add_node') {
      const root = updated.nodes[updated.rootNodes[0]];
      const nodeType = ['text', 'shape', 'image'].includes(t.nodeType) ? t.nodeType : 'shape';
      const id = String(t.id || `generated_${Date.now()}_${addedNodeCounter++}`);
      if (updated.nodes[id]) continue;

      const nx = clampNumber(Number(t.nx), -0.25, 1.25);
      const ny = clampNumber(Number(t.ny), -0.25, 1.25);
      const nw = clampNumber(Number(t.nw), 0.01, 1.5);
      const nh = clampNumber(Number(t.nh), 0.01, 1.5);
      const fill = /^#([0-9a-f]{3,8})$/i.test(String(t.fill || '')) ? String(t.fill) : '#FFFFFF';
      const color = /^#([0-9a-f]{3,8})$/i.test(String(t.color || '')) ? String(t.color) : '#0F172A';

      const node = {
        x: nx * root.width,
        y: ny * root.height,
        id,
        nh,
        nw,
        nx,
        ny,
        data: nodeType === 'text' ? { content: String(t.content || '') } : { shapeType: 'rect' },
        name: String(t.name || (nodeType === 'text' ? 'Generated Text' : 'Generated Shape')),
        type: nodeType,
        style: {
          layout: {},
          visual:
            nodeType === 'text'
              ? {
                  fill: { type: 'none' },
                  color: { type: 'solid', value: color },
                  fontSize: Number(t.fontSize) || 32,
                  fontFamily: 'Arial',
                  fontWeight: Number(t.fontWeight) || 700
                }
              : {
                  fill: { type: 'solid', value: fill },
                  stroke: { type: 'solid', value: fill },
                  strokeWidth: Number(t.strokeWidth) || 0,
                  borderRadius: Number(t.borderRadius) || 24
                }
        },
        width: nw * root.width,
        height: nh * root.height,
        parentId: root.id
      };

      if (nodeType === 'text') node.fontSizeRatio = node.style.visual.fontSize / root.height;
      updated.nodes[id] = node;
      root.children = Array.isArray(root.children) ? root.children : [];
      root.children.push(id);
    }
  }

  const root = updated.nodes[updated.rootNodes[0]];
  if (root?.children) {
    for (const childId of root.children) {
      const node = updated.nodes[childId];
      if (!node) continue;
      syncNormalizedFromAbsolute(node, root);
      syncAbsoluteFromNormalized(node, root);
    }
  }

  return updated;
}
