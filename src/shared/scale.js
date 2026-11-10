import { clampNumber } from './color.js';

export const BASE_VIEWPORT = Object.freeze({ width: 1280, height: 720 });
export const BASE_SCALE_RANGE = Object.freeze({ min: 0.85, max: 1.45 });
export const MENU_BASE_SIZE = Object.freeze({ width: 920, height: 620 });
export const MENU_MARGIN = 32;

/**
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export const baseMenuScale = (width, height) => {
  const horizontal = (Number.isFinite(width) ? width : BASE_VIEWPORT.width) / BASE_VIEWPORT.width;
  const vertical = (Number.isFinite(height) ? height : BASE_VIEWPORT.height) / BASE_VIEWPORT.height;
  return clampNumber(Math.min(horizontal, vertical), BASE_SCALE_RANGE.min, BASE_SCALE_RANGE.max);
};

/**
 * @param {number} scale
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export const fitMenuScale = (scale, width, height) => {
  const safeWidth = Number.isFinite(width) ? width : BASE_VIEWPORT.width;
  const safeHeight = Number.isFinite(height) ? height : BASE_VIEWPORT.height;
  const maxWidth = (safeWidth - MENU_MARGIN) / MENU_BASE_SIZE.width;
  const maxHeight = (safeHeight - MENU_MARGIN) / MENU_BASE_SIZE.height;
  return Math.max(0.5, Math.min(scale, maxWidth, maxHeight));
};

/**
 * @param {number} scale
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export const effectiveMenuScale = (scale, width, height) =>
  fitMenuScale((scale / 100) * baseMenuScale(width, height), width, height);
