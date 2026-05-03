import { describe, it, expect, beforeEach } from 'vitest';
import { ToolLoader } from '../src/registry/loader.js';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(import.meta.dirname, 'fixtures', 'registry_test');

describe('ToolLoader', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
    mkdirSync(TEST_DIR, { recursive: true });
  });

  it('loads valid tools from YAML', async () => {
    writeFileSync(join(TEST_DIR, 'test_tool.yaml'), `
id: "test.tool"
version: "1.0.0"
description: "A test tool"
risk_level: "safe"
input_schema:
  type: "object"
applicable_skills: ["test-skill"]
    `);

    const loader = new ToolLoader(TEST_DIR);
    await loader.load();

    const tool = loader.getTool('test.tool');
    expect(tool).toBeDefined();
    expect(tool?.description).toBe('A test tool');
  });

  it('throws on invalid tool schema', async () => {
    writeFileSync(join(TEST_DIR, 'invalid_tool.yaml'), `
id: "invalid"
# missing version and description
risk_level: "safe"
    `);

    const loader = new ToolLoader(TEST_DIR);
    await expect(loader.load()).rejects.toThrow();
  });

  it('enforces semantic rules (high risk requires approval or sandbox)', async () => {
    writeFileSync(join(TEST_DIR, 'risky_tool.yaml'), `
id: "risky"
version: "1.0.0"
description: "dangerous tool"
risk_level: "high"
requires_approval: false
sandbox: false
input_schema:
  type: "object"
    `);

    const loader = new ToolLoader(TEST_DIR);
    await expect(loader.load()).rejects.toThrow(/must require approval/);
  });

  it('filters tools by skill', async () => {
     writeFileSync(join(TEST_DIR, 'global.yaml'), `
id: "global"
version: "1"
description: "global"
risk_level: "safe"
applicable_skills: ["*"]
input_schema: { type: "object" }
    `);
    
    writeFileSync(join(TEST_DIR, 'vortex.yaml'), `
id: "vortex.only"
version: "1"
description: "vortex"
risk_level: "safe"
applicable_skills: ["vortex"]
input_schema: { type: "object" }
    `);

    const loader = new ToolLoader(TEST_DIR);
    await loader.load();

    expect(loader.filterBySkill('vortex')).toHaveLength(2);
    expect(loader.filterBySkill('other')).toHaveLength(1);
    expect(loader.filterBySkill('other')[0].id).toBe('global');
  });
});
