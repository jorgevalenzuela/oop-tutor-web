import { useAuth } from '../../contexts/AuthContext'
import DocumentUpload from './DocumentUpload'
import DocumentList from './DocumentList'
import MasteryConfigPanel from './MasteryConfigPanel'
import FeedbackConfigPanel from './FeedbackConfigPanel'

export default function SettingsPanel() {
  const { user } = useAuth()
  const isInstructorOrAdmin = user?.role === 'INSTRUCTOR' || user?.role === 'ADMIN'

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

      {isInstructorOrAdmin && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b px-4 py-3">
            <h2 className="text-lg font-semibold text-gray-900">Mastery Thresholds</h2>
            <p className="text-sm text-gray-500">
              Configure per-concept mastery requirements. Instructor/Admin only.
            </p>
          </div>
          <div className="p-4">
            <MasteryConfigPanel />
          </div>
        </div>
      )}

      {isInstructorOrAdmin && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b px-4 py-3">
            <h2 className="text-lg font-semibold text-gray-900">Feedback & Discussion</h2>
            <p className="text-sm text-gray-500">
              Control feedback collection and discussion board availability.
            </p>
          </div>
          <div className="p-4">
            <FeedbackConfigPanel />
          </div>
        </div>
      )}
    </div>
  )
}
