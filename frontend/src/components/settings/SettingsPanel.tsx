import DocumentUpload from './DocumentUpload'
import DocumentList from './DocumentList'

export default function SettingsPanel() {
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Document Management</h2>
          <p className="text-sm text-gray-500">
            Upload knowledge base documents to enhance the assistant's responses.
          </p>
        </div>
        <div className="p-4">
          <DocumentUpload />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Uploaded Documents</h2>
        </div>
        <div className="p-4">
          <DocumentList />
        </div>
      </div>
    </div>
  )
}
