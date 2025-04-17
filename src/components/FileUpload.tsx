
import React, { useCallback, useState } from 'react';
import { FileUp, X, File, Check, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isUploadSuccessful, setIsUploadSuccessful] = useState(false);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    // Accept only PDF, DOCX, or TXT files
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    
    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, DOCX, or TXT file.",
        variant: "destructive"
      });
      return;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB.",
        variant: "destructive"
      });
      return;
    }
    
    setFile(file);
    setIsUploadSuccessful(false);
  };

  const uploadFile = async () => {
    if (!file) return;
    
    setUploading(true);
    
    try {
      const result = await apiService.uploadDocument(file);
      
      if (result.success) {
        setIsUploadSuccessful(true);
        toast({
          title: "Upload successful",
          description: "Your document has been uploaded and processed.",
        });
        onUploadSuccess();
      } else {
        toast({
          title: "Upload failed",
          description: result.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Upload error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setIsUploadSuccessful(false);
  };

  return (
    <div className="w-full max-w-md mx-auto mt-6">
      {!file ? (
        <div
          className={cn(
            "upload-zone",
            isDragging && "active"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".pdf,.docx,.txt"
            onChange={handleFileInput}
          />
          <label 
            htmlFor="file-upload" 
            className="flex flex-col items-center cursor-pointer"
          >
            <FileUp size={32} className="text-assistant-secondary mb-2" />
            <p className="text-center text-assistant-text mb-1 font-medium">
              Upload Document
            </p>
            <p className="text-center text-muted-foreground text-sm">
              Drag and drop or click to upload
            </p>
            <p className="text-center text-muted-foreground text-xs mt-2">
              PDF, DOCX, or TXT (Max 10MB)
            </p>
          </label>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-4 shadow-sm border border-border">
          <div className="flex items-center">
            <File size={24} className="text-assistant-secondary mr-3" />
            <div className="flex-1 truncate">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={clearFile}
              className="ml-2 p-1 rounded-full hover:bg-muted"
              aria-label="Remove file"
              disabled={uploading}
            >
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>
          <div className="mt-3 flex justify-end">
            {isUploadSuccessful ? (
              <span className="inline-flex items-center text-green-600 text-sm">
                <Check size={16} className="mr-1" />
                Uploaded successfully
              </span>
            ) : (
              <button
                onClick={uploadFile}
                disabled={uploading}
                className={cn(
                  "px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                  "bg-assistant-primary hover:bg-assistant-secondary text-assistant-text",
                  "focus:outline-none focus:ring-2 focus:ring-assistant-secondary focus:ring-opacity-50",
                  uploading && "opacity-70 cursor-not-allowed"
                )}
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="mr-2 inline animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Upload"
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
