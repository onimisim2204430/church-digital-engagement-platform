import React, { useEffect, useState } from 'react';
import RichTextEditor from '../components/RichTextEditor';
import PostContent from '../components/PostContent';
import { privacyPolicyService } from '../services/privacyPolicy.service';

const PrivacyPolicyManager: React.FC = () => {
  const [title, setTitle] = useState('Privacy Policy');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    const loadPolicy = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await privacyPolicyService.getAdmin();
        setTitle(data.title || 'Privacy Policy');
        setContent(data.content || '');
        setIsPublished(Boolean(data.is_published));
      } catch (err) {
        console.error('Failed to load privacy policy for admin', err);
        setError('Unable to load privacy policy settings.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPolicy();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      await privacyPolicyService.updateAdmin({
        title,
        content,
        is_published: isPublished,
      });
      setSuccess('Privacy policy updated successfully.');
    } catch (err: any) {
      console.error('Failed to save privacy policy', err?.response?.data || err);
      const serverMessage = err?.response?.data?.detail || 'Failed to update privacy policy.';
      setError(serverMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 animate-pulse">
        <div className="h-8 w-1/4 rounded bg-slate-200" />
        <div className="h-10 w-full rounded bg-slate-200" />
        <div className="h-72 w-full rounded bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Privacy Policy</h1>
        <p className="text-sm text-slate-500">Edit public privacy policy content shown in the website footer link.</p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-end">
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-2">Policy Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              placeholder="Privacy Policy"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-slate-700 select-none">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Published
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${!previewMode ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${previewMode ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            Preview
          </button>
        </div>

        {!previewMode ? (
          <RichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Write the privacy policy content..."
            minHeight={420}
          />
        ) : (
          <div className="rounded-lg border border-slate-200 p-5 bg-slate-50 min-h-[420px]">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">{title || 'Privacy Policy'}</h2>
            <PostContent content={content || '<p>No content yet.</p>'} />
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Privacy Policy'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyManager;
