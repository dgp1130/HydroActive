import { attr, component, ComponentDef } from 'hydroactive';
import { Accessor, createSignal } from 'hydroactive/signal.js';

// A generic implementation of a sortable table. Takes a prerendered table with column
// headings marked with `data-key` attributes and a `<select>` element choosing between
// those same keys. Choosing a heading with the `<select>` element will update the table
// to be sorted by that column.
export const SortableTable = component('sortable-table', ($) => {
  // Hydrate the sort key for each column header.
  const columnKeys = $.readAll('thead > tr > th', String, attr('data-key'));

  // Hydrate user data from the table.
  const tableData = $.queryAll('tbody > tr').map((row) => {
    // Scope query to the current row and read all table cells in it.
    const data = $.scope(row).readAll('td', String);

    // Validate the row has the correct number of columns.
    if (columnKeys.length !== data.length) {
      throw new Error(`Expected all rows to have ${
          columnKeys.length} cells to align with the th tags. However, a row had ${
          data.length} cells instead.`);
    }

    return { data, row } as SortableTableRow;
  });

  // Track sort key signal from the select menu.
  const sortKey = useSelect($, 'select');

  // Create computed signal of the column index to sort by, based on the sort key.
  const sortIndex: Accessor<number> = () => {
    const columnIndex = columnKeys.findIndex((key) => key === sortKey());
    if (columnIndex === -1) {
      throw new Error(`Failed to find a header column with \`data-key="${
          sortKey()}"\`. Do the \`<select>\` option values match the header column \`data-key\` attributes?`);
    }

    return columnIndex;
  };

  // Create computed signal of sorted users.
  const sortedData: Accessor<SortableTableRow[]> = () => {
    return Array.from(tableData).sort((l, r) => {
      // Safe to `!` the result, because we previously validated that each row
      // has the right number of columns.
      const left = l.data[sortIndex()]!;
      const right = r.data[sortIndex()]!;
      return left.toString().localeCompare(right.toString());
    });
  };

  // Update row order as a side effect of changes to the sorted list.
  const tableBody = $.query('tbody');
  $.effect(() => {
    tableBody.append(...sortedData().map((userRow) => userRow.row));
  });
});

declare global {
  interface HTMLElementTagNameMap {
    'sortable-table': InstanceType<typeof SortableTable>;
  }
}

interface SortableTableRow {
  data: string[];
  row: HTMLTableRowElement;
}

function useSelect($: ComponentDef<{}, HTMLElement>, selector: string): Accessor<string> {
  const select = $.query(selector);
  if (!(select instanceof HTMLSelectElement)) {
    throw new Error(`\`useSelect\` expected a \`<select>\` element, but found a \`<${
        select.tagName.toLowerCase()}>\` when querying \`${selector}\`.`);
  }

  const [ value, setValue ] = createSignal(select.value);
  $.listen(select, 'change', () => { setValue(select.value); });
  return value;
}
