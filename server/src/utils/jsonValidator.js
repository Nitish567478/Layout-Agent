export function validateLayoutShape(layout) {
  if (!layout || typeof layout !== 'object') {
    throw new Error('Layout must be an object');
  }
  if (!Array.isArray(layout.rootNodes)) {
    throw new Error('layout.rootNodes must be an array');
  }
  if (!layout.nodes || typeof layout.nodes !== 'object') {
    throw new Error('layout.nodes must be an object');
  }

  for (const rootId of layout.rootNodes) {
    if (!layout.nodes[rootId]) {
      throw new Error(`layout.nodes is missing root node: ${rootId}`);
    }
  }

  // Basic node checks.
  // Note: the artboard root node may not have nx/ny/nw/nh in the provided data,
  // so we skip normalized-coordinate checks for any node that is in rootNodes.
  const rootSet = new Set(layout.rootNodes);

  for (const [id, node] of Object.entries(layout.nodes)) {
    if (!node || typeof node !== 'object') {
      throw new Error(`node ${id} must be an object`);
    }

    const hasAbs =
      typeof node.x === 'number' &&
      typeof node.y === 'number' &&
      typeof node.width === 'number' &&
      typeof node.height === 'number';
    if (!hasAbs) {
      throw new Error(`node ${id} must include x/y/width/height numbers`);
    }

    // Only require normalized coords for non-artboard nodes.
    if (!rootSet.has(id)) {
      const hasNorm =
        typeof node.nx === 'number' &&
        typeof node.ny === 'number' &&
        typeof node.nw === 'number' &&
        typeof node.nh === 'number';
      if (!hasNorm) {
        throw new Error(`node ${id} must include nx/ny/nw/nh numbers`);
      }
    }
  }


  return true;
}

