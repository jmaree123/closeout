/**
 * ImportWizard — multi-step modal overlay for Excel file import.
 * Steps: Upload > Column Mapping > Preview & Validate > Import Mode > Importing > Results.
 * Controlled by uiStore.importWizardOpen.
 */

import { useState, useCallback, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  X,
  Upload,
  Check,
  AlertTriangle,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import useUiStore from '../../store/uiStore.js';
import useItemStore from '../../store/itemStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import {
  parseExcelFile,
  autoMapColumns,
  validateRows,
  transformRows,
} from '../../utils/excelParser.js';
import {
  bulkCreateItems,
  clearAllItems,
  getItemByItemId,
} from '../../db/database.js';
import { updateItem as dbUpdateItem } from '../../db/database.js';
import { useTranslation } from '../../hooks/useTranslation.js';

// CloseOut target fields for mapping dropdowns — keep labels in English for import compatibility
const TARGET_FIELDS = [
  { value: '', label: '-- Skip this column --' },
  { value: 'itemId', label: 'Item ID' },
  { value: 'title', label: 'Title *' },
  { value: 'description', label: 'Description' },
  { value: 'department', label: 'Department' },
  { value: 'location', label: 'Location' },
  { value: 'consequence', label: 'Consequence' },
  { value: 'likelihood', label: 'Likelihood' },
  { value: 'riskLevel', label: 'Risk Level' },
  { value: 'effortEstimate', label: 'Effort Estimate' },
  { value: 'effortHours', label: 'Effort Hours' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'assignedTo', label: 'Assigned To' },
  { value: 'status', label: 'Status' },
  { value: 'correctiveAction', label: 'Corrective Action' },
  { value: 'verificationPerson', label: 'Verification Person' },
  { value: 'verificationDate', label: 'Verification Date' },
  { value: 'approvalStatus', label: 'Approval Status' },
  { value: 'approver', label: 'Approver' },
  { value: 'raisedBy', label: 'Raised By' },
  { value: 'raisedDate', label: 'Raised Date' },
  { value: 'source', label: 'Source' },
];

const REQUIRED_FIELDS = ['title'];

export default function ImportWizard() {
  const importWizardOpen = useUiStore((s) => s.importWizardOpen);
  const closeImportWizard = useUiStore((s) => s.closeImportWizard);
  const loadItems = useItemStore((s) => s.loadItems);
  const settings = useSettingsStore((s) => s.settings);
  const { t } = useTranslation();

  // Wizard state
  const [step, setStep] = useState(1);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [validRows, setValidRows] = useState([]);
  const [errors, setErrors] = useState([]);
  const [importMode, setImportMode] = useState('new');
  const [confirmText, setConfirmText] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);

  const dateFormat = settings?.dateFormat || 'DD/MM/YYYY';
  const projectName = settings?.projectName || '';

  // Step labels — translated
  const STEP_LABELS = useMemo(() => [
    t('import_step_upload'),
    t('import_step_map'),
    t('import_step_validate'),
    t('import_step_import'),
    t('import_step_import'),
    t('import_success'),
  ], [t]);

  // Reset wizard state
  const resetWizard = useCallback(() => {
    setStep(1);
    setFileName('');
    setHeaders([]);
    setRows([]);
    setMapping({});
    setValidRows([]);
    setErrors([]);
    setImportMode('new');
    setConfirmText('');
    setImporting(false);
    setProgress(0);
    setResults(null);
  }, []);

  const handleClose = useCallback(() => {
    resetWizard();
    closeImportWizard();
    loadItems();
  }, [resetWizard, closeImportWizard, loadItems]);

  // --- Step 1: File Upload ---
  const onDrop = useCallback(
    async (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (!file) return;

      try {
        const buffer = await file.arrayBuffer();
        const parsed = parseExcelFile(buffer);
        setFileName(file.name);
        setHeaders(parsed.headers);
        setRows(parsed.rows);

        // Auto-map columns
        const autoMapping = autoMapColumns(parsed.headers);
        setMapping(autoMapping);
        setStep(2);
      } catch (err) {
        console.error('Failed to parse Excel file:', err);
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  // --- Step 2: Column Mapping ---
  const updateMapping = useCallback((headerIndex, field) => {
    setMapping((prev) => {
      const next = { ...prev };
      // Remove any existing mapping to this field
      if (field) {
        for (const [key, val] of Object.entries(next)) {
          if (val === headerIndex && key !== field) {
            delete next[key];
          }
        }
      }
      // Remove the old mapping for this header index
      for (const [key, val] of Object.entries(next)) {
        if (val === headerIndex) {
          delete next[key];
        }
      }
      // Set new mapping
      if (field) {
        next[field] = headerIndex;
      }
      return next;
    });
  }, []);

  // Build reverse mapping: headerIndex -> field
  const reverseMapping = useMemo(() => {
    const rm = {};
    for (const [field, idx] of Object.entries(mapping)) {
      rm[idx] = field;
    }
    return rm;
  }, [mapping]);

  const mappedCount = Object.keys(mapping).length;
  const requiredMapped = REQUIRED_FIELDS.every((f) => mapping[f] !== undefined);

  const clearMapping = useCallback(() => setMapping({}), []);
  const autoMap = useCallback(() => {
    const auto = autoMapColumns(headers);
    setMapping(auto);
  }, [headers]);

  // --- Step 3: Validate ---
  const runValidation = useCallback(() => {
    const { validRows: vr, errors: errs } = validateRows(rows, mapping, dateFormat);
    setValidRows(vr);
    setErrors(errs);
    setStep(3);
  }, [rows, mapping, dateFormat]);

  // Preview data (first 10 rows, mapped)
  const previewData = useMemo(() => {
    const displayRows = rows.slice(0, 10);
    const mappedFields = Object.entries(mapping).sort((a, b) => a[1] - b[1]);
    return displayRows.map((row, i) => {
      const obj = {};
      for (const [field, colIdx] of mappedFields) {
        obj[field] = row[colIdx] != null ? String(row[colIdx]) : '';
      }
      return { _rowNum: i + 1, ...obj };
    });
  }, [rows, mapping]);

  // --- Step 4-6: Import ---
  const handleImport = useCallback(async () => {
    setStep(5);
    setImporting(true);
    setProgress(0);

    try {
      const itemData = transformRows(validRows, mapping, dateFormat);
      let added = 0;
      let updated = 0;
      let skipped = 0;
      const importErrors = [];

      if (importMode === 'replace') {
        await clearAllItems();
      }

      const total = itemData.length;

      for (let i = 0; i < total; i++) {
        const data = itemData[i];
        try {
          if (importMode === 'new') {
            // Skip if item ID already exists
            if (data.itemId) {
              const existing = await getItemByItemId(data.itemId);
              if (existing) {
                skipped++;
                setProgress(Math.round(((i + 1) / total) * 100));
                continue;
              }
            }
            await bulkCreateItems([data]);
            added++;
          } else if (importMode === 'sync') {
            if (data.itemId) {
              const existing = await getItemByItemId(data.itemId);
              if (existing) {
                await dbUpdateItem(existing.id, data);
                updated++;
              } else {
                await bulkCreateItems([data]);
                added++;
              }
            } else {
              await bulkCreateItems([data]);
              added++;
            }
          } else {
            // replace — already cleared, just create
            await bulkCreateItems([data]);
            added++;
          }
        } catch (err) {
          importErrors.push({ row: i + 1, message: err.message });
        }

        setProgress(Math.round(((i + 1) / total) * 100));
      }

      setResults({ added, updated, skipped, errors: importErrors });
      setImporting(false);
      setStep(6);
    } catch (err) {
      console.error('Import failed:', err);
      setResults({ added: 0, updated: 0, skipped: 0, errors: [{ row: 0, message: err.message }] });
      setImporting(false);
      setStep(6);
    }
  }, [validRows, mapping, dateFormat, importMode]);

  if (!importWizardOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={!importing ? handleClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-[800px] max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-boronia-navy">{t('import_title')}</h2>
          {!importing && (
            <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 py-3 border-b border-gray-100">
          {STEP_LABELS.map(
            (label, i) => {
              const num = i + 1;
              const isActive = num === step;
              const isComplete = num < step;
              return (
                <div key={num} className="flex items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                      isActive
                        ? 'bg-boronia-coral text-white'
                        : isComplete
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isComplete ? <Check size={14} /> : num}
                  </div>
                  <span
                    className={`text-xs ml-1 mr-3 hidden sm:inline ${
                      isActive ? 'text-boronia-navy font-medium' : 'text-gray-400'
                    }`}
                  >
                    {label}
                  </span>
                  {i < 5 && (
                    <div className="w-4 h-px bg-gray-300 mr-1" />
                  )}
                </div>
              );
            }
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Step 1: Upload */}
          {step === 1 && (
            <div>
              <div
                {...getRootProps()}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-12 cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-boronia-coral bg-boronia-coral/5'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet size={48} className="text-gray-300 mb-4" />
                <p className="text-base font-medium text-gray-700 mb-1">
                  {t('import_drop_prompt')}
                </p>
                <p className="text-xs text-gray-400">
                  {t('import_supported')}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Column Mapping */}
          {step === 2 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-gray-500">
                  <span className="font-medium text-boronia-navy">{mappedCount}</span> / {headers.length}
                  {fileName && (
                    <span className="ml-2 text-xs text-gray-400">({fileName})</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={autoMap}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded transition-colors"
                  >
                    Auto Map
                  </button>
                  <button
                    onClick={clearMapping}
                    className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded transition-colors"
                  >
                    {t('btn_clear')}
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                        Excel Column
                      </th>
                      <th className="text-center px-2 py-2.5 w-8" />
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">
                        CloseOut Field
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {headers.map((header, idx) => {
                      const mappedField = reverseMapping[idx] || '';
                      const isUnmapped = !mappedField;
                      return (
                        <tr
                          key={idx}
                          className={`border-b border-gray-100 ${
                            isUnmapped ? 'bg-amber-50/50' : ''
                          }`}
                        >
                          <td className="px-4 py-2 text-gray-800 font-medium">
                            {header || `Column ${idx + 1}`}
                          </td>
                          <td className="text-center text-gray-300">
                            <ChevronRight size={14} />
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={mappedField}
                              onChange={(e) => updateMapping(idx, e.target.value || '')}
                              className={`w-full border rounded px-2 py-1.5 text-sm ${
                                mappedField
                                  ? 'border-green-300 bg-green-50 text-green-800'
                                  : 'border-gray-200'
                              }`}
                            >
                              {TARGET_FIELDS.map((f) => (
                                <option key={f.value} value={f.value}>
                                  {f.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!requiredMapped && (
                <p className="mt-3 text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle size={14} />
                  Required field must be mapped: Title
                </p>
              )}
            </div>
          )}

          {/* Step 3: Preview & Validate */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-4 mb-4">
                <span className="text-sm">
                  <span className="font-medium text-green-600">{validRows.length}</span> {t('import_rows_valid')}
                </span>
                {errors.length > 0 && (
                  <span className="text-sm">
                    <span className="font-medium text-red-600">{errors.length}</span> {t('import_rows_error')}
                  </span>
                )}
              </div>

              {/* Preview table */}
              <div className="border border-gray-200 rounded-lg overflow-x-auto mb-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Row</th>
                      {Object.keys(mapping).map((field) => (
                        <th
                          key={field}
                          className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap"
                        >
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row) => (
                      <tr key={row._rowNum} className="border-b border-gray-100">
                        <td className="px-3 py-1.5 text-gray-400">{row._rowNum}</td>
                        {Object.keys(mapping).map((field) => (
                          <td
                            key={field}
                            className="px-3 py-1.5 text-gray-700 max-w-[150px] truncate"
                          >
                            {row[field] || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Errors */}
              {errors.length > 0 && (
                <div className="border border-red-200 rounded-lg overflow-hidden">
                  <div className="bg-red-50 px-4 py-2 border-b border-red-200 text-sm font-medium text-red-700">
                    {t('import_errors')}
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {errors.map((err, i) => (
                      <div
                        key={i}
                        className="px-4 py-2 text-xs text-red-600 border-b border-red-100 last:border-b-0"
                      >
                        <span className="font-medium">Row {err.row}:</span> {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Import Mode */}
          {step === 4 && (
            <div>
              <h3 className="text-base font-semibold text-boronia-navy mb-4">
                {t('import_step_import')}
              </h3>
              <div className="space-y-3">
                {[
                  {
                    value: 'new',
                    label: t('import_mode_add'),
                    desc: 'Adds rows that do not already exist. Skips rows with matching Item IDs.',
                  },
                  {
                    value: 'sync',
                    label: 'Full sync',
                    desc: 'Updates existing items by Item ID match, adds new items for unmatched rows.',
                  },
                  {
                    value: 'replace',
                    label: t('import_mode_replace'),
                    desc: 'Clears the entire register and imports all rows fresh.',
                    danger: true,
                  },
                ].map(({ value, label, desc, danger }) => (
                  <button
                    key={value}
                    onClick={() => setImportMode(value)}
                    className={`w-full text-left rounded-lg border-2 p-4 transition-colors ${
                      importMode === value
                        ? danger
                          ? 'border-red-400 bg-red-50'
                          : 'border-boronia-coral bg-boronia-coral/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          importMode === value
                            ? danger
                              ? 'border-red-500'
                              : 'border-boronia-coral'
                            : 'border-gray-300'
                        }`}
                      >
                        {importMode === value && (
                          <div
                            className={`w-2 h-2 rounded-full ${
                              danger ? 'bg-red-500' : 'bg-boronia-coral'
                            }`}
                          />
                        )}
                      </div>
                      <span className={`font-medium ${danger ? 'text-red-700' : 'text-boronia-navy'}`}>
                        {label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">{desc}</p>
                  </button>
                ))}
              </div>

              {importMode === 'replace' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700 font-medium mb-2">
                    This will permanently delete all existing items.
                  </p>
                  <p className="text-xs text-red-600 mb-3">
                    Type your project name to confirm: <strong>{projectName || 'confirm'}</strong>
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={projectName || 'confirm'}
                    className="w-full border border-red-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 5: Importing */}
          {step === 5 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={36} className="text-boronia-coral animate-spin mb-4" />
              <p className="text-base font-medium text-boronia-navy mb-3">
                {t('import_step_import')}...
              </p>
              <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 mb-2">
                <div
                  className="bg-boronia-coral h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">{progress}%</p>
            </div>
          )}

          {/* Step 6: Results */}
          {step === 6 && results && (
            <div className="flex flex-col items-center py-8">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <Check size={28} className="text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-boronia-navy mb-4">{t('import_success')}</h3>
              <div className="flex gap-6 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{results.added}</div>
                  <div className="text-xs text-gray-500">{t('btn_add')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{results.updated}</div>
                  <div className="text-xs text-gray-500">{t('btn_edit')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-500">{results.skipped}</div>
                  <div className="text-xs text-gray-500">Skipped</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{results.errors.length}</div>
                  <div className="text-xs text-gray-500">{t('import_errors')}</div>
                </div>
              </div>

              {results.errors.length > 0 && (
                <div className="w-full border border-red-200 rounded-lg overflow-hidden mb-4">
                  <div className="bg-red-50 px-4 py-2 text-sm font-medium text-red-700 border-b border-red-200">
                    {t('import_errors')}
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {results.errors.map((err, i) => (
                      <div
                        key={i}
                        className="px-4 py-2 text-xs text-red-600 border-b border-red-100 last:border-b-0"
                      >
                        <span className="font-medium">Row {err.row}:</span> {err.message}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleClose}
                className="bg-boronia-coral hover:bg-boronia-coral-light text-white text-sm font-medium rounded-md px-6 py-2.5 transition-colors"
              >
                {t('btn_close')}
              </button>
            </div>
          )}
        </div>

        {/* Footer navigation (steps 1-4) */}
        {step >= 1 && step <= 4 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <button
              onClick={step === 1 ? handleClose : () => setStep((s) => s - 1)}
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
            >
              <ChevronLeft size={16} />
              {step === 1 ? t('btn_cancel') : t('btn_back')}
            </button>

            {step === 2 && (
              <button
                onClick={runValidation}
                disabled={!requiredMapped}
                className="inline-flex items-center gap-1.5 bg-boronia-coral hover:bg-boronia-coral-light text-white text-sm font-medium rounded-md px-5 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('btn_next')}
                <ChevronRight size={16} />
              </button>
            )}

            {step === 3 && (
              <button
                onClick={() => setStep(4)}
                disabled={validRows.length === 0}
                className="inline-flex items-center gap-1.5 bg-boronia-coral hover:bg-boronia-coral-light text-white text-sm font-medium rounded-md px-5 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('btn_next')}
                <ChevronRight size={16} />
              </button>
            )}

            {step === 4 && (
              <button
                onClick={handleImport}
                disabled={
                  importMode === 'replace' &&
                  confirmText.toLowerCase() !== (projectName || 'confirm').toLowerCase()
                }
                className="inline-flex items-center gap-1.5 bg-boronia-coral hover:bg-boronia-coral-light text-white text-sm font-medium rounded-md px-5 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('btn_import')} {validRows.length} {t('register_items')}
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
