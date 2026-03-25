import type { IdeamizerPlugin, PluginContext, UIExtensionPoint } from '@/types/plugin';
import type { DesignDocument } from '@/types/design';
import type { ProductTemplate } from '@/types/product';
import type { ComponentType } from 'react';

interface UIExtension {
  point: UIExtensionPoint;
  component: ComponentType;
  pluginId: string;
}

export class PluginManager {
  private plugins = new Map<string, IdeamizerPlugin>();
  private uiExtensions: UIExtension[] = [];
  private eventListeners = new Map<string, Set<(payload: unknown) => void>>();
  private getDesignDocument: () => DesignDocument;
  private getProductTemplate: () => ProductTemplate;

  constructor(
    getDesignDocument: () => DesignDocument,
    getProductTemplate: () => ProductTemplate
  ) {
    this.getDesignDocument = getDesignDocument;
    this.getProductTemplate = getProductTemplate;
  }

  async register(plugin: IdeamizerPlugin): Promise<void> {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin "${plugin.id}" is already registered`);
    }

    const context = this.createContext(plugin.id);
    await plugin.initialize(context);
    this.plugins.set(plugin.id, plugin);
  }

  async unregister(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    await plugin.destroy();
    this.plugins.delete(pluginId);
    this.uiExtensions = this.uiExtensions.filter((ext) => ext.pluginId !== pluginId);
  }

  getPlugin(pluginId: string): IdeamizerPlugin | undefined {
    return this.plugins.get(pluginId);
  }

  getUIExtensions(location: UIExtensionPoint['location']): UIExtension[] {
    return this.uiExtensions
      .filter((ext) => ext.point.location === location)
      .sort((a, b) => a.point.priority - b.point.priority);
  }

  async runBeforeExport(design: DesignDocument): Promise<DesignDocument> {
    let result = design;
    for (const plugin of this.plugins.values()) {
      if (plugin.hooks.beforeExport) {
        result = await plugin.hooks.beforeExport(result);
      }
    }
    return result;
  }

  async runValidation(design: DesignDocument) {
    const allResults = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.hooks.validateDesign) {
        const results = await plugin.hooks.validateDesign(design);
        allResults.push(...results);
      }
    }
    return allResults;
  }

  emit(event: string, payload: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        listener(payload);
      }
    }
  }

  private createContext(pluginId: string): PluginContext {
    return {
      getDesignDocument: this.getDesignDocument,
      getProductTemplate: this.getProductTemplate,
      registerUIExtension: (point: UIExtensionPoint, component: ComponentType) => {
        this.uiExtensions.push({ point, component, pluginId });
      },
      emit: (event: string, payload: unknown) => {
        this.emit(event, payload);
      },
      on: (event: string, handler: (payload: unknown) => void) => {
        if (!this.eventListeners.has(event)) {
          this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event)!.add(handler);
        return () => {
          this.eventListeners.get(event)?.delete(handler);
        };
      },
    };
  }
}
