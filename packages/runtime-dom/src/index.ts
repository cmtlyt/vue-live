import { createRenderer } from '@vlive/runtime-core';
import { nodeOps } from './node-ops';
import { patchProp } from './patch-prop';

export * from '@vlive/runtime-core';

export const renderOptions = { ...nodeOps, patchProp };

// createRenderer(nodeOps);
