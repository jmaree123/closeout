/**
 * Select — styled dropdown select wrapper.
 * Props:
 *   options: string[] or { value, label }[]
 *   value: current value
 *   onChange: (value) => void
 *   placeholder: placeholder text
 *   label: optional label above
 *   clearable: show X to reset
 *   className: additional classes
 */

import { X } from 'lucide-react';

export default function Select({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  label,
  clearable = false,
  className = '',
  required = false,
  disabled = false,
}) {
  const normalizedOptions = options.map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="text-xs font-medium text-gray-600 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          disabled={disabled}
          className="w-full border border-gray-300 rounded-md text-sm py-1.5 pl-3 pr-8 bg-white
                     focus:outline-none focus:ring-2 focus:ring-boronia-coral focus:border-boronia-coral
                     disabled:bg-gray-100 disabled:text-gray-400
                     appearance-none cursor-pointer"
        >
          <option value="">{placeholder}</option>
          {normalizedOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {/* Custom chevron */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          {!clearable || !value ? (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          ) : null}
        </div>
        {clearable && value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange(null);
            }}
            className="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
