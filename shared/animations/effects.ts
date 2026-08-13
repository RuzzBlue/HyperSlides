import type {
  AnimDirection,
  AnimKind,
  ChildScope,
  SlideAnimationParams,
} from './types.ts';

export type EffectParamSpec =
  | { key: 'direction'; label: string; options: AnimDirection[] }
  | { key: 'childScope'; label: string; options: ChildScope[] };

export type AnimationEffectDef = {
  id: string;
  kind: AnimKind;
  label: string;
  /** anime.js-ish targets description used by the runner */
  preset:
    | 'fadeIn'
    | 'fadeOut'
    | 'slideIn'
    | 'slideOut'
    | 'zoomIn'
    | 'zoomOut'
    | 'blurIn'
    | 'blurOut'
    | 'bounceIn'
    | 'flipIn'
    | 'pulse'
    | 'shake'
    | 'bounce'
    | 'wiggle'
    | 'flash'
    | 'heartbeat'
    | 'float'
    | 'spin'
    | 'shrinkOut'
    | 'wipeOut';
  defaultDurationSec: number;
  defaultParams: SlideAnimationParams;
  params: EffectParamSpec[];
};

const DIR: AnimDirection[] = ['up', 'down', 'left', 'right'];
const SCOPE: ChildScope[] = ['block', 'line', 'element', 'group'];

const dirParam: EffectParamSpec = {
  key: 'direction',
  label: 'Direction',
  options: DIR,
};
const scopeParam: EffectParamSpec = {
  key: 'childScope',
  label: 'Apply to',
  options: SCOPE,
};

export const ANIMATION_EFFECTS: AnimationEffectDef[] = [
  // Entrance
  {
    id: 'fade-in',
    kind: 'entrance',
    label: 'Fade in',
    preset: 'fadeIn',
    defaultDurationSec: 0.5,
    defaultParams: { childScope: 'block' },
    params: [scopeParam],
  },
  {
    id: 'slide-in',
    kind: 'entrance',
    label: 'Slide in',
    preset: 'slideIn',
    defaultDurationSec: 0.55,
    defaultParams: { direction: 'up', childScope: 'block' },
    params: [dirParam, scopeParam],
  },
  {
    id: 'zoom-in',
    kind: 'entrance',
    label: 'Zoom in',
    preset: 'zoomIn',
    defaultDurationSec: 0.5,
    defaultParams: { childScope: 'block' },
    params: [scopeParam],
  },
  {
    id: 'blur-in',
    kind: 'entrance',
    label: 'Blur in',
    preset: 'blurIn',
    defaultDurationSec: 0.6,
    defaultParams: { childScope: 'block' },
    params: [scopeParam],
  },
  {
    id: 'bounce-in',
    kind: 'entrance',
    label: 'Bounce in',
    preset: 'bounceIn',
    defaultDurationSec: 0.7,
    defaultParams: { direction: 'up', childScope: 'block' },
    params: [dirParam, scopeParam],
  },
  {
    id: 'flip-in',
    kind: 'entrance',
    label: 'Flip in',
    preset: 'flipIn',
    defaultDurationSec: 0.6,
    defaultParams: { direction: 'left', childScope: 'block' },
    params: [dirParam, scopeParam],
  },
  {
    id: 'rise-in',
    kind: 'entrance',
    label: 'Rise in',
    preset: 'slideIn',
    defaultDurationSec: 0.65,
    defaultParams: { direction: 'up', childScope: 'line' },
    params: [dirParam, scopeParam],
  },
  {
    id: 'pop-in',
    kind: 'entrance',
    label: 'Pop in',
    preset: 'zoomIn',
    defaultDurationSec: 0.4,
    defaultParams: { childScope: 'element' },
    params: [scopeParam],
  },

  // Action
  {
    id: 'pulse',
    kind: 'action',
    label: 'Pulse',
    preset: 'pulse',
    defaultDurationSec: 0.6,
    defaultParams: { childScope: 'block' },
    params: [scopeParam],
  },
  {
    id: 'shake',
    kind: 'action',
    label: 'Shake',
    preset: 'shake',
    defaultDurationSec: 0.5,
    defaultParams: { direction: 'left', childScope: 'block' },
    params: [dirParam, scopeParam],
  },
  {
    id: 'bounce',
    kind: 'action',
    label: 'Bounce',
    preset: 'bounce',
    defaultDurationSec: 0.6,
    defaultParams: { childScope: 'block' },
    params: [scopeParam],
  },
  {
    id: 'wiggle',
    kind: 'action',
    label: 'Wiggle',
    preset: 'wiggle',
    defaultDurationSec: 0.55,
    defaultParams: { childScope: 'block' },
    params: [scopeParam],
  },
  {
    id: 'flash',
    kind: 'action',
    label: 'Flash',
    preset: 'flash',
    defaultDurationSec: 0.5,
    defaultParams: { childScope: 'block' },
    params: [scopeParam],
  },
  {
    id: 'heartbeat',
    kind: 'action',
    label: 'Heartbeat',
    preset: 'heartbeat',
    defaultDurationSec: 0.8,
    defaultParams: { childScope: 'block' },
    params: [scopeParam],
  },
  {
    id: 'float',
    kind: 'action',
    label: 'Float',
    preset: 'float',
    defaultDurationSec: 0.9,
    defaultParams: { childScope: 'block' },
    params: [scopeParam],
  },
  {
    id: 'spin',
    kind: 'action',
    label: 'Spin',
    preset: 'spin',
    defaultDurationSec: 0.7,
    defaultParams: { childScope: 'block' },
    params: [scopeParam],
  },

  // Exit
  {
    id: 'fade-out',
    kind: 'exit',
    label: 'Fade out',
    preset: 'fadeOut',
    defaultDurationSec: 0.45,
    defaultParams: { childScope: 'block' },
    params: [scopeParam],
  },
  {
    id: 'slide-out',
    kind: 'exit',
    label: 'Slide out',
    preset: 'slideOut',
    defaultDurationSec: 0.5,
    defaultParams: { direction: 'down', childScope: 'block' },
    params: [dirParam, scopeParam],
  },
  {
    id: 'zoom-out',
    kind: 'exit',
    label: 'Zoom out',
    preset: 'zoomOut',
    defaultDurationSec: 0.45,
    defaultParams: { childScope: 'block' },
    params: [scopeParam],
  },
  {
    id: 'blur-out',
    kind: 'exit',
    label: 'Blur out',
    preset: 'blurOut',
    defaultDurationSec: 0.5,
    defaultParams: { childScope: 'block' },
    params: [scopeParam],
  },
  {
    id: 'shrink-out',
    kind: 'exit',
    label: 'Shrink out',
    preset: 'shrinkOut',
    defaultDurationSec: 0.45,
    defaultParams: { childScope: 'block' },
    params: [scopeParam],
  },
  {
    id: 'wipe-out',
    kind: 'exit',
    label: 'Wipe out',
    preset: 'wipeOut',
    defaultDurationSec: 0.5,
    defaultParams: { direction: 'right', childScope: 'block' },
    params: [dirParam, scopeParam],
  },
  {
    id: 'drop-out',
    kind: 'exit',
    label: 'Drop out',
    preset: 'slideOut',
    defaultDurationSec: 0.55,
    defaultParams: { direction: 'down', childScope: 'element' },
    params: [dirParam, scopeParam],
  },
  {
    id: 'fly-out',
    kind: 'exit',
    label: 'Fly out',
    preset: 'slideOut',
    defaultDurationSec: 0.5,
    defaultParams: { direction: 'left', childScope: 'block' },
    params: [dirParam, scopeParam],
  },
];

export function effectsForKind(kind: AnimKind): AnimationEffectDef[] {
  return ANIMATION_EFFECTS.filter((e) => e.kind === kind);
}

export function getEffectDef(effectId: string): AnimationEffectDef | undefined {
  return ANIMATION_EFFECTS.find((e) => e.id === effectId);
}
