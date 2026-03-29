import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/common/Icon';
import AdminNoteModal from '../components/common/AdminNoteModal';
import { useAuth } from '../auth/AuthContext';
import { UserRole } from '../types/auth.types';
import { useToast } from '../contexts/ToastContext';
import seriesService from '../services/series.service';
import seriesAnnouncementService, {
  AnnouncementRequestStatus,
  AnnouncementRequestType,
  SeriesAnnouncementRequest,
} from '../services/series-announcement.service';

const PAGE_SIZE = 20;
const AUTO_REFRESH_INTERVAL_MS = 30_000;

const STATUS_OPTIONS: Array<{ label: string; value: '' | AnnouncementRequestStatus }> = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING_ADMIN_APPROVAL' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Failed', value: 'FAILED' },
  { label: 'Rejected', value: 'REJECTED' },
];

const REQUEST_TYPE_OPTIONS: Array<{ label: string; value: AnnouncementRequestType }> = [
  { label: 'Announcement', value: 'ANNOUNCEMENT' },
  { label: 'New Article Update', value: 'NEW_ARTICLE' },
];

const statusTone = (s: AnnouncementRequestStatus) => {
  switch (s) {
    case 'PENDING_ADMIN_APPROVAL': return 'bg-amber-100 text-amber-800 border border-amber-300';
    case 'APPROVED':               return 'bg-blue-100 text-blue-700 border border-blue-300';
    case 'REJECTED':               return 'bg-red-100 text-red-700 border border-red-300';
    case 'PROCESSING':             return 'bg-indigo-100 text-indigo-700 border border-indigo-300';
    case 'DELIVERED':              return 'bg-emerald-100 text-emerald-700 border border-emerald-300';
    case 'FAILED':                 return 'bg-rose-100 text-rose-700 border border-rose-300';
    default:                       return 'bg-slate-100 text-slate-600 border border-slate-200';
  }
};

const formatDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

/* ------------------------------------------------------------------ */
/*  Modal state shape                                                   */
/* ------------------------------------------------------------------ */
interface ModalState {
  isOpen: boolean;
  action: 'approve' | 'reject';
  request: SeriesAnnouncementRequest | null;
}

const MODAL_CLOSED: ModalState = { isOpen: false, action: 'approve', request: null };

/* ================================================================== */
/*  Component                                                           */
/* ================================================================== */
const SeriesAnnouncementQueue: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const isAdmin = user?.role === UserRole.ADMIN;

  // --- Data ---
  const [requests, setRequests] = useState<SeriesAnnouncementRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);

  // --- Filter & pagination ---
  const [statusFilter, setStatusFilter] = useState<'' | AnnouncementRequestStatus>('');
  const [page, setPage] = useState(1);

  // --- Auto-refresh ---
  const [autoRefresh, setAutoRefresh] = useState(true);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // --- Modal ---
  const [modal, setModal] = useState<ModalState>(MODAL_CLOSED);

  // --- Series options for form ---
  const [seriesOptions, setSeriesOptions] = useState<Array<{ id: string; title: string }>>([]);
  const [formState, setFormState] = useState({
    series: '',
    request_type: 'ANNOUNCEMENT' as AnnouncementRequestType,
    title: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  /* ---- Load requests ---- */
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await seriesAnnouncementService.list(
        statusFilter ? { status: statusFilter } : undefined,
      );
      setRequests(data);
      setPage(1); // reset to first page on new filter/load
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to load announcement queue.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  /* ---- Auto-refresh ---- */
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshRef.current = setInterval(loadRequests, AUTO_REFRESH_INTERVAL_MS);
    } else if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
    }
    return () => {
      if (autoRefreshRef.current) clearInterval(autoRefreshRef.current);
    };
  }, [autoRefresh, loadRequests]);

  /* ---- Series options for form ---- */
  useEffect(() => {
    seriesService.getAllSeries()
      .then((items) => {
        setSeriesOptions(items.map((s) => ({ id: s.id, title: s.title })));
        if (items.length && !formState.series) {
          setFormState((prev) => ({ ...prev, series: items[0].id }));
        }
      })
      .catch(() => {/* keep form usable */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Summary counts ---- */
  const counts = useMemo(() => ({
    total:     requests.length,
    pending:   requests.filter((r) => r.status === 'PENDING_ADMIN_APPROVAL').length,
    delivered: requests.filter((r) => r.status === 'DELIVERED').length,
    failed:    requests.filter((r) => r.status === 'FAILED').length,
  }), [requests]);

  /* ---- Pagination ---- */
  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const paginatedRequests = requests.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ---- Create request ---- */
  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formState.series || !formState.title.trim() || !formState.message.trim()) {
      toast.warning('Please complete all required fields.');
      return;
    }
    try {
      setSubmitting(true);
      await seriesAnnouncementService.create({
        series: formState.series,
        request_type: formState.request_type,
        title: formState.title.trim(),
        message: formState.message.trim(),
      });
      toast.success('Announcement submitted — awaiting admin approval.');
      setFormState((prev) => ({ ...prev, title: '', message: '' }));
      await loadRequests();
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- Modal confirm handler ---- */
  const handleModalConfirm = async (note: string) => {
    if (!modal.request) return;
    const { action, request } = modal;
    setModal(MODAL_CLOSED);

    try {
      setActingId(request.id);
      if (action === 'approve') {
        await seriesAnnouncementService.approve(request.id, note);
        toast.success('Request approved and queued for delivery.');
      } else {
        await seriesAnnouncementService.reject(request.id, note);
        toast.success('Request rejected — moderator has been notified.');
      }
      await loadRequests();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail ||
        `Failed to ${action} request. Please try again.`,
      );
    } finally {
      setActingId(null);
    }
  };

  const openApprove = (request: SeriesAnnouncementRequest) =>
    setModal({ isOpen: true, action: 'approve', request });

  const openReject = (request: SeriesAnnouncementRequest) =>
    setModal({ isOpen: true, action: 'reject', request });

  /* ================================================================ */
  /*  Render                                                            */
  /* ================================================================ */
  return (
    <>
      {/* ---- Admin Note Modal ---- */}
      <AdminNoteModal
        isOpen={modal.isOpen}
        title={modal.action === 'approve' ? 'Approve Announcement' : 'Reject Announcement'}
        description={
          modal.action === 'approve'
            ? `Approving "${modal.request?.title}" will immediately queue it for subscriber delivery.`
            : `The moderator will be notified of the rejection with your note.`
        }
        confirmLabel={modal.action === 'approve' ? 'Approve & Queue Delivery' : 'Reject Request'}
        confirmVariant={modal.action}
        requireNote={modal.action === 'reject'}
        onConfirm={handleModalConfirm}
        onClose={() => setModal(MODAL_CLOSED)}
      />

      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">

          {/* ---- Header ---- */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Series Announcement Queue</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Moderator requests are held for admin review before subscriber delivery.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Total {counts.total}
                </span>
                <span className="rounded-md bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                  Pending {counts.pending}
                </span>
                <span className="rounded-md bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Delivered {counts.delivered}
                </span>
                <span className="rounded-md bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                  Failed {counts.failed}
                </span>
                {/* Auto-refresh toggle */}
                <button
                  onClick={() => setAutoRefresh((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold transition ${
                    autoRefresh
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-slate-300 bg-white text-slate-600'
                  }`}
                  title={autoRefresh ? 'Auto-refresh ON (30s)' : 'Auto-refresh OFF'}
                >
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${autoRefresh ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`}
                  />
                  {autoRefresh ? 'Live' : 'Paused'}
                </button>
                <button
                  onClick={loadRequests}
                  disabled={loading}
                  className="flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Icon name="refresh" size={14} />
                  {loading ? 'Loading…' : 'Refresh'}
                </button>
              </div>
            </div>
          </div>

          {/* ---- Body grid ---- */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

            {/* ---- New Request Form ---- */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
              <div className="mb-4 flex items-center gap-2">
                <Icon name="edit_note" size={18} className="text-primary" />
                <h2 className="text-lg font-semibold text-slate-900">New Request</h2>
              </div>
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Submissions go to the approval queue and will <strong>not</strong> be sent until an
                admin approves them.
              </p>
              <form className="space-y-4" onSubmit={handleCreate}>
                {/* Series */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Series
                  </label>
                  <select
                    value={formState.series}
                    onChange={(e) => setFormState((p) => ({ ...p, series: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  >
                    {!seriesOptions.length
                      ? <option value="">No series available</option>
                      : seriesOptions.map((o) => <option key={o.id} value={o.id}>{o.title}</option>)}
                  </select>
                </div>

                {/* Type */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Update Type
                  </label>
                  <select
                    value={formState.request_type}
                    onChange={(e) => setFormState((p) => ({ ...p, request_type: e.target.value as AnnouncementRequestType }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  >
                    {REQUEST_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Title
                  </label>
                  <input
                    value={formState.title}
                    onChange={(e) => setFormState((p) => ({ ...p, title: e.target.value }))}
                    maxLength={255}
                    placeholder="New articles arriving in 2 weeks"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    required
                  />
                </div>

                {/* Message */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Message
                    </label>
                    <span className={`text-[11px] ${formState.message.length > 1800 ? 'text-rose-500' : 'text-slate-400'}`}>
                      {formState.message.length} / 2000
                    </span>
                  </div>
                  <textarea
                    value={formState.message}
                    onChange={(e) => setFormState((p) => ({ ...p, message: e.target.value }))}
                    maxLength={2000}
                    className="min-h-36 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                    placeholder="Describe the update for subscribers..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !formState.series}
                  className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Submitting…' : 'Submit For Admin Approval'}
                </button>
              </form>
            </section>

            {/* ---- Approval Queue ---- */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="rule" size={18} className="text-primary" />
                  <h2 className="text-lg font-semibold text-slate-900">Approval Queue</h2>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as '' | AnnouncementRequestStatus)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary md:w-56"
                >
                  {STATUS_OPTIONS.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-sm text-slate-400">
                  <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  Loading requests…
                </div>
              ) : requests.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">
                  No requests found for this filter.
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Title / Message</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Series</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Type</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Submitted</th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery</th>
                          {isAdmin && (
                            <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedRequests.map((req) => {
                          const canReview =
                            isAdmin &&
                            req.status === 'PENDING_ADMIN_APPROVAL' &&
                            actingId !== req.id;
                          const isActing = actingId === req.id;

                          return (
                            <tr key={req.id} className="align-top hover:bg-slate-50/60">
                              <td className="max-w-xs px-3 py-3">
                                <p className="font-semibold text-slate-900 line-clamp-1">{req.title}</p>
                                <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{req.message}</p>
                                <p className="mt-1 text-[11px] text-slate-400">
                                  by {req.created_by_name || 'Unknown'}
                                </p>
                              </td>
                              <td className="px-3 py-3 text-slate-700">{req.series_title}</td>
                              <td className="px-3 py-3 text-xs text-slate-600">
                                {req.request_type.replace('_', ' ')}
                              </td>
                              <td className="px-3 py-3">
                                <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${statusTone(req.status)}`}>
                                  {req.status.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-xs text-slate-500">
                                {formatDateTime(req.requested_at)}
                              </td>
                              <td className="px-3 py-3 text-xs text-slate-500">
                                {req.audience_snapshot_count > 0
                                  ? `${req.delivered_count}/${req.audience_snapshot_count} sent`
                                  : '—'}
                                {req.failed_count > 0 && (
                                  <span className="ml-1 text-rose-500">
                                    ({req.failed_count} failed)
                                  </span>
                                )}
                              </td>
                              {isAdmin && (
                                <td className="px-3 py-3">
                                  {isActing ? (
                                    <span className="text-xs text-slate-400">Processing…</span>
                                  ) : canReview ? (
                                    <div className="flex flex-col gap-1.5">
                                      <button
                                        id={`approve-${req.id}`}
                                        onClick={() => openApprove(req)}
                                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                      >
                                        Approve
                                      </button>
                                      <button
                                        id={`reject-${req.id}`}
                                        onClick={() => openReject(req)}
                                        className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                      >
                                        Reject
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-400">
                                      {req.status === 'PENDING_ADMIN_APPROVAL' ? 'Pending' : 'Reviewed'}
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
                      <span>
                        Page {page} of {totalPages} ({requests.length} results)
                      </span>
                      <div className="flex gap-2">
                        <button
                          disabled={page <= 1}
                          onClick={() => setPage((p) => p - 1)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          ← Prev
                        </button>
                        <button
                          disabled={page >= totalPages}
                          onClick={() => setPage((p) => p + 1)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
};

export default SeriesAnnouncementQueue;
