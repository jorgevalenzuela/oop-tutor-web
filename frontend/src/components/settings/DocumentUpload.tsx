import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileJson, FileText, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { useUploadDocument } from '@/hooks/useDocumentUpload'

export default function DocumentUpload() {
  const uploadMutation = useUploadDocument()

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      acceptedFiles.forEach((file) => {
        uploadMutation.mutate(file)
      })
    },
    [uploadMutation]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
    },
    multiple: true,
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
        {isDragActive ? (
          <p className="text-primary font-medium">Drop files here...</p>
        ) : (
          <>
            <p className="text-gray-600 font-medium mb-1">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-gray-400">
              Supports JSON, TXT, and MD files
            </p>
          </>
        )}
      </div>

      {uploadMutation.isPending && (
        <div className="flex items-center gap-2 text-gray-600 bg-gray-50 p-3 rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Uploading...</span>
        </div>
      )}

      {uploadMutation.isSuccess && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
          <CheckCircle className="h-4 w-4" />
          <span>{uploadMutation.data.message || 'Upload successful!'}</span>
        </div>
      )}

      {uploadMutation.isError && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <XCircle className="h-4 w-4" />
          <span>
            {uploadMutation.error instanceof Error
              ? uploadMutation.error.message
              : 'Upload failed'}
          </span>
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <FileJson className="h-4 w-4" />
          <span>JSON</span>
        </div>
        <div className="flex items-center gap-1">
          <FileText className="h-4 w-4" />
          <span>TXT / MD</span>
        </div>
      </div>
    </div>
  )
}
