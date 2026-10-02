/** The single row a statement must return (insert ... returning, lookup by key). */
export function expectRow<Row>(rows: readonly Row[], statement: string): Row {
  const [row] = rows;
  if (row === undefined) {
    throw new Error(`no row returned by: ${statement}`);
  }
  return row;
}
