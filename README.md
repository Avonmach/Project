# Mein Projekt

## RuneScape 3 Archaeology Analyzer

Run the local server:

```powershell
npm start
```

Then open:

```text
http://localhost:8080
```

The first version detects occupied damaged-artefact slots in `Damaged_Items.png`, removes the grey RuneScape background from each crop, compares the crop against local transparent RuneScape Wiki reference icons, reads visible yellow stack quantities where possible, and shows the total quantity inside the page. Low-confidence or wrong quantities can be corrected directly in the table.

The damaged artefact database is stored in `data/damaged-artifacts.json`, with downloaded reference icons in `data/reference-icons/`.

To rebuild the database from the RuneScape Wiki:

```powershell
npm run build:database
```
