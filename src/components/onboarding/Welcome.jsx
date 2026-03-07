/**
 * Welcome — full-screen onboarding overlay shown on first launch.
 * 4-step flow: Welcome > Project Name > Date Format > Get Started.
 * Saves project name & date format to settingsStore.
 */

import { useState } from 'react';
import { ArrowRight, FileSpreadsheet, PlusCircle } from 'lucide-react';
import useSettingsStore from '../../store/settingsStore.js';
import useUiStore from '../../store/uiStore.js';
import { useTranslation } from '../../hooks/useTranslation.js';
import logo from '../../assets/boronia_consulting_logo.jpg';

export default function Welcome() {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');

  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const openImportWizard = useUiStore((s) => s.openImportWizard);
  const openQuickAdd = useUiStore((s) => s.openQuickAdd);
  const { t } = useTranslation();

  const handleNext = async () => {
    if (step === 2 && projectName.trim()) {
      await updateSettings({ projectName: projectName.trim() });
    }
    if (step === 3) {
      await updateSettings({ dateFormat });
    }
    setStep((s) => s + 1);
  };

  const handleStartImport = async () => {
    await updateSettings({ onboardingComplete: true });
    openImportWizard();
  };

  const handleStartFresh = async () => {
    await updateSettings({ onboardingComplete: true });
    openQuickAdd();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
      <div className="w-full max-w-xl px-6">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-12">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                s === step
                  ? 'bg-boronia-coral'
                  : s < step
                    ? 'bg-boronia-navy'
                    : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step 1 — Welcome */}
        {step === 1 && (
          <div className="flex flex-col items-center text-center">
            <img
              src={logo}
              alt="Boronia Consulting"
              className="w-[200px] object-contain mb-6"
            />
            <h1 className="text-4xl font-bold text-boronia-navy mb-3">
              CloseOut
            </h1>
            <p className="text-lg text-gray-500 italic mb-10">
              {t('welcome_subtitle')}
            </p>
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 bg-boronia-coral hover:bg-boronia-coral-light text-white text-sm font-medium rounded-md px-6 py-3 transition-colors"
            >
              {t('welcome_get_started')}
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2 — Project Name */}
        {step === 2 && (
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-boronia-navy mb-2">
              {t('welcome_step1_title')}
            </h2>
            <p className="text-sm text-gray-500 mb-8">
              {t('welcome_step1_sub')}
            </p>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={t('settings_project_name_placeholder')}
              className="w-full max-w-sm text-center text-lg border border-gray-300 rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-boronia-coral focus:border-transparent mb-8"
              autoFocus
            />
            <button
              onClick={handleNext}
              disabled={!projectName.trim()}
              className="inline-flex items-center gap-2 bg-boronia-coral hover:bg-boronia-coral-light text-white text-sm font-medium rounded-md px-6 py-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('btn_next')}
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 3 — Date Format */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-boronia-navy mb-2">
              {t('welcome_step2_title')}
            </h2>
            <p className="text-sm text-gray-500 mb-8">
              {t('welcome_step2_sub')}
            </p>
            <div className="flex gap-4 mb-8">
              {[
                { value: 'DD/MM/YYYY', example: '15/03/2026' },
                { value: 'MM/DD/YYYY', example: '03/15/2026' },
              ].map(({ value, example }) => (
                <button
                  key={value}
                  onClick={() => setDateFormat(value)}
                  className={`flex flex-col items-center w-48 rounded-lg border-2 p-5 transition-colors ${
                    dateFormat === value
                      ? 'border-boronia-coral bg-boronia-coral/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-base font-semibold text-boronia-navy mb-1">
                    {value}
                  </span>
                  <span className="text-sm text-gray-500">{example}</span>
                </button>
              ))}
            </div>
            <button
              onClick={handleNext}
              className="inline-flex items-center gap-2 bg-boronia-coral hover:bg-boronia-coral-light text-white text-sm font-medium rounded-md px-6 py-3 transition-colors"
            >
              {t('btn_next')}
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Step 4 — Get Started */}
        {step === 4 && (
          <div className="flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-boronia-navy mb-2">
              {t('welcome_step3_title')}
            </h2>
            <p className="text-sm text-gray-500 mb-8">
              {t('welcome_step3_sub')}
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleStartImport}
                className="flex flex-col items-center w-56 rounded-lg border-2 border-gray-200 hover:border-boronia-coral p-6 transition-colors group"
              >
                <FileSpreadsheet
                  size={32}
                  className="text-gray-400 group-hover:text-boronia-coral mb-3 transition-colors"
                />
                <span className="text-base font-semibold text-boronia-navy mb-1">
                  {t('welcome_import_excel')}
                </span>
                <span className="text-xs text-gray-500">
                  {t('import_supported')}
                </span>
              </button>
              <button
                onClick={handleStartFresh}
                className="flex flex-col items-center w-56 rounded-lg border-2 border-gray-200 hover:border-boronia-coral p-6 transition-colors group"
              >
                <PlusCircle
                  size={32}
                  className="text-gray-400 group-hover:text-boronia-coral mb-3 transition-colors"
                />
                <span className="text-base font-semibold text-boronia-navy mb-1">
                  {t('welcome_start_fresh')}
                </span>
                <span className="text-xs text-gray-500">
                  {t('btn_add_item')}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
