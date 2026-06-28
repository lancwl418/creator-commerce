-- Allow product_configurations without a linked design version.
--
-- Products created from the Product Catalog flow (creator uploads artwork
-- directly in the editor, with no `designs` record) have no design_version.
-- The app previously inserted a placeholder all-zero UUID, which violated the
-- FK to design_versions, so the config insert silently failed and the saved
-- layers were lost — re-opening the design step showed a blank canvas.
-- Make the column nullable so these configs persist (the app now inserts NULL).
ALTER TABLE product_configurations
  ALTER COLUMN design_version_id DROP NOT NULL;
