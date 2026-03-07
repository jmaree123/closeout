/**
 * ItemForm — renders editable fields for an item, organised into collapsible sections.
 * Used inside ItemPanel.
 *
 * Props:
 *   item: object — the item data
 *   onFieldChange: (field, value) => void — called when any field changes
 *   settings: object — project settings (departments, locations, teamMembers, etc.)
 */

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import Badge from '../ui/Badge.jsx';
import Select from '../ui/Select.jsx';
import DatePicker from '../ui/DatePicker.jsx';
import StatusWorkflow from './StatusWorkflow.jsx';
import ActivityLog from './ActivityLog.jsx';
import { useTranslation } from '../../hooks/useTranslation.js';
import {
  translateLikelihood,
  translateConsequence,
  translateEffort,
  translateApprovalStatus,
} from '../../utils/displayLabels.js';
import {
  LIKELIHOOD_OPTIONS,
  CONSEQUENCE_OPTIONS,
  EFFORT_OPTIONS,
  RISK_LEVELS,
  APPROVAL_OPTIONS,
  PRIORITY_OPTIONS,
  calculateRiskLevel,
} from '../../utils/riskMatrix.js';

// ---------------------------------------------------------------------------
// Collapsible section wrapper
// ---------------------------------------------------------------------------

function Section({ title, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-2.5 text-sm font-semibold text-boronia-navy hover:text-boronia-navy-light transition-colors"
      >
        <span>{title}</span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {open && <div className="pb-4 space-y-3">{children}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable field components
// ---------------------------------------------------------------------------

function FieldLabel({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function TextInput({ label, value, onChange, placeholder = '', disabled = false }) {
  return (
    <FieldLabel label={label}>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-md text-sm py-1.5 px-3 bg-white
                   focus:outline-none focus:ring-2 focus:ring-boronia-coral focus:border-boronia-coral
                   disabled:bg-gray-100 disabled:text-gray-400"
      />
    </FieldLabel>
  );
}

function NumberInput({ label, value, onChange, min = 0, step = 1 }) {
  return (
    <FieldLabel label={label}>
      <input
        type="number"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        min={min}
        step={step}
        className="w-full border border-gray-300 rounded-md text-sm py-1.5 px-3 bg-white
                   focus:outline-none focus:ring-2 focus:ring-boronia-coral focus:border-boronia-coral"
      />
    </FieldLabel>
  );
}

function TextArea({ label, value, onChange, rows = 4, placeholder = '' }) {
  return (
    <FieldLabel label={label}>
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-md text-sm py-1.5 px-3 bg-white resize-y
                   focus:outline-none focus:ring-2 focus:ring-boronia-coral focus:border-boronia-coral"
      />
    </FieldLabel>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function ItemForm({ item, onFieldChange, settings }) {
  const { t, lang } = useTranslation();

  if (!item) return null;

  const departments = settings?.departments || [];
  const locations = settings?.locations || [];
  const teamMembers = settings?.teamMembers || [];

  // Calculate current risk level for display
  const currentRisk = calculateRiskLevel(item.likelihood, item.consequence) || item.riskLevel || 'Medium';

  const handleStatusChange = (newStatus) => {
    onFieldChange('status', newStatus);
    // Auto-set closeOutDate when closing
    if (newStatus === 'Closed') {
      onFieldChange('closeOutDate', new Date().toISOString().split('T')[0]);
    }
    // Clear closeOutDate when reopening
    if (newStatus === 'Open' && (item.status === 'Closed' || item.status === 'Cancelled')) {
      onFieldChange('closeOutDate', '');
    }
  };

  return (
    <div className="space-y-0">
      {/* 1. Status Workflow */}
      <Section title={t('panel_status_workflow')} defaultOpen={true}>
        <StatusWorkflow
          currentStatus={item.status}
          onStatusChange={handleStatusChange}
        />
      </Section>

      {/* 2. Risk & Effort */}
      <Section title={t('panel_risk_effort')} defaultOpen={true}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-gray-600">{t('panel_risk_level_label')}</span>
          <Badge variant="risk" value={currentRisk} />
          <span className="text-[11px] text-gray-400">{t('panel_auto_calculated')}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('field_likelihood')}</label>
            <select
              value={item.likelihood}
              onChange={(e) => onFieldChange('likelihood', e.target.value || 'Possible')}
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
              value={item.consequence}
              onChange={(e) => onFieldChange('consequence', e.target.value || 'Moderate')}
              className="w-full border border-gray-300 rounded-md text-sm py-1.5 pl-3 pr-8 bg-white appearance-none
                         focus:outline-none focus:ring-2 focus:ring-boronia-coral/50 focus:border-boronia-coral"
            >
              {CONSEQUENCE_OPTIONS.map((v) => (
                <option key={v} value={v}>{translateConsequence(v, lang)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('field_effort_estimate')}</label>
            <select
              value={item.effortEstimate}
              onChange={(e) => onFieldChange('effortEstimate', e.target.value || 'Medium')}
              className="w-full border border-gray-300 rounded-md text-sm py-1.5 pl-3 pr-8 bg-white appearance-none
                         focus:outline-none focus:ring-2 focus:ring-boronia-coral/50 focus:border-boronia-coral"
            >
              {EFFORT_OPTIONS.map((v) => (
                <option key={v} value={v}>{translateEffort(v, lang)}</option>
              ))}
            </select>
          </div>
          <NumberInput
            label={t('field_effort_hours')}
            value={item.effortHours}
            onChange={(v) => onFieldChange('effortHours', v)}
          />
        </div>
      </Section>

      {/* 3. Assignment */}
      <Section title={t('panel_assignment')} defaultOpen={true}>
        <div className="grid grid-cols-2 gap-3">
          {teamMembers.length > 0 ? (
            <Select
              label={t('field_assigned_to')}
              options={teamMembers}
              value={item.assignedTo}
              onChange={(v) => onFieldChange('assignedTo', v || '')}
              placeholder="Select person..."
              clearable
            />
          ) : (
            <TextInput
              label={t('field_assigned_to')}
              value={item.assignedTo}
              onChange={(v) => onFieldChange('assignedTo', v)}
              placeholder="Enter name..."
            />
          )}

          <Select
            label={t('field_department')}
            options={departments}
            value={item.department}
            onChange={(v) => onFieldChange('department', v || '')}
            placeholder="Select department..."
            clearable
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label={t('field_location')}
            options={locations}
            value={item.location}
            onChange={(v) => onFieldChange('location', v || '')}
            placeholder="Select location..."
            clearable
          />
          <DatePicker
            label={t('field_due_date')}
            value={item.dueDate}
            onChange={(v) => onFieldChange('dueDate', v)}
          />
        </div>

        <Select
          label={t('field_priority')}
          options={['', ...PRIORITY_OPTIONS]}
          value={item.priority}
          onChange={(v) => onFieldChange('priority', v || '')}
          placeholder={t('panel_no_priority')}
          clearable
        />
      </Section>

      {/* 4. Description & Action */}
      <Section title={t('panel_description_action')} defaultOpen={false}>
        <TextArea
          label={t('field_description')}
          value={item.description}
          onChange={(v) => onFieldChange('description', v)}
          placeholder="Describe the item..."
        />
        <TextArea
          label={t('field_corrective_action')}
          value={item.correctiveAction}
          onChange={(v) => onFieldChange('correctiveAction', v)}
          placeholder="Describe the corrective action..."
        />
      </Section>

      {/* 5. Verification & Approval */}
      <Section title={t('panel_verification_approval')} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-3">
          {teamMembers.length > 0 ? (
            <Select
              label={t('field_verification_person')}
              options={teamMembers}
              value={item.verificationPerson}
              onChange={(v) => onFieldChange('verificationPerson', v || '')}
              placeholder="Select verifier..."
              clearable
            />
          ) : (
            <TextInput
              label={t('field_verification_person')}
              value={item.verificationPerson}
              onChange={(v) => onFieldChange('verificationPerson', v)}
              placeholder="Enter name..."
            />
          )}
          <DatePicker
            label={t('field_verification_date')}
            value={item.verificationDate}
            onChange={(v) => onFieldChange('verificationDate', v)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('field_approval_status')}</label>
            <select
              value={item.approvalStatus}
              onChange={(e) => onFieldChange('approvalStatus', e.target.value || 'Not Required')}
              className="w-full border border-gray-300 rounded-md text-sm py-1.5 pl-3 pr-8 bg-white appearance-none
                         focus:outline-none focus:ring-2 focus:ring-boronia-coral/50 focus:border-boronia-coral"
            >
              {APPROVAL_OPTIONS.map((v) => (
                <option key={v} value={v}>{translateApprovalStatus(v, lang)}</option>
              ))}
            </select>
          </div>
          <TextInput
            label={t('field_approver')}
            value={item.approver}
            onChange={(v) => onFieldChange('approver', v)}
            placeholder="Enter approver name..."
          />
        </div>
      </Section>

      {/* 6. Close-Out */}
      <Section title={t('panel_close_out')} defaultOpen={false}>
        <DatePicker
          label={t('field_close_out_date')}
          value={item.closeOutDate}
          onChange={(v) => onFieldChange('closeOutDate', v)}
        />
        <TextArea
          label={t('field_close_out_note')}
          value={item.closeOutNote}
          onChange={(v) => onFieldChange('closeOutNote', v)}
          rows={3}
          placeholder="Add close-out notes..."
        />
      </Section>

      {/* 7. Metadata */}
      <Section title={t('panel_metadata')} defaultOpen={false}>
        <div className="grid grid-cols-2 gap-3">
          <TextInput
            label={t('field_raised_by')}
            value={item.raisedBy}
            onChange={(v) => onFieldChange('raisedBy', v)}
          />
          <DatePicker
            label={t('field_raised_date')}
            value={item.raisedDate}
            onChange={(v) => onFieldChange('raisedDate', v)}
          />
        </div>
        <TextInput
          label={t('field_source')}
          value={item.source}
          onChange={(v) => onFieldChange('source', v)}
          placeholder="e.g. Site Walkdown, Audit..."
        />
        <TextInput
          label={t('field_tags')}
          value={item.tags}
          onChange={(v) => onFieldChange('tags', v)}
          placeholder="Comma-separated tags..."
        />
      </Section>

      {/* 8. Activity Log */}
      <Section title={t('panel_activity_log')} defaultOpen={false}>
        <ActivityLog itemId={item.itemId} />
      </Section>
    </div>
  );
}
