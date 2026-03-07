/**
 * DatePicker — styled native date input.
 * Props:
 *   value: YYYY-MM-DD string
 *   onChange: (value) => void
 *   label: optional label
 *   required: boolean
 *   className: additional classes
 */

export default function DatePicker({
  value,
  onChange,
  label,
  required = false,
  className = '',
  disabled = false,
}) {
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label className="text-xs font-medium text-gray-600 mb-1">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-md text-sm py-1.5 px-3 bg-white
                   focus:outline-none focus:ring-2 focus:ring-boronia-coral focus:border-boronia-coral
                   disabled:bg-gray-100 disabled:text-gray-400"
      />
    </div>
  );
}
