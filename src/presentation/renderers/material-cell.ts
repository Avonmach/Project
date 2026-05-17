import { normalizeName } from "../../domain/shared/format";

export interface MaterialCellReference {
  readonly name: string;
  readonly icon?: string | null;
  readonly wikiPage?: string | null;
}

export interface MaterialCellRow {
  readonly name: string;
}

export function makeMaterialCell(
  row: MaterialCellRow,
  materialByName: ReadonlyMap<string, MaterialCellReference>
): HTMLTableCellElement {
  const material = materialByName.get(normalizeName(row.name));
  const cell = document.createElement("td");
  cell.className = "material-cell";
  if (material?.icon) {
    const image = document.createElement("img");
    image.src = `data/${material.icon}`;
    image.alt = "";
    image.loading = "lazy";
    cell.append(image);
  }
  if (material?.wikiPage) {
    const label = document.createElement("a");
    label.textContent = row.name;
    label.className = "artifact-link";
    label.href = material.wikiPage;
    label.target = "_blank";
    label.rel = "noreferrer";
    cell.append(label);
    return cell;
  }

  const label = document.createElement("span");
  label.textContent = row.name;
  cell.append(label);
  return cell;
}
