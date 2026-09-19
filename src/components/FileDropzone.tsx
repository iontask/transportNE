import React, { useCallback } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';

interface FileDropzoneProps {
  id?: string;
  onFileSelect: (file: File) => void;
  accept?: string;
  label: string;
  description?: string;
  file?: File | null;
  onClear?: () => void;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({
  id,
  onFileSelect,
  accept = '.xlsx,.xls,.csv',
  label,
  description,
  file,
  onClear,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputId = id || `file-input-${label.replace(/[^a-zA-Z0-9]/g, '-')}`;

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      onFileSelect(droppedFile);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  }, [onFileSelect]);

  if (file) {
    return (
      <div className="border-2 border-emerald-500 bg-emerald-50/70 rounded-xl p-6 transition-all shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <p className="font-semibold text-emerald-950 text-sm md:text-base break-all">{file.name}</p>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">
                {(file.size / 1024).toFixed(1)} Ko • Prêt pour l'analyse
              </p>
            </div>
          </div>
          {onClear && (
            <button
              id={`clear-file-${inputId}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              title="Supprimer le fichier"
              className="p-2 text-emerald-700 hover:text-emerald-900 hover:bg-emerald-200/60 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
        transition-all duration-200 group
        ${isDragging 
          ? 'border-blue-500 bg-blue-50/80 scale-[1.01]' 
          : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50/30 bg-white'
        }
      `}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleFileInput}
        className="hidden"
        id={inputId}
      />
      <label htmlFor={inputId} className="cursor-pointer block">
        <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
          <Upload className="w-7 h-7" />
        </div>
        <p className="text-base font-semibold text-gray-800 mb-1">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 font-medium">{description}</p>
        )}
        <p className="text-xs text-blue-600 font-medium mt-3 bg-blue-50/80 inline-block px-2.5 py-1 rounded-full">
          Glissez-déposez ou cliquez pour parcourir (.xlsx, .xls, .csv)
        </p>
      </label>
    </div>
  );
};
