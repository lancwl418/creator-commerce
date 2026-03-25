'use client';

import { AlertTriangle, XCircle, X } from 'lucide-react';
import type { ValidationResult } from '@/core/design/DesignValidator';

interface ValidationDialogProps {
  result: ValidationResult;
  onExportAnyway: () => void;
  onCancel: () => void;
}

export default function ValidationDialog({ result, onExportAnyway, onCancel }: ValidationDialogProps) {
  const errors = result.issues.filter((i) => i.severity === 'error');
  const warnings = result.issues.filter((i) => i.severity === 'warning');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[420px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-800">Export Validation</h2>
          <button onClick={onCancel} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Issues */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {errors.length === 0 && warnings.length === 0 && (
            <p className="text-sm text-green-600 text-center py-4">
              All checks passed. Ready to export.
            </p>
          )}

          {errors.map((issue, i) => (
            <div key={`e-${i}`} className="flex items-start gap-2 p-2.5 bg-red-50 rounded-lg">
              <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700">{issue.message}</p>
            </div>
          ))}

          {warnings.map((issue, i) => (
            <div key={`w-${i}`} className="flex items-start gap-2 p-2.5 bg-yellow-50 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-700">{issue.message}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onExportAnyway}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600"
          >
            {result.valid ? 'Export' : 'Export Anyway'}
          </button>
        </div>
      </div>
    </div>
  );
}
