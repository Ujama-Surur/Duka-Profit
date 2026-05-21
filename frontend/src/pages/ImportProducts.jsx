import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import api from '../utils/api';
import styles from './ImportProducts.module.css';
import { Upload, FileText } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const REQUIRED_FIELDS = ['name', 'price'];
const FIELD_OPTIONS = [
  { key: 'name', label: 'Name (required)' },
  { key: 'price', label: 'Price (required)' },
  { key: 'barcode', label: 'Barcode' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'expiryDate', label: 'Expiry Date' },
];

const guessField = (header) => {
  const normalized = String(header || '').trim().toLowerCase();
  if (['name', 'product', 'product_name', 'product name', 'item', 'item_name'].includes(normalized)) return 'name';
  if (['price', 'selling_price', 'selling price', 'unit_price', 'unit price'].includes(normalized)) return 'price';
  if (['barcode', 'bar code', 'code', 'sku'].includes(normalized)) return 'barcode';
  if (['quantity', 'qty', 'stock'].includes(normalized)) return 'quantity';
  if (['expirydate', 'expiry date', 'expirationdate', 'expiration date', 'exp_date'].includes(normalized)) return 'expiryDate';
  return '';
};

const rowValidation = (row, mapping, index) => {
  const errors = [];
  const rowNumber = index + 2;
  const pick = (key) => row[mapping[key]];
  const name = String(pick('name') || '').trim();
  const price = Number(pick('price'));
  const quantityRaw = pick('quantity');
  const quantity = quantityRaw === undefined || quantityRaw === '' ? 0 : Number(quantityRaw);
  const expiryRaw = pick('expiryDate');

  if (!name) errors.push({ row: rowNumber, field: 'name', message: 'name is required' });
  if (!Number.isFinite(price) || price <= 0) errors.push({ row: rowNumber, field: 'price', message: 'price must be a positive number' });
  if (!Number.isFinite(quantity) || quantity < 0) errors.push({ row: rowNumber, field: 'quantity', message: 'quantity must be 0 or greater' });
  if (expiryRaw !== undefined && String(expiryRaw).trim() !== '' && Number.isNaN(new Date(expiryRaw).getTime())) {
    errors.push({ row: rowNumber, field: 'expiryDate', message: 'expiryDate must be a valid date' });
  }
  return errors;
};

export default function ImportProducts() {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [errors, setErrors] = useState([]);
  const [failedRows, setFailedRows] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [lastImportedSignature, setLastImportedSignature] = useState('');
  const [result, setResult] = useState(null);

  const previewRows = useMemo(() => rows.slice(0, 15), [rows]);
  const missingRequiredMappings = REQUIRED_FIELDS.filter((field) => !mapping[field]);

  const resetState = () => {
    setFile(null);
    setRows([]);
    setHeaders([]);
    setMapping({});
    setErrors([]);
    setFailedRows([]);
    setResult(null);
    setUploadProgress(0);
  };

  const parseFile = (selectedFile) =>
    new Promise((resolve, reject) => {
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results),
        error: reject,
      });
    });

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      toast.error('Please upload a CSV file only');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setIsProcessing(true);
    setErrors([]);
    setFailedRows([]);
    setResult(null);
    setUploadProgress(0);

    try {
      const parsed = await parseFile(selectedFile);
      if (parsed.errors?.length) {
        toast.error('CSV parsing failed. Check file format.');
        return;
      }
      if (!parsed.data?.length) {
        toast.error('No rows found in CSV file');
        return;
      }

      const foundHeaders = parsed.meta.fields || Object.keys(parsed.data[0]);
      const guessed = {};
      foundHeaders.forEach((header) => {
        const field = guessField(header);
        if (field && !guessed[field]) guessed[field] = header;
      });

      const validationErrors = [];
      parsed.data.forEach((row, index) => {
        validationErrors.push(...rowValidation(row, guessed, index));
      });

      setFile(selectedFile);
      setRows(parsed.data);
      setHeaders(foundHeaders);
      setMapping(guessed);
      setErrors(validationErrors);
      toast.success(`Parsed ${parsed.data.length} row(s)`);
    } catch (error) {
      console.error(error);
      toast.error('Failed to parse CSV');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateMapping = (field, header) => {
    setMapping((prev) => {
      const next = { ...prev, [field]: header || '' };
      const validationErrors = [];
      rows.forEach((row, index) => {
        validationErrors.push(...rowValidation(row, next, index));
      });
      setErrors(validationErrors);
      return next;
    });
  };

  const downloadSampleCsv = () => {
    window.open('/sample-products.csv', '_blank');
  };

  const downloadErrorReport = () => {
    if (!failedRows.length) return;
    const csvString = Papa.unparse(
      failedRows.map((item) => ({
        row: item.row || '',
        name: item.name || '',
        barcode: item.barcode || '',
        error: item.error || 'Unknown error',
      }))
    );
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'import-failed-rows.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!file || !rows.length) {
      toast.error('Please choose a CSV file first');
      return;
    }
    if (missingRequiredMappings.length) {
      toast.error('Map required columns before import');
      return;
    }
    if (errors.length) {
      toast.error('Fix validation errors before import');
      return;
    }

    const signature = `${file.name}-${file.size}-${file.lastModified}`;
    if (signature === lastImportedSignature) {
      toast.error('This file was already imported. Re-select to import again.');
      return;
    }

    const confirmed = window.confirm(`Import ${rows.length} products?`);
    if (!confirmed) return;

    setIsUploading(true);
    setUploadProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('mapping', JSON.stringify(mapping));
      formData.append('replaceExisting', String(replaceExisting));
      formData.append('skipDuplicates', String(skipDuplicates));

      const { data } = await api.post('/products/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      });

      setResult(data);
      setFailedRows(data.failedRecords || []);
      setLastImportedSignature(signature);

      if (data.successfullyImported > 0) {
        toast.success(`Imported ${data.successfullyImported} product(s)`);
      }
      if (data.failedCount > 0) {
        toast.error(`${data.failedCount} row(s) failed. Review error report.`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Import failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Upload size={24} /> {t('importProducts')}</h1>
        <p className="page-subtitle">CSV import with validation, mapping and duplicate handling</p>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Upload CSV</h3>
          <button className="btn btn-secondary" onClick={downloadSampleCsv}>Download Sample CSV</button>
        </div>

        <div
          className={`${styles.uploadArea} ${isDragging ? styles.dragging : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFileSelect(e.dataTransfer.files[0]);
          }}
          onClick={() => document.getElementById('import-file-input')?.click()}
        >
          <input
            id="import-file-input"
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e.target.files?.[0])}
          />
          <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}><FileText size={48} color="var(--text-muted)" /></div>
          <div style={{ fontWeight: 600 }}>{isDragging ? 'Drop CSV here' : 'Drag and drop CSV here'}</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>CSV only, max 5MB</div>
        </div>

        {file && (
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
            <span>Selected: <strong>{file.name}</strong> ({Math.round(file.size / 1024)} KB)</span>
            <button className="btn btn-ghost btn-sm" onClick={resetState}>Clear</button>
          </div>
        )}
      </div>

      {isProcessing && (
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 12px auto' }} />
          <div>Parsing CSV...</div>
        </div>
      )}

      {!!headers.length && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Column Mapping</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Map your CSV headers to required fields.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {FIELD_OPTIONS.map((field) => (
              <div key={field.key} className="form-group">
                <label className="form-label">{field.label}</label>
                <select
                  className="form-input"
                  value={mapping[field.key] || ''}
                  onChange={(e) => updateMapping(field.key, e.target.value)}
                >
                  <option value="">Not mapped</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>{header}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {!!missingRequiredMappings.length && (
            <div style={{ marginTop: 10, color: 'var(--red)', fontSize: 13 }}>
              Required mappings missing: {missingRequiredMappings.join(', ')}
            </div>
          )}
        </div>
      )}

      {!!errors.length && (
        <div className="card" style={{ marginBottom: 20, borderColor: 'var(--red)' }}>
          <h3 style={{ marginTop: 0, color: 'var(--red)' }}>Validation Errors ({errors.length})</h3>
          <div style={{ maxHeight: 220, overflowY: 'auto', fontSize: 13 }}>
            {errors.slice(0, 50).map((error, index) => (
              <div key={`${error.row}-${index}`} style={{ padding: '6px 8px', marginBottom: 6, background: '#FEF2F2', borderRadius: 6 }}>
                Row {error.row} - {error.field}: {error.message}
              </div>
            ))}
            {errors.length > 50 && <div>...and {errors.length - 50} more</div>}
          </div>
        </div>
      )}

      {!!previewRows.length && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Preview ({previewRows.length} of {rows.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Price</th>
                  <th>Barcode</th>
                  <th>Quantity</th>
                  <th>Expiry Date</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={index}>
                    <td>{row[mapping.name] || '-'}</td>
                    <td>{row[mapping.price] || '-'}</td>
                    <td>{row[mapping.barcode] || '-'}</td>
                    <td>{row[mapping.quantity] || '0'}</td>
                    <td>{row[mapping.expiryDate] || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!!rows.length && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Import Options</h3>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={replaceExisting} onChange={(e) => setReplaceExisting(e.target.checked)} />
              Replace existing products by barcode
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} />
              Skip duplicates
            </label>
          </div>

          {isUploading && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ height: 8, borderRadius: 999, background: '#E5E7EB', overflow: 'hidden' }}>
                <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--green-primary)', transition: 'width 0.2s ease' }} />
              </div>
              <div style={{ fontSize: 12, marginTop: 6, color: 'var(--text-muted)' }}>Uploading... {uploadProgress}%</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleImport} disabled={isUploading || !rows.length}>
              {isUploading ? 'Importing...' : `Import ${rows.length} Products`}
            </button>
            <button className="btn btn-ghost" onClick={resetState} disabled={isUploading}>Reset</button>
          </div>
        </div>
      )}

      {result && (
        <div className="card" style={{ marginTop: 20 }}>
          <h3 style={{ marginTop: 0 }}>Import Result</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, fontSize: 13 }}>
            <div><strong>Total:</strong> {result.totalRecords}</div>
            <div><strong>Imported:</strong> {result.successfullyImported}</div>
            <div><strong>Created:</strong> {result.createdCount}</div>
            <div><strong>Updated:</strong> {result.updatedCount}</div>
            <div><strong>Skipped:</strong> {result.skippedCount}</div>
            <div><strong>Failed:</strong> {result.failedCount}</div>
          </div>
          {!!failedRows.length && (
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-secondary btn-sm" onClick={downloadErrorReport}>Download Error Report</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
