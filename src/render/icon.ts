// src/render/icon.ts
import { svg, type SVGTemplateResult } from 'lit';
import type { LayoutNode } from './layout';

export const DEFAULT_MDI_ICONS: Record<LayoutNode['kind'], string> = {
  pv: 'mdi:solar-power',
  battery: 'mdi:battery',
  grid: 'mdi:transmission-tower',
  home: 'mdi:home',
  consumer: 'mdi:power-plug',
};

interface IconBox {
  size: number;
  centerY: number;
  emojiFontSize: number;
  emojiY: number;
}

const NODE_ICON_BOX: Record<LayoutNode['kind'], IconBox> = {
  pv: { size: 24, centerY: -4, emojiFontSize: 22, emojiY: -4 },
  battery: { size: 24, centerY: -4, emojiFontSize: 22, emojiY: -4 },
  grid: { size: 24, centerY: -4, emojiFontSize: 22, emojiY: -4 },
  home: { size: 32, centerY: -10, emojiFontSize: 28, emojiY: -10 },
  consumer: { size: 18, centerY: 6, emojiFontSize: 18, emojiY: 6 },
};

const DIAGNOSTICS_ICON_BOX: IconBox = {
  size: 18,
  centerY: 0,
  emojiFontSize: 13,
  emojiY: 4,
};

const DIAGNOSTICS_ICON_NAME = 'mdi:alert-circle-outline';

export function nodeIcon(
  kind: LayoutNode['kind'],
  configuredIcon: string | undefined,
): SVGTemplateResult {
  const box = NODE_ICON_BOX[kind];
  if (configuredIcon && !configuredIcon.startsWith('mdi:')) {
    return renderEmojiText(configuredIcon, box);
  }
  const iconName = configuredIcon ?? DEFAULT_MDI_ICONS[kind];
  return renderIconForeignObject(iconName, box);
}

export function diagnosticsIcon(): SVGTemplateResult {
  return renderIconForeignObject(DIAGNOSTICS_ICON_NAME, DIAGNOSTICS_ICON_BOX);
}

function renderEmojiText(text: string, box: IconBox): SVGTemplateResult {
  return svg`<text
    class="node-icon"
    text-anchor="middle"
    y="${box.emojiY}"
    font-size="${box.emojiFontSize}"
  >${text}</text>`;
}

function renderIconForeignObject(name: string, box: IconBox): SVGTemplateResult {
  const half = box.size / 2;
  return svg`
    <foreignObject
      x="${-half}"
      y="${box.centerY - half}"
      width="${box.size}"
      height="${box.size}"
      class="node-icon-fo"
      part="node-icon"
    >
      <ha-icon
        icon="${name}"
        style="display:block; width:100%; height:100%; --mdc-icon-size: ${box.size}px; color: inherit;"
      ></ha-icon>
    </foreignObject>
  `;
}
