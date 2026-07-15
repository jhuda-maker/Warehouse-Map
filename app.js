/*
 * Warehouse map app logic.
 * Data model: CRATES is an array of { number, name, floor, col, row }.
 * `number` is the crate's permanent ID. `name` is the customer currently
 * assigned to it. `floor`/`col`/`row` is its current physical location.
 * Moving a crate (drag-and-drop) just changes floor/col/row.
 */

const STORAGE_KEY = 'warehouseCrates_v1';

let CRATES = loadCrates();
let draggedNumber = null;

function loadCrates() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn('Could not read saved layout', e); }
  return JSON.parse(JSON.stringify(SEED_CRATES));
}

function saveCrates() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(CRATES));
  const s = document.getElementById('saveStatus');
  if (s) {
    s.textContent = 'Saved ' + new Date().toLocaleTimeString();
  }
}

function findCrateAt(floor, col, row) {
  return CRATES.find(c => c.floor === floor && c.col === col && c.row === row);
}

function findCrateByNumber(number) {
  return CRATES.find(c => String(c.number) === String(number));
}

/* ---------- Rendering ---------- */

function renderAll() {
  const wrap = document.getElementById('floorsWrap');
  wrap.innerHTML = '';
  FLOORS.forEach(floor => wrap.appendChild(renderFloor(floor)));
}

function renderFloor(floor) {
  const def = floor.def;
  const container = document.createElement('div');
  container.className = 'floor ' + floor.theme;

  const header = document.createElement('div');
  header.className = 'floor-header';
  header.textContent = floor.label;
  container.appendChild(header);

  const grid = document.createElement('div');
  grid.className = 'grid';

  // Column 1 is the row-number gutter; data columns start at grid column 2.
  const colIndex = {};
  def.columnOrder.forEach((colKey, i) => { colIndex[colKey] = i + 2; });

  grid.style.gridTemplateColumns = ['auto', ...def.columnOrder.map(colKey =>
    def.aisleColumns.includes(colKey) ? 'var(--aisle-w)' : 'var(--slot-w)'
  )].join(' ');

  // Every element below gets an EXPLICIT grid-row/grid-column so that
  // skipping cells (e.g. ones covered by the cage) never shifts later
  // cells — relying on source-order auto-placement breaks as soon as a
  // spanning item (the cage) is involved.
  function place(el, colStart, colSpan, rowStart, rowSpan) {
    el.style.gridColumn = `${colStart} / span ${colSpan}`;
    el.style.gridRow = `${rowStart} / span ${rowSpan}`;
    grid.appendChild(el);
    return el;
  }

  // Header row (row 1): blank corner + column labels.
  def.columnOrder.forEach(colKey => {
    if (def.aisleColumns.includes(colKey)) return;
    const lbl = document.createElement('div');
    lbl.className = 'col-label';
    lbl.textContent = colKey;
    place(lbl, colIndex[colKey], 1, 1, 1);
  });

  // Row-number gutter, one per data row (grid rows 2..totalRows+1).
  for (let row = 1; row <= def.totalRows; row++) {
    const gutter = document.createElement('div');
    gutter.className = 'col-label';
    gutter.textContent = row;
    place(gutter, 1, 1, row + 1, 1);
  }

  // Cage block (single spanning element).
  const cage = def.cage;
  if (cage) {
    const el = document.createElement('div');
    el.className = 'cage';
    el.textContent = cage.label;
    place(el, colIndex[cage.cols[0]], cage.cols.length, cage.rowStart + 1, cage.rowEnd - cage.rowStart + 1);
  }

  // Aisle columns run the full height.
  def.aisleColumns.forEach(colKey => {
    const el = document.createElement('div');
    el.className = 'aisle';
    place(el, colIndex[colKey], 1, 2, def.totalRows);
  });

  // Data columns: for each row, either a storage slot, a cage-covered cell
  // (skip — already drawn), or filler aisle space.
  def.columnOrder.forEach(colKey => {
    if (def.aisleColumns.includes(colKey)) return;
    for (let row = 1; row <= def.totalRows; row++) {
      if (cage && cage.cols.includes(colKey) && row >= cage.rowStart && row <= cage.rowEnd) {
        continue; // covered by the cage element
      }
      const slotDef = def.slotColumns[colKey];
      const isSlot = slotDef && row >= slotDef.rowStart && row <= slotDef.rowEnd;
      if (!isSlot) {
        const filler = document.createElement('div');
        filler.className = 'aisle';
        place(filler, colIndex[colKey], 1, row + 1, 1);
        continue;
      }
      const cell = buildSlot(floor, colKey, row);
      place(cell, colIndex[colKey], 1, row + 1, 1);
    }
  });

  container.appendChild(grid);
  return container;
}

function buildSlot(floor, colKey, row) {
  const slot = document.createElement('div');
  slot.className = 'slot';
  slot.dataset.floor = floor.id;
  slot.dataset.col = colKey;
  slot.dataset.row = row;

  slot.addEventListener('dragover', onSlotDragOver);
  slot.addEventListener('dragleave', onSlotDragLeave);
  slot.addEventListener('drop', onSlotDrop);

  const crate = findCrateAt(floor.id, colKey, row);
  if (crate) {
    slot.appendChild(buildCrateEl(crate));
  } else {
    slot.textContent = 'Empty';
    slot.addEventListener('click', () => openAddDialog(floor.id, colKey, row));
  }
  return slot;
}

function buildCrateEl(crate) {
  const el = document.createElement('div');
  el.className = 'crate';
  el.draggable = true;
  el.dataset.number = crate.number;

  const num = document.createElement('div');
  num.className = 'num';
  num.textContent = crate.number;
  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = crate.name || '(no name)';
  el.appendChild(num);
  el.appendChild(name);

  el.addEventListener('dragstart', e => {
    draggedNumber = crate.number;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(crate.number));
  });
  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    draggedNumber = null;
  });
  el.addEventListener('click', e => {
    e.stopPropagation();
    openEditDialog(crate.number);
  });
  return el;
}

function onSlotDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('drag-over');
}
function onSlotDragLeave(e) {
  e.currentTarget.classList.remove('drag-over');
}
function onSlotDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  const number = e.dataTransfer.getData('text/plain') || draggedNumber;
  if (!number) return;
  const targetFloor = Number(e.currentTarget.dataset.floor);
  const targetCol = e.currentTarget.dataset.col;
  const targetRow = Number(e.currentTarget.dataset.row);
  moveCrate(number, targetFloor, targetCol, targetRow);
}

function moveCrate(number, floor, col, row) {
  const crate = findCrateByNumber(number);
  if (!crate) return;
  if (crate.floor === floor && crate.col === col && crate.row === row) return;

  const occupant = findCrateAt(floor, col, row);
  if (occupant && occupant.number !== crate.number) {
    // swap: occupant takes the dragged crate's old spot
    occupant.floor = crate.floor;
    occupant.col = crate.col;
    occupant.row = crate.row;
  }
  crate.floor = floor;
  crate.col = col;
  crate.row = row;

  saveCrates();
  renderAll();
}

/* ---------- Add / edit dialog ---------- */

function openAddDialog(floor, col, row) {
  showModal({
    title: `Add crate to ${col}${row} — ${floor === 1 ? '1st' : '2nd'} Floor`,
    fields: [
      { key: 'number', label: 'Crate number (permanent)', value: '' },
      { key: 'name', label: 'Customer name', value: '' },
    ],
    onSave: (values) => {
      if (!values.number) return alert('Crate number is required.');
      if (findCrateByNumber(values.number)) return alert('That crate number already exists. Numbers must be unique.');
      CRATES.push({ number: values.number, name: values.name, floor, col, row });
      saveCrates();
      renderAll();
    },
  });
}

function openEditDialog(number) {
  const crate = findCrateByNumber(number);
  if (!crate) return;
  showModal({
    title: `Crate #${crate.number}`,
    fields: [
      { key: 'name', label: 'Customer name', value: crate.name || '' },
    ],
    onSave: (values) => {
      crate.name = values.name;
      saveCrates();
      renderAll();
    },
    onDelete: () => {
      if (!confirm(`Remove crate #${crate.number} from the warehouse map? This deletes it entirely.`)) return;
      CRATES = CRATES.filter(c => c.number !== crate.number);
      saveCrates();
      renderAll();
      closeModal();
    },
  });
}

function showModal({ title, fields, onSave, onDelete }) {
  const backdrop = document.getElementById('modalBackdrop');
  const body = document.getElementById('modalBody');
  body.innerHTML = '';

  const h2 = document.createElement('h2');
  h2.textContent = title;
  body.appendChild(h2);

  const inputs = {};
  fields.forEach(f => {
    const label = document.createElement('label');
    label.textContent = f.label;
    const input = document.createElement('input');
    input.value = f.value;
    inputs[f.key] = input;
    body.appendChild(label);
    body.appendChild(input);
  });

  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const leftGroup = document.createElement('div');
  if (onDelete) {
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete crate';
    delBtn.className = 'danger';
    delBtn.onclick = onDelete;
    leftGroup.appendChild(delBtn);
  }

  const rightGroup = document.createElement('div');
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = closeModal;
  const saveBtn = document.createElement('button');
  saveBtn.textContent = 'Save';
  saveBtn.onclick = () => {
    const values = {};
    Object.keys(inputs).forEach(k => values[k] = inputs[k].value.trim());
    onSave(values);
    closeModal();
  };
  rightGroup.appendChild(cancelBtn);
  rightGroup.appendChild(saveBtn);

  actions.appendChild(leftGroup);
  actions.appendChild(rightGroup);
  body.appendChild(actions);

  backdrop.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.add('hidden');
}

/* ---------- Import / export ---------- */

function exportJSON() {
  const blob = new Blob([JSON.stringify(CRATES, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'warehouse-data.json';
  a.click();
  URL.revokeObjectURL(url);
}

function openImportDialog() {
  const backdrop = document.getElementById('modalBackdrop');
  const body = document.getElementById('modalBody');
  body.innerHTML = '';

  const h2 = document.createElement('h2');
  h2.textContent = 'Bulk import crates';
  body.appendChild(h2);

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent = 'Paste JSON (array of {number,name,floor,col,row}) or CSV lines: number,name,floor,col,row — one crate per line. This REPLACES the current layout.';
  body.appendChild(hint);

  const textarea = document.createElement('textarea');
  textarea.placeholder = '26,Tami Bosco,1,D,1\n17,Ruth Barrow,1,G,1\n...';
  body.appendChild(textarea);

  const fileLabel = document.createElement('label');
  fileLabel.textContent = 'Or choose a .json file:';
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { textarea.value = reader.result; };
    reader.readAsText(file);
  };
  body.appendChild(fileLabel);
  body.appendChild(fileInput);

  const actions = document.createElement('div');
  actions.className = 'modal-actions';
  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = closeModal;
  const importBtn = document.createElement('button');
  importBtn.textContent = 'Import & replace';
  importBtn.onclick = () => {
    const text = textarea.value.trim();
    if (!text) return closeModal();
    let parsed;
    try {
      if (text.startsWith('[')) {
        parsed = JSON.parse(text);
      } else {
        parsed = text.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
          const [number, name, floor, col, row] = line.split(',').map(s => s.trim());
          return { number, name, floor: Number(floor), col, row: Number(row) };
        });
      }
    } catch (e) {
      alert('Could not parse that input: ' + e.message);
      return;
    }
    CRATES = parsed;
    saveCrates();
    renderAll();
    closeModal();
  };
  actions.appendChild(cancelBtn);
  actions.appendChild(importBtn);
  body.appendChild(actions);

  backdrop.classList.remove('hidden');
}

/* ---------- Init ---------- */

document.addEventListener('DOMContentLoaded', () => {
  renderAll();
  document.getElementById('exportBtn').addEventListener('click', exportJSON);
  document.getElementById('importBtn').addEventListener('click', openImportDialog);
  document.getElementById('modalBackdrop').addEventListener('click', e => {
    if (e.target.id === 'modalBackdrop') closeModal();
  });
});
