/**
 * Shared wire tile sizing used by table wires and mission hint wire previews.
 */
export const TABLE_WIRE_WIDTH_REM = 2.25;
export const TABLE_WIRE_IMAGE_WIDTH = 158;
export const TABLE_WIRE_IMAGE_HEIGHT = 504;

export const TABLE_WIRE_HEIGHT_REM =
  (TABLE_WIRE_WIDTH_REM * TABLE_WIRE_IMAGE_HEIGHT) / TABLE_WIRE_IMAGE_WIDTH;

export const TABLE_WIRE_WIDTH_CSS = `${TABLE_WIRE_WIDTH_REM}rem`;
export const TABLE_WIRE_HEIGHT_CSS = `${TABLE_WIRE_HEIGHT_REM}rem`;
