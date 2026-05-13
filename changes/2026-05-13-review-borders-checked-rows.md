# Review Borders And Checked Rows

Updated review/correction visuals.

Changed quantity/reference warnings:

- Marked quantity fields keep the normal row background.
- Quantity review is shown with a red inset border on the quantity input.
- Ambiguous reference review is shown with a red inset border on the reference image.
- Red borders use inward `box-shadow` so the image/control size does not change.

Corrected/checkup state:

- Removed visible `edited` comments for changed quantities.
- Manual reference changes no longer show extra text comments.
- Rows become light green only when both checks have been handled:
  - quantity manually checked/changed
  - reference manually corrected/confirmed

Other behavior:

- Rows needing review no longer use a yellow background.

Verification:

- `node --check app.js`
