/**
 * Data File API Endpoint
 * 
 * Serves JSON data files with caching headers
 * to optimize data loading performance
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  const { filename } = req.query;
  
  // Validate filename to prevent directory traversal
  if (!filename || typeof filename !== 'string' || filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  // Only allow specific data files
  const allowedFiles = [
    'mds_item_lookup.json',
    'mds_section_names.json',
    'icdToHcc.json',
    'coefficients-all-versions.json',
    'end-score-coefficients.json'
  ];

  if (!allowedFiles.includes(filename)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    // Read the data file
    const filePath = join(process.cwd(), 'api', 'data', filename);
    const fileContent = readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileContent);

    // Set caching headers for better performance
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    res.setHeader('Content-Type', 'application/json');
    
    return res.json(data);
  } catch (error) {
    console.error(`Error serving data file ${filename}:`, error);
    return res.status(500).json({ error: 'Failed to load data file' });
  }
}
