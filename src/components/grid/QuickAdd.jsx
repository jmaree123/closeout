/**
 * QuickAdd — slide-in side panel from the right for adding new items.
 * Triggered by uiStore.quickAddOpen.
 */

import { useState, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import useUiStore from '../../store/uiStore.js';
import useItemStore from '../../store/itemStore.js';
import useSettingsStore from '../../store/settingsStore.js';
import {
  LIKELIHOOD_OPTIONS,
  CONSEQUENCE_OPTIONS,
  EFFORT_OPTIONS,
  ITEM_TYPES,
  STATUS_OPTIONS,
  calculateRiskLevel,
} from '../../utils/riskMatrix.js';
import { getDefaultDueDate } from '../../utils/dateUtils.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import {
  translateStatus,
  translateItemType,
  translateLikelihood,
  translateConsequence,
  translateEffort,
} from '../../utils/displayLabels.js';
import Badge from '../ui/Badge.jsx';
import Select from '../ui/Select.jsx';
import DatePicker from '../ui/DatePicker.jsx';

const INITIAL_FORM = {
  title: '',
  itemType: 'Project Action',
  status: 'Open',
  likelihood: 'Possible',
  consequence: 'Moderate',
  effortEstimate: 'Medium',
  dueDate: getDefaultDueDate(14),
  assignedTo: '',
  department: '',
  location: '',
  description: '',
};

export default function QuickAdd() {
  const quickAddOpen = useUiStore((s) => s.quickAddOpen);
  const closeQuickAdd = useUiStore((s) => s.closeQuickAdd);
  const addItem = useItemStore((s) => s.addItem);
  const settings = useSettingsStore((s) => s.settings);

  const { t, lang } = useTranslation();

  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [saving, setSaving] = useState(false);

  const riskLevel = calculateRiskLevel(form.likelihood, form.consequence) || 'Medium';

  const resetForm = useCallback(() => {
    setForm({ ...INITIAL_FORM, dueDate: getDefaultDueDate(14) });
  }, []);

  // Reset form when panel opens
  useEffect(() => {
    if (quickAddOpen) resetForm();
  }, [quickAddOpen, resetForm]);

  // Close on Escape
  useEffect(() => {
    if (!quickAddOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') closeQuickAdd();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [quickAddOpen, closeQuickAdd]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isValid = form.title.trim() && form.dueDate && form.assignedTo.trim() && form.department;

  const handleSave = async (addAnother = false) => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await addItem({
        ...form,
        riskLevel,
      });
      if (addAnother) {
        resetForm();
      } else {
        closeQuickAdd();
      }
    } catch (err) {
      console.error('Failed to create item:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!quickAddOpen) return null;

  const departments = settings?.departments || [];
  const locations = settings?.locations || [];
  const teamMembers = settings?.teamMembers || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={closeQuickAdd} />

      {/* Panel */}
      <div className="relative w-[400px] max-w-full bg-white shadow-2xl flex flex-col h-full animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-boronia-navy">{t('quick_add_header')}</h2>
          <button
            onClick={closeQuickAdd}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form (scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              {t('field_title')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder={t('quick_add_enter_title')}
              className="w-full border border-gray-300 rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-boronia-coral/50 focus:border-boronia-coral"
            />
          </div>

          {/* Item Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('field_item_type')}</label>
            <select
              value={form.itemType}
              onChange={(e) => updateField('itemType', e.target.value || 'Project Action')}
              className="w-full border border-gray-300 rounded-md text-sm py-1.5 pl-3 pr-8 bg-white appearance-none
                         focus:outline-none focus:ring-2 focus:ring-boronia-coral/50 focus:border-boronia-coral"
            >
              {ITEM_TYPES.map((v) => (
                <option key={v} value={v}>{translateItemType(v, lang)}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('field_status')}</label>
            <select
              value={form.status}
              onChange={(e) => updateField('status', e.target.value || 'Open')}
              className="w-full border border-gray-300 rounded-md text-sm py-1.5 pl-3 pr-8 bg-white appearance-none
                         focus:outline-none focus:ring-2 focus:ring-boronia-coral/50 focus:border-boronia-coral"
            >
              {STATUS_OPTIONS.map((v) => (
                <option key={v} value={v}>{translateStatus(v, lang)}</option>
              ))}
            </select>
          </div>

          {/* Likelihood + Consequence row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('field_likelihood')}</label>
              <select
                value={form.likelihood}
                onChange={(e) => updateField('likelihood', e.target.value || 'Possible')}
                className="w-full border border-gray-300 rounded-md text-sm py-1.5 pl-3 pr-8 bg-white appearance-none
                           focus:outline-none focus:ring-2 focus:ring-boronia-coral/50 focus:border-boronia-coral"
              >
                {LIKELIHOOD_OPTIONS.map((v) => (
                  <option key={v} value={v}>{translateLikelihood(v, lang)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('field_consequence')}</label>
              <select
                value={form.consequence}
                onChange={(e) => updateField('consequence', e.target.value || 'Moderate')}
                className="w-full border border-gray-300 rounded-md text-sm py-1.5 pl-3 pr-8 bg-white appearance-none
                           focus:outline-none focus:ring-2 focus:ring-boronia-coral/50 focus:border-boronia-coral"
              >
                {CONSEQUENCE_OPTIONS.map((v) => (
                  <option key={v} value={v}>{translateConsequence(v, lang)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Risk Level (auto-calculated, read-only) */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              {t('field_risk_level')} {t('panel_auto_calculated')}
            </label>
            <Badge variant="risk" value={riskLevel} />
          </div>

          {/* Effort Estimate */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('field_effort_estimate')}</label>
            <select
              value={form.effortEstimate}
              onChange={(e) => updateField('effortEstimate', e.target.value || 'Medium')}
              className="w-full border border-gray-300 rounded-md text-sm py-1.5 pl-3 pr-8 bg-white appearance-none
                         focus:outline-none focus:ring-2 focus:ring-boronia-coral/50 focus:border-boronia-coral"
            >
              {EFFORT_OPTIONS.map((v) => (
                <option key={v} value={v}>{translateEffort(v, lang)}</option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <DatePicker
            label={t('field_due_date')}
            value={form.dueDate}
            onChange={(v) => updateField('dueDate', v)}
            required
          />

          {/* Assigned To */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              {t('field_assigned_to')} <span className="text-red-500">*</span>
            </label>
            {teamMembers.length > 0 ? (
              <select
                value={form.assignedTo}
                onChange={(e) => updateField('assignedTo', e.target.value)}
                className="w-full border border-gray-300 rounded-md text-sm py-1.5 pl-3 pr-8 bg-white appearance-none
                           focus:outline-none focus:ring-2 focus:ring-boronia-coral/50 focus:border-boronia-coral"
              >
                <option value="">{t('quick_add_select_member')}</option>
                {teamMembers.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={form.assignedTo}
                onChange={(e) => updateField('assignedTo', e.target.value)}
                placeholder={t('quick_add_enter_name')}
                className="w-full border border-gray-300 rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-boronia-coral/50 focus:border-boronia-coral"
              />
            )}
          </div>

          {/* Department */}
          <Select
            label={t('field_department')}
            options={departments}
            value={form.department}
            onChange={(v) => updateField('department', v || '')}
            required
            placeholder={t('quick_add_select_dept')}
          />

          {/* Location */}
          <Select
            label={t('field_location')}
            options={locations}
            value={form.location}
            onChange={(v) => updateField('location', v || '')}
            placeholder={t('quick_add_select_loc')}
          />

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">
              {t('field_description')}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder={t('quick_add_describe')}
              rows={4}
              className="w-full border border-gray-300 rounded-md text-sm py-2 px-3 resize-none
                         focus:outline-none focus:ring-2 focus:ring-boronia-coral/50 focus:border-boronia-coral"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => handleSave(false)}
            disabled={!isValid || saving}
            className="flex-1 bg-boronia-coral hover:bg-boronia-coral-light text-white rounded-md px-4 py-2 text-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? t('btn_saving') : t('btn_save_close')}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={!isValid || saving}
            className="flex-1 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md px-4 py-2 text-sm font-medium
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {t('btn_save_add_another')}
          </button>
        </div>
      </div>
    </div>
  );
}
