import type { ProductTemplate, ProductType } from '@/types/product';
import { tshirtTemplate } from './definitions/tshirt.template';
import { mugTemplate } from './definitions/mug.template';
import { phonecaseTemplate } from './definitions/phonecase.template';

class ProductTemplateRegistry {
  private templates = new Map<string, ProductTemplate>();

  constructor() {
    this.register(tshirtTemplate);
    this.register(mugTemplate);
    this.register(phonecaseTemplate);
  }

  register(template: ProductTemplate): void {
    this.templates.set(template.id, template);
  }

  getById(id: string): ProductTemplate | undefined {
    return this.templates.get(id);
  }

  getByType(type: ProductType): ProductTemplate[] {
    return Array.from(this.templates.values()).filter((t) => t.type === type);
  }

  getAll(): ProductTemplate[] {
    return Array.from(this.templates.values());
  }
}

export const templateRegistry = new ProductTemplateRegistry();
