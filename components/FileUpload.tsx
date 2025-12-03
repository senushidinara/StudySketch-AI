import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, X, FileType } from 'lucide-react';
import { FileData } from '../types';

interface FileUploadProps {
  onFileSelect: (file: FileData | null) => void;
  selectedFile: FileData | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file) return;
    
    // Check file type
    const validTypes = ['application/pdf', 'text/plain', 'text/markdown'];
    const validExtensions = ['.pdf', '.txt', '.md'];
    
    // Simple validation
    const isValid = validTypes.includes(file.type) || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValid) {
      alert("Please upload a PDF or text file (.txt, .md)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Extract base64 part
      const base64Data = result.split(',')[1];
      
      onFileSelect({
        name: file.name,
        mimeType: file.type || 'text/plain', // Fallback
        data: base64Data
      });
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const clearFile = () => {
    onFileSelect(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`
            relative cursor-pointer group
            flex flex-col items-center justify-center
            w-full h-32 rounded-xl border-2 border-dashed transition-all duration-200
            ${isDragging 
              ? 'border-indigo-500 bg-indigo-50' 
              : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
            }
          `}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".pdf,.txt,.md"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
          />
          <div className="flex flex-col items-center space-y-2 text-center p-4">
            <div className={`p-3 rounded-full ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500'} transition-colors`}>
              <UploadCloud size={24} />
            </div>
            <div className="text-sm">
              <span className="font-medium text-slate-700">Click to upload</span>
              <span className="text-slate-500"> or drag and drop</span>
            </div>
            <p className="text-xs text-slate-400">PDF, TXT, MD (Max 10MB)</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              {selectedFile.mimeType.includes('pdf') ? <FileType size={20} /> : <FileText size={20} />}
            </div>
            <div className="truncate">
              <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{selectedFile.name}</p>
              <p className="text-xs text-slate-500 uppercase">{selectedFile.mimeType.split('/')[1]}</p>
            </div>
          </div>
          <button 
            onClick={clearFile}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
