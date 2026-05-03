import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { ToolSchema, type Tool } from './schema.js';
import { logger } from '../logger/logger.js';

export class ToolLoader {
  private tools: Map<string, Tool> = new Map();

  constructor(private toolsDir: string) {}

  /**
   * Loads all YAML tools from the configured directory.
   */
  async load(): Promise<void> {
    if (!existsSync(this.toolsDir)) {
      logger.warn({ dir: this.toolsDir }, 'Registry tools directory not found');
      return;
    }

    try {
      const files = readdirSync(this.toolsDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
      
      for (const file of files) {
        const filePath = join(this.toolsDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const raw = yaml.load(content);
        
        const result = ToolSchema.safeParse(raw);
        if (result.success) {
          const tool = result.data;
          this.validateSemantic(tool);
          this.tools.set(tool.id, tool);
          logger.debug({ tool: tool.id }, 'Tool loaded from registry');
        } else {
          logger.error({ file, errors: result.error.format() }, 'Failed to parse tool definition');
          throw new Error(`Invalid tool definition in ${file}`);
        }
      }
      
      logger.info({ count: this.tools.size }, 'Tool registry loaded successfully');
    } catch (err) {
      logger.error({ err }, 'Critical failure loading tool registry');
      throw err;
    }
  }

  /**
   * Basic semantic validation rules.
   */
  private validateSemantic(tool: Tool): void {
    // Rule: high/critical risk levels MUST require approval if not in a sandbox
    if ((tool.risk_level === 'high' || tool.risk_level === 'critical') && !tool.requires_approval && !tool.sandbox) {
      throw new Error(`Semantic Error: Tool ${tool.id} with risk ${tool.risk_level} must require approval or be sandboxed.`);
    }

    // Rule: forbidden tools should never be loadable as active
    if (tool.risk_level === 'forbidden') {
       logger.warn({ tool: tool.id }, 'A forbidden tool was detected in the registry. It will be loaded but unusable by default.');
    }
  }

  getTool(id: string): Tool | undefined {
    return this.tools.get(id);
  }

  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Filters tools based on active skill.
   */
  filterBySkill(skill: string): Tool[] {
    return this.getAll().filter(t => 
      t.applicable_skills.includes('*') || t.applicable_skills.includes(skill)
    );
  }
}
