import type { DesignDocument } from '@/types/design';

export class ExportService {
  static exportJSON(design: DesignDocument): string {
    return JSON.stringify(design, null, 2);
  }

  static downloadJSON(design: DesignDocument): void {
    const json = ExportService.exportJSON(design);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${design.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  static downloadPNG(dataURL: string, filename: string): void {
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = `${filename}.png`;
    a.click();
  }

  static importJSON(jsonString: string): DesignDocument | null {
    try {
      const design = JSON.parse(jsonString) as DesignDocument;
      if (design.version && design.id && design.views) {
        return design;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Save design to localStorage
   */
  static saveToLocal(design: DesignDocument): void {
    try {
      localStorage.setItem(`ideamizer_design_${design.id}`, JSON.stringify(design));
      // Update index
      const index = ExportService.getLocalDesignIndex();
      if (!index.includes(design.id)) {
        index.push(design.id);
        localStorage.setItem('ideamizer_design_index', JSON.stringify(index));
      }
    } catch {
      // localStorage full or unavailable
    }
  }

  static loadFromLocal(designId: string): DesignDocument | null {
    try {
      const data = localStorage.getItem(`ideamizer_design_${designId}`);
      if (!data) return null;
      return JSON.parse(data) as DesignDocument;
    } catch {
      return null;
    }
  }

  static getLocalDesignIndex(): string[] {
    try {
      const data = localStorage.getItem('ideamizer_design_index');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
}
