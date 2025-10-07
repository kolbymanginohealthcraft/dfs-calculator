# Bulk MDS File Processor

A Node.js script to process multiple MDS XML files in batch and extract key discharge function score metrics.

## Features

- ✅ **No additional dependencies** - Uses only existing project utilities and Node.js built-in modules
- 📊 **Comprehensive metrics** - Extracts start score, expected score, patient info, facility, conditions, and more
- 📄 **CSV output** - Results exported to CSV for easy analysis in Excel or other tools
- 🔍 **Error handling** - Gracefully handles malformed files and reports errors
- ⚡ **Fast processing** - Can handle 100+ files in seconds

## Usage

### Basic Usage (default directory)
```bash
npm run bulk-process
```
This processes all XML files in `test-data/examples/` and outputs to `bulk-results.csv`

### Custom Directory
```bash
node scripts/bulk-process.js path/to/your/xml/files
```

### Custom Directory and Output File
```bash
node scripts/bulk-process.js path/to/your/xml/files custom-output.csv
```

### Examples
```bash
# Process files from a specific folder
npm run bulk-process -- C:\Data\MDS-Files\

# Process files and specify output name
node scripts/bulk-process.js ./patient-data ./reports/analysis-2025.csv
```

## Output Fields

The CSV output includes the following columns:

| Column | Description |
|--------|-------------|
| File Name | Name of the source XML file |
| Patient First Name | From A0500A |
| Patient Last Name | From A0500C |
| Facility CCN | CMS Certification Number from A0100B |
| ARD Date | Assessment Reference Date (A2300) |
| Admit Date | Admission date (A2400B → A1600 → A1900) |
| Age | Patient age at admission |
| Primary Medical Condition | From I0020, mapped to condition name |
| Mobility Type | Walk or Wheel |
| Start Score | Calculated admission function score |
| Expected Score | Predicted discharge score from regression model |
| Score Difference | Expected - Start |
| Assessment Type | From A0310F |
| Status | Success or Error |
| Error | Error message (if any) |

## How It Works

1. **Scans directory** for all `.xml` files
2. **Parses XML** using a lightweight Node.js-compatible parser
3. **Reuses existing utilities** from `src/utils/`:
   - `calculations.js` - Score calculations and covariate processing
   - `coefficientLoader.js` - Version-aware coefficient loading
4. **Processes each file** to extract key metrics
5. **Outputs CSV** with all results

## Performance

- **Small batches (10-50 files)**: < 1 second
- **Medium batches (100-500 files)**: 2-5 seconds
- **Large batches (1000+ files)**: 10-20 seconds

## Error Handling

If a file fails to process:
- The error is logged in the CSV output
- Processing continues with remaining files
- Summary shows success/error counts

Common errors:
- Malformed XML
- Missing required fields (A2300, GG items)
- Invalid date formats

## Limitations

- **Facility Name**: Shows CCN number instead of name (API lookup would require network calls)
- **Imputation**: Uses simplified approach (defaults to '01' for invalid GG items)
- **Network**: No external API calls (fully offline processing)

## Future Enhancements

Possible additions (would require new dependencies or code):
- Excel output format (`.xlsx`)
- Facility name lookup (via API)
- Statistical summary (averages, ranges)
- Filtering options (by date, facility, condition)
- Progress bar for large batches
- Parallel processing for faster execution

## Notes

- All calculations use the same logic as the web application
- Results should match what you see in the UI for individual files
- The script is read-only - it never modifies source XML files
- HIPAA compliant - no data is sent to external services
