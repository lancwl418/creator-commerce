-- Store complete design specifications for production/ERP handoff.
-- print_area_snapshot: printable area position, physical dimensions, DPI
-- design_metadata: mockup dimensions, artwork info, export settings

ALTER TABLE product_configurations
  ADD COLUMN IF NOT EXISTS print_area_snapshot JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS design_metadata JSONB DEFAULT NULL;

-- print_area_snapshot example:
-- {
--   "x": 150, "y": 100, "width": 600, "height": 800,
--   "physicalWidthInches": 10, "physicalHeightInches": 14,
--   "minDPI": 300,
--   "shape": { "type": "rect" }
-- }

-- design_metadata example:
-- {
--   "mockupWidth": 1000, "mockupHeight": 1200,
--   "artworkOriginalWidth": 3000, "artworkOriginalHeight": 3600,
--   "artworkDPI": 300,
--   "exportDPI": 300,
--   "colorMode": "RGB",
--   "viewId": "front"
-- }
