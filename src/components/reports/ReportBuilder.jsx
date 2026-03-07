/**
 * ReportBuilder — full-page report builder UI.
 * Left column: report settings (checkboxes, scope, commentary).
 * Right column: preview info (included sections, item count, estimated pages).
 * Generates PDF via pdfExport.js and optionally captures chart DOM elements via html2canvas.
 */

import { useState, useMemo } from 'react';
import { FileDown, Loader2, CheckSquare, Square } from 'lucide-react';
import useItemStore from '../../store/itemStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import { generateReport } from '../../utils/pdfExport.js';
import { useTranslation } from '../../hooks/useTranslation.js';

// ---------------------------------------------------------------------------
// Checkbox component
// ---------------------------------------------------------------------------

function Checkbox({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded-md hover:bg-gray-50 transition-colors"
    >
      {checked ? (
        <CheckSquare size={18} className="text-boronia-coral flex-shrink-0" />
      ) : (
        <Square size={18} className="text-gray-400 flex-shrink-0" />
      )}
      <span className="text-sm text-gray-700">{label}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ReportBuilder() {
  const { items, getFilteredItems } = useItemStore();
  const { settings } = useSettingsStore();
  const { t } = useTranslation();

  const [generating, setGenerating] = useState(false);
  const [scope, setScope] = useState('all'); // 'all' | 'filtered'
  const [commentary, setCommentary] = useState('');

  // Section config — labels are translated
  const SECTIONS = useMemo(() => [
    { key: 'includeCoverPage', label: t('reports_sections') + ' - Cover', pages: 1 },
    { key: 'includeExecutiveSummary', label: t('reports_executive_summary'), pages: 1 },
    { key: 'includeRiskMatrix', label: t('reports_risk_matrix'), pages: 1 },
    { key: 'includeScatter', label: t('scatter_title'), pages: 1 },
    { key: 'includeOverdueTable', label: t('reports_overdue_items'), pages: 1 },
    { key: 'includeByPerson', label: t('view_by_person'), pages: 1 },
    { key: 'includeFullRegister', label: t('reports_full_register'), pages: null }, // dynamic
  ], [t]);

  const [options, setOptions] = useState({
    includeCoverPage: true,
    includeExecutiveSummary: true,
    includeRiskMatrix: true,
    includeScatter: true,
    includeOverdueTable: true,
    includeByPerson: true,
    includeFullRegister: true,
  });

  const toggleOption = (key, value) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  // Items based on scope
  const scopedItems = useMemo(() => {
    if (scope === 'filtered') {
      return getFilteredItems();
    }
    return items;
  }, [scope, items, getFilteredItems]);

  // Estimated pages
  const estimatedPages = useMemo(() => {
    let pages = 0;
    for (const section of SECTIONS) {
      if (!options[section.key]) continue;
      if (section.pages !== null) {
        pages += section.pages;
      } else {
        // Full register: ~30 items per page
        pages += Math.max(1, Math.ceil(scopedItems.length / 30));
      }
    }
    return pages;
  }, [options, scopedItems.length, SECTIONS]);

  // Included sections for preview
  const includedSections = SECTIONS.filter((s) => options[s.key]);

  // Capture chart images via html2canvas
  const captureChartImages = async () => {
    const chartImages = {};

    try {
      const html2canvas = (await import('html2canvas')).default;

      if (options.includeRiskMatrix) {
        const matrixEl = document.querySelector('[data-chart="risk-matrix"]');
        if (matrixEl) {
          const canvas = await html2canvas(matrixEl, { scale: 2, useCORS: true });
          chartImages.riskMatrix = canvas.toDataURL('image/png');
        }
      }

      if (options.includeScatter) {
        const scatterEl = document.querySelector('[data-chart="scatter"]');
        if (scatterEl) {
          const canvas = await html2canvas(scatterEl, { scale: 2, useCORS: true });
          chartImages.scatter = canvas.toDataURL('image/png');
        }
      }
    } catch (err) {
      console.warn('Chart capture failed (charts may not be in DOM):', err);
    }

    return chartImages;
  };

  // Generate PDF
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const chartImages = await captureChartImages();
      await generateReport(scopedItems, settings, { ...options, commentary, scope }, chartImages);
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-bold tracking-tight text-boronia-navy mb-6">
        {t('reports_generate')}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---- LEFT: Report Settings ---- */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-boronia-navy mb-4">{t('reports_title')}</h2>

          {/* Section checkboxes */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              {t('reports_included_sections')}
            </h3>
            <div className="space-y-0.5">
              {SECTIONS.map((section) => (
                <Checkbox
                  key={section.key}
                  checked={options[section.key]}
                  onChange={(val) => toggleOption(section.key, val)}
                  label={section.label}
                />
              ))}
            </div>
          </div>

          {/* Scope toggle */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              {t('reports_scope')}
            </h3>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="all"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="w-4 h-4 text-boronia-coral focus:ring-boronia-coral"
                />
                <span className="text-sm text-gray-700">{t('reports_all_items')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  value="filtered"
                  checked={scope === 'filtered'}
                  onChange={() => setScope('filtered')}
                  className="w-4 h-4 text-boronia-coral focus:ring-boronia-coral"
                />
                <span className="text-sm text-gray-700">{t('reports_open_only')}</span>
              </label>
            </div>
          </div>

          {/* Commentary */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              {t('reports_commentary')}
            </h3>
            <textarea
              value={commentary}
              onChange={(e) => setCommentary(e.target.value)}
              rows={4}
              placeholder={t('reports_add_commentary')}
              className="w-full border border-gray-300 rounded-md text-sm py-2 px-3 bg-white resize-y
                         focus:outline-none focus:ring-2 focus:ring-boronia-coral focus:border-boronia-coral"
            />
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || includedSections.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 bg-boronia-coral hover:bg-boronia-coral-light
                       text-white rounded-md px-6 py-3 text-sm font-medium transition-colors
                       disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t('reports_export_pdf')}...
              </>
            ) : (
              <>
                <FileDown size={16} />
                {t('reports_export_pdf')}
              </>
            )}
          </button>
        </div>

        {/* ---- RIGHT: Preview Info ---- */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold text-boronia-navy mb-4">{t('reports_preview')}</h2>

          {/* Item count */}
          <div className="bg-gray-50 rounded-md p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                {t('register_items')}
              </span>
              <span className="text-2xl font-bold text-boronia-navy">{scopedItems.length}</span>
            </div>
            <p className="text-xs text-gray-500">
              {scope === 'all' ? t('reports_all_items') : t('reports_open_only')}
            </p>
          </div>

          {/* Estimated pages */}
          <div className="bg-gray-50 rounded-md p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                {t('reports_estimated_pages')}
              </span>
              <span className="text-2xl font-bold text-boronia-navy">~{estimatedPages}</span>
            </div>
          </div>

          {/* Included sections list */}
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
              {t('reports_included_sections')}
            </h3>
            {includedSections.length === 0 ? (
              <p className="text-sm text-gray-400 italic">{t('view_no_items')}</p>
            ) : (
              <ol className="space-y-1.5">
                {includedSections.map((section, idx) => (
                  <li key={section.key} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-boronia-coral/10 text-boronia-coral text-xs font-medium flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-gray-700">{section.label}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {section.pages !== null
                        ? `${section.pages} page`
                        : `~${Math.max(1, Math.ceil(scopedItems.length / 30))} pages`}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Output format info */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Output: Landscape A4 PDF.
              Filename:{' '}
              <span className="font-mono text-gray-600">
                {(settings?.projectName || 'Project').replace(/[^a-zA-Z0-9_-]/g, '_')}
                _CloseOut_Report_{new Date().toISOString().split('T')[0]}.pdf
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
