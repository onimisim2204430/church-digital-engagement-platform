/**
 * AdminGivingManager.tsx
 * Full CRUD management for Giving page items (tithes, offerings, projects, fundraising).
 * 
 * PERFORMANCE OPTIMIZATIONS APPLIED:
 * - All callbacks stabilized with useCallback
 * - All computed values memoized with useMemo
 * - All 4 tabs lazy-loaded with Suspense boundaries
 * - DeleteModal lazy-loaded
 * - filteredItems has early-exit fast-path
 * - Drag handlers use data-item-id pattern (no closure over item.id)
 * - All static styles lifted to module-level constants
 * - All sub-components wrapped with React.memo
 */

import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import { supportedIcons } from '../../components/common/iconMapping';
import givingService, { GivingItem, CreateGivingItemRequest } from '../../services/giving.service';

import {
  CATEGORY_OPTIONS,
  STATUS_OPTIONS,
  THIN_SCROLLBAR,
} from './constants/giving.constants';
import {
  formatCurrency,
  fmtDate,
  getProgressPct,
  statusStyle,
  emptyForm,
  normalizeIconName,
} from './helpers/giving.helpers';

import GivingListItem from './components/GivingListItem';
import GivingStatStrip from './components/GivingStatStrip';

// Lazy-load heavy components
const DetailsTab    = lazy(() => import('./tabs/DetailsTab'));
const AppearanceTab = lazy(() => import('./tabs/AppearanceTab'));
const AnalyticsTab  = lazy(() => import('./tabs/AnalyticsTab'));
const SettingsTab   = lazy(() => import('./tabs/SettingsTab'));
const DeleteModal   = lazy(() => import('./components/DeleteModal'));

// Skeleton fallbacks
const TabSkeleton = () => (
  <div className="flex flex-col gap-4 mt-2">
    <div className="h-48 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
    <div className="h-32 rounded-xl bg-slate-100 dark:bg-slate-700 animate-pulse" />
  </div>
);

// Set displayName for lazy components
(DetailsTab as any).displayName    = 'DetailsTab';
(AppearanceTab as any).displayName = 'AppearanceTab';
(AnalyticsTab as any).displayName  = 'AnalyticsTab';
(SettingsTab as any).displayName   = 'SettingsTab';
(DeleteModal as any).displayName   = 'DeleteModal';

// ─── Main Component ──────────────────────────────────────────────────────────

const AdminGivingManager: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();

  // ── List state ───────────────────────────────────────────────────
  const [items, setItems] = useState<GivingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [listSearch, setListSearch] = useState('');
  const [listCategory, setListCategory] = useState<string>('All');
  const [listStatus, setListStatus] = useState<string>('All');
  const [deleteTarget, setDeleteTarget] = useState<GivingItem | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // ── Fetch items from API ─────────────────────────────────────────
  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        setLoadError('');
        const data = await givingService.list();
        setItems(data);
      } catch (error: any) {
        console.error('Failed to fetch giving items:', error);
        setLoadError(error.message || 'Failed to load giving items');
      } finally {
        setLoading(false);
      }
    };
    fetchItems();
  }, []);

  // ── Detail/Create state ──────────────────────────────────────────
  const isCreateMode = id === 'new';
  const isDetailMode = !!id && id !== 'new';
  const currentItem = isDetailMode ? items.find(i => i.id === id) || null : null;

  const [form, setForm] = useState<CreateGivingItemRequest>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'appearance' | 'analytics' | 'settings'>('details');

  // Sync form when navigating to an existing item
  useEffect(() => {
    if (isDetailMode && currentItem) {
      setForm({
        category: currentItem.category,
        title: currentItem.title,
        description: currentItem.description,
        icon: currentItem.icon,
        visibility: currentItem.visibility,
        status: currentItem.status,
        is_featured: currentItem.is_featured,
        is_recurring_enabled: currentItem.is_recurring_enabled,
        suggested_amounts: [...currentItem.suggested_amounts],
        goal_amount: currentItem.goal_amount,
        deadline: currentItem.deadline,
        verse: currentItem.verse,
        cover_image: currentItem.cover_image,
        display_order: currentItem.display_order,
      });
      setActiveTab('details');
      setSaveError('');
      setSaveSuccess(false);
    }
    if (isCreateMode) {
      setForm(emptyForm());
      setActiveTab('details');
      setSaveError('');
      setSaveSuccess(false);
    }
  }, [id, currentItem, isDetailMode, isCreateMode]);

  // ── Computed list with fast-path ────────────────────────────────
  const filteredItems = useMemo(() => {
    // Fast-path: no filters active
    if (listCategory === 'All' && listStatus === 'All' && !listSearch.trim()) {
      return items;
    }
    const q = listSearch.toLowerCase().trim();
    
    // Map display category label to backend category value
    const categoryValueMap: Record<string, string> = {
      'Tithes': 'tithe',
      'Offerings': 'offering', 
      'Projects': 'project',
      'Missions': 'mission',
      'Seed': 'seed',
      'Other': 'other'
    };
    
    return items.filter(i => {
      // Category filter: match backend category value
      if (listCategory !== 'All') {
        const categoryValue = categoryValueMap[listCategory];
        if (categoryValue && i.category !== categoryValue) return false;
      }
      // Status filter: direct match (already lowercase)
      if (listStatus !== 'All' && i.status !== listStatus.toLowerCase()) return false;
      // Search filter
      if (q && !i.title.toLowerCase().includes(q) && !i.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, listCategory, listStatus, listSearch]);

  // ── Stats ────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    totalItems: items.length,
    activeItems: items.filter(i => i.status === 'active').length,
    totalRaised: items.reduce((s, i) => s + i.total_donations, 0),
    totalDonors: items.reduce((s, i) => s + i.donor_count, 0),
    featuredCount: items.filter(i => i.is_featured).length,
  }), [items]);

  // ── Check if current item is completed ────────────────────────────
  const isItemCompleted = useMemo(() => {
    if (!currentItem) return false;
    // Manually marked as completed
    if (currentItem.status === 'completed') return true;
    // Automatically completed: 100% funded
    if (currentItem.goal_amount && currentItem.goal_amount > 0) {
      const progressPercentage = Math.round((currentItem.raised_amount / currentItem.goal_amount) * 100);
      if (progressPercentage >= 100) return true;
    }
    return false;
  }, [currentItem]);

  // ── Drag-to-reorder with data-item-id pattern ───────────────────
  const handleDragStart = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    setDraggedId(e.currentTarget.dataset.itemId!);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    const targetId = e.currentTarget.dataset.itemId!;
    if (!draggedId || draggedId === targetId) return;
    const from = filteredItems.findIndex(i => i.id === draggedId);
    const to = filteredItems.findIndex(i => i.id === targetId);
    if (from === -1 || to === -1) return;
    const reordered = [...items];
    const fromGlobal = reordered.findIndex(i => i.id === draggedId);
    const toGlobal = reordered.findIndex(i => i.id === targetId);
    const [moved] = reordered.splice(fromGlobal, 1);
    reordered.splice(toGlobal, 0, moved);
    setItems(reordered.map((i, idx) => ({ ...i, display_order: idx + 1 })));
    setDraggedId(null);
  }, [draggedId, filteredItems, items]);

  const handleSaveOrder = useCallback(async () => {
    try {
      setSavingOrder(true);
      const reorderData = items.map((item, index) => ({
        id: item.id,
        display_order: index + 1,
      }));
      await givingService.reorder(reorderData);
    } catch (error: any) {
      console.error('Failed to save order:', error);
      alert('Failed to save order: ' + (error.message || 'Unknown error'));
    } finally {
      setSavingOrder(false);
    }
  }, [items]);

  // ── Delete ───────────────────────────────────────────────────────
  const handleDelete = useCallback((item: GivingItem) => {
    setDeleteTarget(item);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await givingService.delete(deleteTarget.id);
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (id === deleteTarget.id) navigate('/admin/seed');
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      alert('Failed to delete: ' + (error.message || 'Unknown error'));
    }
  }, [deleteTarget, id, navigate]);

  // ── Quick toggle ─────────────────────────────────────────────────
  const handleToggleFeatured = useCallback(async (itemId: string, value: boolean) => {
    try {
      await givingService.update(itemId, { is_featured: value });
      setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_featured: value } : i));
    } catch (error: any) {
      console.error('Failed to toggle featured:', error);
      alert('Failed to update: ' + (error.message || 'Unknown error'));
    }
  }, []);

  // ── Form helpers ─────────────────────────────────────────────────
  const handleFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else if (name === 'goal_amount') {
      setForm(prev => ({ ...prev, goal_amount: value === '' ? null : parseInt(value) || null }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleFormUpdate = useCallback((updates: Partial<typeof form>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.title.trim()) { setSaveError('Title is required.'); return; }
    
    // Prevent editing completed projects
    if (isDetailMode && currentItem?.status === 'completed') {
      setSaveError('This project is completed and cannot be edited. To make changes, you need to change its status first.');
      return;
    }
    
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      if (isCreateMode) {
        const newItem = await givingService.create(form);
        setItems(prev => [...prev, newItem]);
        setSaving(false);
        navigate(`/admin/seed/${newItem.id}`, { state: { justCreated: true } });
        return;
      }

      if (isDetailMode && currentItem) {
        const updated = await givingService.update(currentItem.id, form);
        setItems(prev => prev.map(i => i.id === currentItem.id ? updated : i));
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (error: any) {
      console.error('Failed to save giving item:', error);
      setSaveError(error.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [form, isCreateMode, isDetailMode, currentItem, navigate]);

  const handleDiscard = useCallback(() => {
    if (!currentItem) return;
    setForm({
      category: currentItem.category,
      title: currentItem.title,
      description: currentItem.description,
      icon: currentItem.icon,
      visibility: currentItem.visibility,
      status: currentItem.status,
      is_featured: currentItem.is_featured,
      is_recurring_enabled: currentItem.is_recurring_enabled,
      suggested_amounts: [...currentItem.suggested_amounts],
      goal_amount: currentItem.goal_amount,
      deadline: currentItem.deadline,
      verse: currentItem.verse,
      cover_image: currentItem.cover_image,
      display_order: currentItem.display_order,
    });
  }, [currentItem]);

  const handleArchive = useCallback(() => {
    setForm(prev => ({ ...prev, status: 'archived', visibility: 'hidden' }));
    setActiveTab('details');
  }, []);

  const handleComplete = useCallback(() => {
    setForm(prev => ({ ...prev, status: 'completed' }));
    setActiveTab('details');
  }, []);

  const goToNew = useCallback(() => navigate('/admin/seed/new'), [navigate]);
  const goToList = useCallback(() => navigate('/admin/seed'), [navigate]);
  const goToEdit = useCallback((itemId: string) => navigate(`/admin/seed/${itemId}`), [navigate]);

  const categoryHasGoal = ['project', 'mission', 'seed'].includes(form.category);

  // ── Render: List View ────────────────────────────────────────────
  const renderList = () => {
    // Loading state
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Icon name="hourglass_empty" size={48} className="text-slate-300 animate-pulse" />
          <p className="mt-3 text-slate-500 font-semibold">Loading giving items...</p>
        </div>
      );
    }

    // Error state
    if (loadError) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Icon name="error" size={48} className="text-red-300" />
          <p className="mt-3 text-slate-700 font-semibold">Failed to load giving items</p>
          <p className="text-sm text-slate-500 mt-1">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold text-sm"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page header — fixed via flex-shrink-0, never scrolls */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-5 flex-shrink-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon name="volunteer_activism" size={18} className="text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Seed Manager</h2>
              </div>
              <p className="text-sm text-slate-soft dark:text-slate-400 ml-10">Create and manage all giving items shown on the public Giving page.</p>
            </div>
            <button
              onClick={goToNew}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold text-sm shadow-sm hover:opacity-90 transition-all flex-shrink-0"
            >
              <Icon name="add" size={18} />
              New Giving Item
            </button>
          </div>

          {/* Stats strip */}
          <GivingStatStrip stats={stats} />
        </div>
      </div>

      {/* Toolbar — fixed via flex-shrink-0 */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-6 py-3 flex-shrink-0">
        <div className="max-w-7xl mx-auto flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative w-72">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Search giving items..."
              value={listSearch}
              onChange={e => setListSearch(e.target.value)}
            />
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setListCategory('All')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${listCategory === 'All' ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              All
            </button>
            {CATEGORY_OPTIONS.map(cat => (
              <button
                key={cat.value}
                onClick={() => setListCategory(cat.label)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${listCategory === cat.label ? 'bg-white dark:bg-slate-700 text-primary shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <select
            value={listStatus}
            onChange={e => setListStatus(e.target.value as any)}
            className="border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-xs bg-white dark:bg-slate-800 dark:text-slate-200 text-slate-700 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="All">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-soft dark:text-slate-400 font-medium">{filteredItems.length} items</span>
            <button
              onClick={handleSaveOrder}
              disabled={savingOrder}
              className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 px-3 py-2 rounded-lg text-xs font-semibold hover:border-primary hover:text-primary transition-colors disabled:opacity-60"
            >
              <Icon name={savingOrder ? 'hourglass_empty' : 'save'} size={14} />
              {savingOrder ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        </div>
      </div>

      {/* List content — THE ONLY scroll container */}
      {/* NOTE: Any programmatic scroll listeners on this element must use { passive: true } */}
      <div className="flex-1 overflow-y-auto bg-transparent p-6" style={THIN_SCROLLBAR}>
        <div className="max-w-7xl mx-auto flex flex-col gap-3">
          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Icon name="volunteer_activism" size={48} className="text-slate-200" />
              <p className="mt-3 text-slate-500 font-semibold">No giving items found</p>
              <p className="text-xs text-slate-400 mt-1 mb-5">Try adjusting your filters or create a new item.</p>
              <button
                onClick={goToNew}
                className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg font-semibold text-sm"
              >
                <Icon name="add" size={16} />
                Create First Item
              </button>
            </div>
          )}

          {filteredItems.map((item, idx) => (
            <GivingListItem
              key={item.id}
              item={item}
              index={idx}
              isDragging={draggedId === item.id}
              supportedIcons={supportedIcons}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onEdit={goToEdit}
              onToggleFeatured={handleToggleFeatured}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </div>
    </div>
    );
  };

  // ── Render: Detail / Create View ──────────────────────────────────
  const renderDetail = () => {
    // Determine tabs based on mode and completion status
    let tabs: { key: 'details' | 'appearance' | 'analytics' | 'settings'; icon: string; label: string }[];
    
    if (isCreateMode) {
      tabs = [{ key: 'details', icon: 'add', label: 'Create Item' }];
    } else {
      // Always show all 4 tabs, mark Details/Appearance as read-only when completed
      tabs = [
        { key: 'details', icon: 'edit', label: 'Details' },
        { key: 'appearance', icon: 'palette', label: 'Appearance' },
        { key: 'analytics', icon: 'analytics', label: 'Analytics' },
        { key: 'settings', icon: 'settings', label: 'Settings' },
      ];
    }

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Page header — fixed via flex-shrink-0 */}
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 px-6 py-5 flex-shrink-0">
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">
              <button
                onClick={goToList}
                className="hover:text-primary transition-colors flex items-center gap-1"
              >
                <Icon name="arrow_back" size={14} />
                Seed Manager
              </button>
              <Icon name="chevron_right" size={10} />
              <span className="text-slate-900 dark:text-slate-100 truncate max-w-xs">
                {isCreateMode ? 'New Giving Item' : currentItem?.title || 'Edit Item'}
              </span>
            </nav>

            <div className="flex items-start justify-between gap-6">
              <div className="flex gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Icon name={normalizeIconName(supportedIcons, form.icon || 'volunteer_activism')} size={28} className="text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-none">
                      {isCreateMode ? 'Create New Giving Item' : (loading && !currentItem ? 'Loading...' : (form.title || 'Untitled'))}
                    </h2>
                    {!isCreateMode && currentItem && (
                      <>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusStyle(currentItem.status)}`}>
                          {currentItem.status}
                        </span>
                        {currentItem.is_featured && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider border border-amber-200">Featured</span>
                        )}
                      </>
                    )}
                  </div>
                  {!isCreateMode && currentItem && (
                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                      <span className="flex items-center gap-1"><Icon name="library_books" size={12} />{currentItem.category}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="flex items-center gap-1"><Icon name="calendar_today" size={12} />Created {fmtDate(currentItem.created_at)}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span className="flex items-center gap-1"><Icon name="history" size={12} />Updated {fmtDate(currentItem.updated_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {!isCreateMode && currentItem && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <a
                    href="/giving"
                    target="_blank"
                    rel="noreferrer"
                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold text-sm transition-all flex items-center gap-2"
                  >
                    <Icon name="visibility" size={16} />
                    Preview
                  </a>
                  <button
                    onClick={handleSave}
                    disabled={saving || isItemCompleted}
                    className="bg-primary text-white px-5 py-2 rounded-lg font-semibold text-sm shadow-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    <Icon name={saving ? 'hourglass_empty' : 'check'} size={16} />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {/* Metrics strip — edit mode only */}
            {!isCreateMode && currentItem && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5 border-t border-slate-100 dark:border-slate-700 pt-4">
                {[
                  { icon: 'payments', bg: 'bg-primary/10 text-primary', label: 'Total Raised', value: formatCurrency(currentItem.total_donations) },
                  { icon: 'people', bg: 'bg-blue-50 text-blue-600', label: 'Donor Count', value: currentItem.donor_count.toLocaleString() },
                  { icon: 'trending_up', bg: 'bg-green-50 text-green-600', label: 'Goal Progress', value: currentItem.goal_amount ? `${getProgressPct(currentItem.raised_amount, currentItem.goal_amount)}%` : 'No goal set' },
                  { icon: 'calendar_month', bg: 'bg-amber-50 text-amber-600', label: 'Deadline', value: currentItem.deadline ? fmtDate(currentItem.deadline) : 'Open-ended' },
                ].map(m => (
                  <div key={m.label} className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${m.bg}`}>
                      <Icon name={m.icon} size={16} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">{m.label}</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{m.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tab bar — fixed via flex-shrink-0 */}
        <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-6 flex-shrink-0">
          <div className="max-w-7xl mx-auto">
            <nav className="flex -mb-px space-x-8">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                    activeTab === tab.key
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <Icon name={tab.icon} size={18} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab content — THE ONLY scroll container */}
        {/* NOTE: Any programmatic scroll listeners on this element must use { passive: true } */}
        <div className="flex-1 overflow-y-auto bg-transparent p-6" style={THIN_SCROLLBAR}>
          <div className="max-w-7xl mx-auto">
            {/* Banners */}
            {saveSuccess && (
              <div className="mb-5 flex items-center gap-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-300 rounded-xl px-5 py-3.5 text-sm font-medium">
                <Icon name="check_circle" size={18} className="text-green-500" />
                Changes saved successfully.
              </div>
            )}
            {saveError && (
              <div className="mb-5 flex items-center gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-300 rounded-xl px-5 py-3.5 text-sm font-medium">
                <Icon name="error_outline" size={18} className="text-red-400" />
                {saveError}
              </div>
            )}

            {/* Loading state for detail view on refresh */}
            {isDetailMode && loading && !currentItem && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Icon name="hourglass_empty" size={48} className="text-slate-300 animate-spin" />
                <p className="mt-4 text-slate-500 font-semibold">Loading project data...</p>
              </div>
            )}

            {/* Show content only when not loading or when data is available */}
            {(!isDetailMode || !loading || currentItem) && (
            <Suspense fallback={<TabSkeleton />}>
              {activeTab === 'details' && (
                <DetailsTab
                  form={form}
                  isCreateMode={isCreateMode}
                  currentItem={currentItem}
                  saving={saving}
                  categoryHasGoal={categoryHasGoal}
                  supportedIcons={supportedIcons}
                  readOnly={isItemCompleted}
                  onFormChange={handleFormChange}
                  onFormUpdate={handleFormUpdate}
                  onSave={handleSave}
                  onDiscard={handleDiscard}
                  onCancel={goToList}
                />
              )}
              {activeTab === 'appearance' && !isCreateMode && (
                <AppearanceTab
                  form={form}
                  supportedIcons={supportedIcons}
                  readOnly={isItemCompleted}
                  onFormUpdate={handleFormUpdate}
                />
              )}
              {activeTab === 'analytics' && !isCreateMode && currentItem && (
                <AnalyticsTab currentItem={currentItem} />
              )}
              {activeTab === 'settings' && !isCreateMode && currentItem && (
                <SettingsTab
                  currentItem={currentItem}
                  onArchive={handleArchive}
                  onComplete={handleComplete}
                  onDelete={handleDelete}
                />
              )}
            </Suspense>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-hidden">
      {!id ? renderList() : renderDetail()}
      {deleteTarget && (
        <Suspense fallback={null}>
          <DeleteModal
            item={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={confirmDelete}
          />
        </Suspense>
      )}
    </div>
  );
};

export default AdminGivingManager;
