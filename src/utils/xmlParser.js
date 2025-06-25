export function parseXml(xmlString) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, "text/xml");

  const result = {};
  const walker = xmlDoc.createTreeWalker(xmlDoc.documentElement, NodeFilter.SHOW_ELEMENT);

  while (walker.nextNode()) {
    const node = walker.currentNode;
    const tag = node.nodeName;
    const value = node.textContent.trim();

    // Ignore empty values and nested parents
    if (value && node.children.length === 0) {
      result[tag] = value;
    }
  }

  return result;
}
