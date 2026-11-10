/**
 * @param {{ text: string, query: string }} props
 * @returns {import('solid-js').JSX.Element}
 */
export const HighlightText = (props) => {
  const parts = () => {
    const query = props.query.trim().toLowerCase();
    if (!query) return [{ text: props.text, match: false }];
    const source = props.text.toLowerCase();
    const result = [];
    let cursor = 0;
    let index = source.indexOf(query, cursor);
    while (index >= 0) {
      if (index > cursor) result.push({ text: props.text.slice(cursor, index), match: false });
      result.push({ text: props.text.slice(index, index + query.length), match: true });
      cursor = index + query.length;
      index = source.indexOf(query, cursor);
    }
    if (cursor < props.text.length) result.push({ text: props.text.slice(cursor), match: false });
    return result;
  };

  return (
    <>
      {parts().map((part) =>
        part.match ? <mark class="search-match">{part.text}</mark> : part.text
      )}
    </>
  );
};
