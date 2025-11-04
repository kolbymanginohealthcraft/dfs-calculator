/**
 * Server-Side XML Parser
 * 
 * Uses Node.js XML parsing instead of browser DOMParser
 * SERVER-ONLY: This file should NEVER be imported by client-side code
 * 
 * This parser produces the same output format as the client-side parser
 * to ensure compatibility with existing calculation code.
 */

import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: true,
  ignoreNameSpace: true,
  removeNSPrefix: true,
  parseTagValue: false,
  parseNodeValue: false,
  parseTrueNumberOnly: false,
  arrayMode: false,
  trimValues: true,
  processEntities: true,
  htmlEntities: true,
  textNodeName: '#text',
  attributeNamePrefix: ''
});

/**
 * Parse XML string into a flat object of tag -> value pairs
 * Matches the output format of the client-side DOMParser-based parser
 * 
 * @param {string} xmlString - XML string to parse
 * @returns {Object} Object with tag names as keys and text content as values
 */
export function parseXml(xmlString) {
  try {
    // Parse XML using fast-xml-parser
    const parsed = parser.parse(xmlString);
    
    // Extract root element (usually ASSESSMENT)
    const rootKey = Object.keys(parsed)[0];
    const rootElement = parsed[rootKey];
    
    // Flatten the XML structure into a simple tag -> value map
    // This matches the behavior of the client-side parser
    const result = {};
    
    /**
     * Recursively traverse the XML object and extract leaf node values
     * Only extracts values from nodes with no children (leaf nodes)
     * This matches the client-side behavior: node.children.length === 0
     * 
     * @param {Object} obj - Current object being traversed
     */
    function traverse(obj) {
      if (typeof obj !== 'object' || obj === null) {
        return;
      }
      
      // Check if this is a leaf node (has #text but no child elements)
      if (typeof obj === 'object' && '#text' in obj) {
        const textValue = obj['#text'];
        // Check if there are other properties besides #text (indicating children)
        const hasChildren = Object.keys(obj).some(key => key !== '#text');
        if (!hasChildren && textValue !== undefined && textValue !== null && textValue !== '') {
          // This is a leaf node - we'll capture it in the parent's traversal
          return;
        }
      }
      
      for (const [key, value] of Object.entries(obj)) {
        // Skip special keys
        if (key === '#text' || key.startsWith('@')) {
          continue;
        }
        
        // If value is a string or number, it's a leaf node
        if (typeof value === 'string' || typeof value === 'number') {
          result[key] = String(value).trim();
        } 
        // If value is an object
        else if (value && typeof value === 'object') {
          // Check if it's a leaf node (has #text but no other properties)
          if ('#text' in value && Object.keys(value).length === 1) {
            const textValue = value['#text'];
            if (textValue !== undefined && textValue !== null && textValue !== '') {
              result[key] = String(textValue).trim();
            }
          } 
          // If it's an array, process each element
          else if (Array.isArray(value)) {
            // For arrays in MDS XML, we typically only want the first element
            // or handle them specially - but MDS usually doesn't have duplicate tags
            if (value.length > 0) {
              if (typeof value[0] === 'string' || typeof value[0] === 'number') {
                result[key] = String(value[0]).trim();
              } else if (typeof value[0] === 'object' && '#text' in value[0]) {
                const textValue = value[0]['#text'];
                if (textValue !== undefined && textValue !== null && textValue !== '') {
                  result[key] = String(textValue).trim();
                }
              } else {
                traverse(value[0]);
              }
            }
          }
          // Otherwise, recursively traverse
          else {
            traverse(value);
          }
        }
      }
    }
    
    traverse(rootElement);
    
    return result;
  } catch (error) {
    console.error('XML parsing error:', error);
    throw new Error(`Failed to parse XML: ${error.message}`);
  }
}

