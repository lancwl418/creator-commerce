export interface CreatedProductRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  base_price_suggestion: number | null;
  preview_urls: string[];
  design_artwork_urls: string[];
  product_template_id: string;
  created_at: string;
}

export interface ImportedProductEdit {
  title: string;
  description: string;
  price: string;
}
