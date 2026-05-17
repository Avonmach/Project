export function makeOverviewCard(label: string, value: string | number): HTMLDivElement {
  const card = document.createElement("div");
  card.className = "overview-card";
  const labelEl = document.createElement("span");
  labelEl.className = "summary-label";
  labelEl.textContent = label;
  const valueEl = document.createElement("strong");
  valueEl.textContent = String(value);
  card.append(labelEl, valueEl);
  return card;
}

export function makeEmptyMessage(message: string): HTMLParagraphElement {
  const empty = document.createElement("p");
  empty.className = "empty";
  empty.textContent = message;
  return empty;
}

export function makeTableHead(labels: readonly string[]): HTMLTableSectionElement {
  const head = document.createElement("thead");
  const row = document.createElement("tr");
  for (const label of labels) {
    const cell = document.createElement("th");
    cell.textContent = label;
    row.append(cell);
  }
  head.append(row);
  return head;
}

export function makeTextCell(value: string | number, className = ""): HTMLTableCellElement {
  const cell = document.createElement("td");
  if (className) cell.className = className;
  cell.textContent = String(value);
  return cell;
}

export function makeLinkedTextCell(label: string, href?: string | null): HTMLTableCellElement {
  const cell = document.createElement("td");
  if (!href) {
    cell.textContent = label;
    return cell;
  }
  const link = document.createElement("a");
  link.className = "artifact-link";
  link.href = href;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = label;
  cell.append(link);
  return cell;
}

export function makePlanTable(captionText: string, rows: readonly [string, number][]): HTMLTableElement {
  const table = document.createElement("table");
  table.className = "plan-table";
  const caption = document.createElement("caption");
  caption.textContent = captionText;
  const head = document.createElement("thead");
  const headRow = document.createElement("tr");
  const nameHead = document.createElement("th");
  const qtyHead = document.createElement("th");
  nameHead.textContent = "Group";
  qtyHead.textContent = "Qty";
  headRow.append(nameHead, qtyHead);
  head.append(headRow);
  const body = document.createElement("tbody");
  for (const [name, quantity] of rows) {
    const row = document.createElement("tr");
    const nameCell = document.createElement("td");
    const quantityCell = document.createElement("td");
    nameCell.textContent = name;
    quantityCell.textContent = String(quantity);
    row.append(nameCell, quantityCell);
    body.append(row);
  }
  table.append(caption, head, body);
  return table;
}
