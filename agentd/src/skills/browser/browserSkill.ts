/**
 * agentd/src/skills/browser/browserSkill.ts
 * 
 * Implementação da Skill de Automação de Browser via Playwright.
 */

import { chromium, Browser, Page, BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs';

export class BrowserSkill {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private artifactsDir = path.join(process.cwd(), 'artifacts', 'browser');

  constructor() {
    if (!fs.existsSync(this.artifactsDir)) {
      fs.mkdirSync(this.artifactsDir, { recursive: true });
    }
  }

  private async ensureBrowser() {
    if (!this.browser) {
      this.browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
    if (!this.context) {
      this.context = await this.browser.newContext({
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
      });
    }
    if (!this.page) {
      this.page = await this.context.newPage();
    }
  }

  /**
   * Abre uma URL
   */
  async open(args: { url: string }) {
    await this.ensureBrowser();
    await this.page!.goto(args.url, { waitUntil: 'networkidle' });
    const title = await this.page!.title();
    return { 
      status: 'success', 
      url: args.url, 
      title,
      summary: `Navegou para ${args.url}. Título: ${title}`
    };
  }

  /**
   * Clica em um elemento
   */
  async click(args: { selector: string }) {
    await this.ensureBrowser();
    await this.page!.click(args.selector);
    return { status: 'success', selector: args.selector };
  }

  /**
   * Digita texto em um input
   */
  async type(args: { selector: string, text: string }) {
    await this.ensureBrowser();
    await this.page!.fill(args.selector, args.text);
    return { status: 'success', selector: args.selector };
  }

  /**
   * Captura screenshot
   */
  async screenshot(args: { name?: string } = {}) {
    await this.ensureBrowser();
    const filename = `${args.name || 'screenshot'}_${Date.now()}.png`;
    const filePath = path.join(this.artifactsDir, filename);
    await this.page!.screenshot({ path: filePath });
    
    // Retornar base64 para o agente e path para o sistema
    const buffer = fs.readFileSync(filePath);
    return {
      status: 'success',
      path: filePath,
      base64: buffer.toString('base64'),
      summary: `Screenshot salva em ${filename}`
    };
  }

  /**
   * Obtém o conteúdo HTML simplificado (Markdown amigável para LLM)
   */
  async getContent() {
    await this.ensureBrowser();
    const content = await this.page!.content();
    // Aqui poderíamos usar um conversor HTML -> MD, mas por agora retornamos o texto visível
    const text = await this.page!.innerText('body');
    return {
      status: 'success',
      text: text.slice(0, 5000), // Limitar para não estourar contexto
      url: this.page!.url()
    };
  }

  /**
   * Fecha o browser
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
    return { status: 'success', message: 'Browser fechado.' };
  }
}

export const browserSkill = new BrowserSkill();
