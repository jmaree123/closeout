/**
 * Settings — tab-based settings page with 4 tabs: General | Team | Dropdowns | Export.
 * All settings auto-save via settingsStore.updateSettings().
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Plus, Download, Database } from 'lucide-react';
import useSettingsStore from '../../store/settingsStore.js';
import useItemStore from '../../store/itemStore.js';
import { useTranslation } from '../../hooks/useTranslation.js';

// ---------------------------------------------------------------------------
// Reusable: Editable list with add/remove
// ---------------------------------------------------------------------------

function EditableList({ title, items, onAdd, onRemove, addPlaceholder, addLabel, emptyMessage }) {
  const [newValue, setNewValue] = useState('');
  const inputRef = useRef(null);

  const handleAdd = () => {
    const trimmed = newValue.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setNewValue('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-boronia-navy mb-3">{title}</h3>

      {/* Add input */}
      <div className="flex items-center gap-2 mb-3">
        <input
          ref={inputRef}
          type="text"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={addPlaceholder || `Add new ${title.toLowerCase().replace(/s$/, '')}...`}
          className="flex-1 border border-gray-300 rounded-md text-sm py-1.5 px-3 bg-white
                     focus:outline-none focus:ring-2 focus:ring-boronia-coral focus:border-boronia-coral"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newValue.trim()}
          className="inline-flex items-center gap-1 bg-boronia-coral hover:bg-boronia-coral-light text-white
                     rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Plus size={14} />
          {addLabel || 'Add'}
        </button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <p className="text-xs text-gray-400 italic py-2">{emptyMessage || `No ${title.toLowerCase()} added yet.`}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-md group"
            >
              <span className="text-sm text-gray-700">{item}</span>
              <button
                type="button"
                onClick={() => onRemove(item)}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-0.5"
                aria-label={`Remove ${item}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// General Tab
// ---------------------------------------------------------------------------

function GeneralTab({ settings, onUpdate, t }) {
  const [projectName, setProjectName] = useState(settings?.projectName || '');
  const [dateFormat, setDateFormat] = useState(settings?.dateFormat || 'DD/MM/YYYY');
  const [language, setLanguage] = useState(settings?.language || 'en');
  const [defaultOffset, setDefaultOffset] = useState(settings?.defaultDueDateOffset ?? 14);
  const debounceRef = useRef(null);

  // Sync from settings if they change externally
  useEffect(() => {
    if (settings) {
      setProjectName(settings.projectName || '');
      setDateFormat(settings.dateFormat || 'DD/MM/YYYY');
      setLanguage(settings.language || 'en');
      setDefaultOffset(settings.defaultDueDateOffset ?? 14);
    }
  }, [settings?.projectName, settings?.dateFormat, settings?.language, settings?.defaultDueDateOffset]);

  const debouncedUpdate = useCallback(
    (changes) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdate(changes);
      }, 500);
    },
    [onUpdate]
  );

  return (
    <div className="space-y-6">
      {/* Project Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings_project_name')}</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => {
            setProjectName(e.target.value);
            debouncedUpdate({ projectName: e.target.value });
          }}
          placeholder={t('settings_project_name_placeholder')}
          className="w-full max-w-md border border-gray-300 rounded-md text-sm py-2 px-3 bg-white
                     focus:outline-none focus:ring-2 focus:ring-boronia-coral focus:border-boronia-coral"
        />
      </div>

      {/* Language */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings_language')}</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setLanguage('en');
              onUpdate({ language: 'en' });
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md border-2 transition-colors ${
              language === 'en'
                ? 'border-boronia-coral bg-boronia-coral/5 text-boronia-navy'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {t('settings_language_en')}
          </button>
          <button
            type="button"
            onClick={() => {
              setLanguage('fr');
              onUpdate({ language: 'fr' });
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md border-2 transition-colors ${
              language === 'fr'
                ? 'border-boronia-coral bg-boronia-coral/5 text-boronia-navy'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {t('settings_language_fr')}
          </button>
        </div>
      </div>

      {/* Date Format */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('settings_date_format')}</label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dateFormat"
              value="DD/MM/YYYY"
              checked={dateFormat === 'DD/MM/YYYY'}
              onChange={() => {
                setDateFormat('DD/MM/YYYY');
                onUpdate({ dateFormat: 'DD/MM/YYYY' });
              }}
              className="w-4 h-4 text-boronia-coral focus:ring-boronia-coral"
            />
            <span className="text-sm text-gray-700">DD/MM/YYYY</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="dateFormat"
              value="MM/DD/YYYY"
              checked={dateFormat === 'MM/DD/YYYY'}
              onChange={() => {
                setDateFormat('MM/DD/YYYY');
                onUpdate({ dateFormat: 'MM/DD/YYYY' });
              }}
              className="w-4 h-4 text-boronia-coral focus:ring-boronia-coral"
            />
            <span className="text-sm text-gray-700">MM/DD/YYYY</span>
          </label>
        </div>
      </div>

      {/* Default Due Date Offset */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('field_due_date')} — {t('settings_general')}
        </label>
        <input
          type="number"
          value={defaultOffset}
          onChange={(e) => {
            const val = Number(e.target.value) || 0;
            setDefaultOffset(val);
            debouncedUpdate({ defaultDueDateOffset: val });
          }}
          min={1}
          max={365}
          className="w-32 border border-gray-300 rounded-md text-sm py-2 px-3 bg-white
                     focus:outline-none focus:ring-2 focus:ring-boronia-coral focus:border-boronia-coral"
        />
        <p className="text-xs text-gray-500 mt-1">
          {t('dashboard_days')}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Team Tab
// ---------------------------------------------------------------------------

function TeamTab({ settings, onAddMember, onRemoveMember, t }) {
  const teamMembers = settings?.teamMembers || [];

  return (
    <EditableList
      title={t('settings_team_members')}
      items={teamMembers}
      onAdd={onAddMember}
      onRemove={onRemoveMember}
      addPlaceholder={t('settings_add_team_member')}
      addLabel={t('settings_add')}
    />
  );
}

// ---------------------------------------------------------------------------
// Dropdowns Tab
// ---------------------------------------------------------------------------

function DropdownsTab({ settings, onAddDept, onRemoveDept, onAddLoc, onRemoveLoc, t }) {
  const departments = settings?.departments || [];
  const locations = settings?.locations || [];

  return (
    <div className="space-y-8">
      <EditableList
        title={t('settings_departments')}
        items={departments}
        onAdd={onAddDept}
        onRemove={onRemoveDept}
        addPlaceholder={t('settings_add_department')}
        addLabel={t('settings_add')}
      />
      <EditableList
        title={t('settings_locations')}
        items={locations}
        onAdd={onAddLoc}
        onRemove={onRemoveLoc}
        addPlaceholder={t('settings_add_location')}
        addLabel={t('settings_add')}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export Tab
// ---------------------------------------------------------------------------

function ExportTab({ settings, items, t }) {
  const [exporting, setExporting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const handleExportRegister = async () => {
    setExporting(true);
    try {
      const { exportToExcel } = await import('../../utils/excelExporter.js');
      await exportToExcel(items, settings);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleExportTemplate = async () => {
    try {
      const { exportTemplate } = await import('../../utils/excelExporter.js');
      await exportTemplate(settings);
    } catch (err) {
      console.error('Template export failed:', err);
    }
  };

  const handleSeedDatabase = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const { seedDatabase } = await import('../../utils/seedData.js');
      await seedDatabase(500);
      // Reload items in the store
      const { loadItems } = useItemStore.getState();
      await loadItems();
    } catch (err) {
      console.error('Seeding failed:', err);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Export buttons */}
      <div>
        <h3 className="text-sm font-semibold text-boronia-navy mb-3">{t('btn_export_excel')}</h3>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportRegister}
            disabled={exporting}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50
                       rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
          >
            <Download size={16} />
            {exporting ? t('loading') : t('settings_export_all')}
          </button>

          <button
            type="button"
            onClick={handleExportTemplate}
            className="inline-flex items-center gap-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50
                       rounded-md px-4 py-2 text-sm font-medium transition-colors"
          >
            <Download size={16} />
            {t('export_template')}
          </button>
        </div>
      </div>

      {/* Dev tools */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-boronia-navy mb-1">{t('settings_data')}</h3>
        <p className="text-xs text-gray-500 mb-3">
          {t('settings_demo_confirm')}
        </p>
        <button
          type="button"
          onClick={handleSeedDatabase}
          disabled={seeding}
          className="inline-flex items-center gap-2 bg-boronia-navy hover:bg-boronia-navy-light text-white
                     rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
        >
          <Database size={16} />
          {seeding ? t('loading') : t('settings_seed_database')}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Settings Component
// ---------------------------------------------------------------------------

export default function Settings() {
  const {
    settings,
    loadSettings,
    updateSettings,
    addDepartment,
    removeDepartment,
    addLocation,
    removeLocation,
    addTeamMember,
    removeTeamMember,
  } = useSettingsStore();

  const { items } = useItemStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');

  const TABS = [
    { key: 'general', label: t('settings_general') },
    { key: 'team', label: t('settings_team') },
    { key: 'dropdowns', label: t('settings_dropdowns') },
    { key: 'export', label: t('settings_export_tab') },
  ];

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  if (!settings) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-6">
        <p className="text-sm text-gray-400">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-bold tracking-tight text-boronia-navy mb-6">{t('settings_title')}</h1>

      {/* Tab bar */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-boronia-coral text-boronia-coral'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {activeTab === 'general' && (
          <GeneralTab settings={settings} onUpdate={updateSettings} t={t} />
        )}
        {activeTab === 'team' && (
          <TeamTab
            settings={settings}
            onAddMember={addTeamMember}
            onRemoveMember={removeTeamMember}
            t={t}
          />
        )}
        {activeTab === 'dropdowns' && (
          <DropdownsTab
            settings={settings}
            onAddDept={addDepartment}
            onRemoveDept={removeDepartment}
            onAddLoc={addLocation}
            onRemoveLoc={removeLocation}
            t={t}
          />
        )}
        {activeTab === 'export' && (
          <ExportTab settings={settings} items={items} t={t} />
        )}
      </div>
    </div>
  );
}
