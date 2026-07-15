/*
 * WAREHOUSE LAYOUT (fixed physical structure)
 * ---------------------------------------------
 * This defines the SHAPE of the warehouse: which columns exist on each
 * floor, which rows in each column are real storage slots vs. aisle/cage
 * space. This should rarely change (only if racks are physically added
 * or removed).
 *
 * Both floors currently share the same shape, based on the reference photo:
 *   - Columns, left to right: A, B, (aisle), C, D, (aisle), (aisle), G, H, (aisle), I, J, K
 *   - A "Cage" occupies columns A+B for rows 1-6 (not a storage slot).
 *   - Column C is aisle for rows 1-6, storage for rows 7-13.
 *   - Columns D, G, H are storage for all rows 1-13.
 *   - Column K is storage for rows 1-6, aisle for rows 7-13.
 *   - Columns I and J are aisle for all rows (no storage).
 *
 * If your real warehouse differs, edit FLOOR_DEF below to match — every
 * slot on the page is generated from this definition.
 */

const FLOOR_DEF = {
  // Visual column order (left to right). Any key not listed in
  // slotColumns is treated as a plain aisle (gray, no slots).
  columnOrder: ['A', 'B', 'aisle1', 'C', 'D', 'aisle2', 'aisle3', 'G', 'H', 'aisle4', 'I', 'J', 'K'],

  // Columns that are aisles for their entire height (just visual filler).
  aisleColumns: ['aisle1', 'aisle2', 'aisle3', 'aisle4', 'I', 'J'],

  // The black "Cage" block.
  cage: { cols: ['A', 'B'], rowStart: 1, rowEnd: 6, label: 'Cage' },

  // Real storage columns and which row numbers hold slots.
  slotColumns: {
    A: { rowStart: 7, rowEnd: 13 },
    B: { rowStart: 7, rowEnd: 13 },
    C: { rowStart: 7, rowEnd: 13 },
    D: { rowStart: 1, rowEnd: 13 },
    G: { rowStart: 1, rowEnd: 13 },
    H: { rowStart: 1, rowEnd: 13 },
    K: { rowStart: 1, rowEnd: 6 },
  },

  totalRows: 13,
};

// Same shape used for both floors. If floor 2 ever differs physically,
// give it its own definition and reference it in FLOORS below.
const FLOORS = [
  { id: 1, label: '1st Floor', theme: 'floor-1', def: FLOOR_DEF },
  { id: 2, label: '2nd Floor', theme: 'floor-2', def: FLOOR_DEF },
];

/*
 * CRATES (the actual inventory)
 * ---------------------------------------------
 * Each crate has a PERMANENT number and a customer name that changes as
 * jobs come and go. `floor`, `col`, `row` is wherever it currently sits.
 *
 * This starter list is intentionally EMPTY. Transcribing ~130 small cells
 * reliably from a photo isn't something worth guessing at for real
 * inventory — use the "Bulk Import" button on the page to paste your crate
 * list in one shot (format explained in the Import dialog and README),
 * or add crates one at a time by clicking any empty slot.
 */
let SEED_CRATES = [];
