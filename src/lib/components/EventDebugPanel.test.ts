import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./EventDebugPanel.svelte', import.meta.url), 'utf8');

describe('EventDebugPanel', () => {
  it('renders console rows collapsed by default with bulk expansion controls', () => {
    expect(source).toContain('<details');
    expect(source).toContain('open={isExpanded(key)}');
    expect(source).toContain('onclick={expandAll}');
    expect(source).toContain('Expand all');
    expect(source).toContain('onclick={collapseAll}');
    expect(source).toContain('Collapse all');
    expect(source).toContain('let expandedKeys: string[] = $state([])');
  });

  it('maps important timer events to dedicated visual icons', () => {
    expect(source).toContain('keyboard-key-down');
    expect(source).toContain('keyboard-key-up');
    expect(source).toContain('run-started');
    expect(source).toContain('run-stopped');
    expect(source).toContain('inspection-started');
    expect(source).toContain('catalog-updated');
  });

  it('shows structured event metadata only inside the expanded body', () => {
    expect(source).toContain('log.data.timestamp.toFixed(3)');
    expect(source).toContain('{safeJson(log.data.payload)}');
    expect(source).toContain('bind:this={logList}');
    expect(source).toContain('logList?.scrollTo');
  });
});
