import { css, unsafeCSS, type CSSResultGroup } from 'lit';
import { ANIMATION_CSS } from './render/flow-animation';

export const cardStyles: CSSResultGroup = css`
  :host {
    display: block;
    opacity: 0;
    transition: opacity 0.2s ease-in;
  }
  :host([data-mounted]) {
    opacity: 1;
  }
  ha-card {
    padding: var(--ha-card-padding, 16px);
  }
  .error-banner {
    color: var(--error-color, #b00020);
    padding: 12px;
    border: 1px solid currentColor;
    border-radius: 8px;
  }
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: var(--secondary-text-color);
  }
  .skeleton {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
    padding: 32px;
  }
  .skeleton-node {
    aspect-ratio: 1;
    border-radius: 50%;
    background: var(--divider-color, #e2e8f0);
    animation: skeleton-pulse 1.6s ease-in-out infinite;
  }
  @keyframes skeleton-pulse {
    0%,
    100% {
      opacity: 0.6;
    }
    50% {
      opacity: 0.3;
    }
  }
  .stub-hint {
    padding: 16px;
    color: var(--secondary-text-color);
    text-align: center;
  }
  .narrow-banner {
    font-size: 11px;
    color: var(--secondary-text-color);
    padding: 4px 8px;
    border-bottom: 1px solid var(--divider-color);
  }
  .node:hover circle,
  .node:focus-visible circle {
    stroke-width: 3.5;
  }
  .node:focus-visible {
    outline: 2px solid var(--primary-color, #03a9f4);
    outline-offset: 4px;
  }
  .node-icon,
  .node-value,
  .node-name {
    fill: var(--primary-text-color, #0f172a);
  }
  ${unsafeCSS(ANIMATION_CSS)}
`;
