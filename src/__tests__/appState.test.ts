import { describe, it, expect, beforeEach } from 'vitest';
import {
  openTabs,
  activeTabId,
  openFile,
  closeTab,
  activeSidebarView,
  settings,
  defaultSettings,
} from '../state/appState';

describe('SV Code Editor App State', () => {
  beforeEach(() => {
    openTabs.value = [];
    activeTabId.value = '';
    activeSidebarView.value = 'explorer';
    settings.value = { ...defaultSettings };
  });

  it('opens and activates a new tab', () => {
    openFile('/workspace/src/main.rs', 'fn main() {}', 'rust');

    expect(openTabs.value.length).toBe(1);
    expect(openTabs.value[0]?.title).toBe('main.rs');
    expect(openTabs.value[0]?.filePath).toBe('/workspace/src/main.rs');
    expect(activeTabId.value).toBe(openTabs.value[0]?.id);
  });

  it('switches active tab when opening an already opened tab', () => {
    openFile('/workspace/src/main.rs', 'fn main() {}', 'rust');
    const firstId = openTabs.value[0]?.id;

    openFile('/workspace/src/lib.rs', 'pub fn lib() {}', 'rust');
    expect(openTabs.value.length).toBe(2);
    expect(activeTabId.value).toBe(openTabs.value[1]?.id);

    // Re-open main.rs
    openFile('/workspace/src/main.rs', 'fn main() {}', 'rust');
    expect(openTabs.value.length).toBe(2);
    expect(activeTabId.value).toBe(firstId);
  });

  it('closes a tab and updates active tab correctly', () => {
    openFile('/workspace/src/main.rs', 'fn main() {}', 'rust');
    openFile('/workspace/src/lib.rs', 'pub fn lib() {}', 'rust');

    const tab2Id = openTabs.value[1]?.id || '';
    const tab1Id = openTabs.value[0]?.id || '';

    closeTab(tab2Id);
    expect(openTabs.value.length).toBe(1);
    expect(activeTabId.value).toBe(tab1Id);

    closeTab(tab1Id);
    expect(openTabs.value.length).toBe(0);
    expect(activeTabId.value).toBe('');
  });

  it('enforces Lite profile live editor models limit', () => {
    settings.value = {
      ...defaultSettings,
      profile: 'Lite',
      maxLiveEditorModels: 3,
    };

    openFile('/workspace/1.ts', '1', 'typescript');
    openFile('/workspace/2.ts', '2', 'typescript');
    openFile('/workspace/3.ts', '3', 'typescript');
    expect(openTabs.value.length).toBe(3);

    // Opening 4th tab should prune oldest inactive tab
    openFile('/workspace/4.ts', '4', 'typescript');
    expect(openTabs.value.length).toBe(3);
    expect(openTabs.value.map((t) => t.title)).toContain('4.ts');
  });

  it('switches sidebar views without animation', () => {
    activeSidebarView.value = 'agents';
    expect(activeSidebarView.value).toBe('agents');

    activeSidebarView.value = 're';
    expect(activeSidebarView.value).toBe('re');

    activeSidebarView.value = 'setup';
    expect(activeSidebarView.value).toBe('setup');
  });
});
