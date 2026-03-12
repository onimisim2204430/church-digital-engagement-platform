/**
 * App Settings - Enterprise Edition
 * Professional configuration interface for content types and system settings
 */

import React, { useState, useEffect, useMemo } from 'react';
import contentTypeService, { ContentType, CreateContentTypeData, UpdateContentTypeData } from '../services/contentType.service';
import { useConfirm } from '../contexts/ConfirmContext';
import DataTable, { Column, StatusBadge, ActionMenu } from './components/DataTable';
import { Card } from './components/Card';
import {
  SettingsIcon,
  FileTextIcon,
  MailIcon,
  FileIcon,
  PlusIcon,
  RefreshIcon,
  DownloadIcon,
  EditIcon,
  DeleteIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  SaveIcon,
  XIcon,
  CheckIcon,
  ShieldIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from './components/Icons';
import './styles/AppSettings.pro.css';

type SettingsTab = 'content-types' | 'general' | 'permissions' | 'email' | 'api' | 'backup' | 'audit';

interface SettingsNavItem {
  id: SettingsTab;
  label: string;
  icon: React.ReactNode;
  count?: number;
}

const AppSettings: React.FC = () => {
  const { confirm } = useConfirm();

  // Navigation state
  const [activeTab, setActiveTab] = useState<SettingsTab>('content-types');

  // Data state
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingType, setEditingType] = useState<ContentType | null>(null);

  // Form state
  const [createForm, setCreateForm] = useState<CreateContentTypeData>({
    slug: '',
    name: '',
    description: '',
    sort_order: 100,
  });

  const [editForm, setEditForm] = useState<UpdateContentTypeData>({
    name: '',
    description: '',
    is_enabled: true,
    sort_order: 100,
  });

  // Search and filter state
  const [searchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'system' | 'custom'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  
  // Sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Navigation items
  const navItems: SettingsNavItem[] = [
    { id: 'content-types', label: 'Content Types', icon: <FileTextIcon size={20} />, count: contentTypes.length },
    { id: 'general', label: 'General Settings', icon: <SettingsIcon size={20} /> },
    { id: 'permissions', label: 'Roles & Permissions', icon: <ShieldIcon size={20} /> },
    { id: 'email', label: 'Email Templates', icon: <MailIcon size={20} /> },
    { id: 'api', label: 'API & Integrations', icon: <FileIcon size={20} /> },
    { id: 'backup', label: 'Backup & Export', icon: <DownloadIcon size={20} /> },
    { id: 'audit', label: 'Audit Logs', icon: <FileIcon size={20} /> },
  ];

  useEffect(() => {
    loadContentTypes();
  }, []);

  const loadContentTypes = async () => {
    try {
      setLoading(true);
      setError(null);
      const types = await contentTypeService.getAll();
      setContentTypes(types);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('Access Denied: Only administrators can manage content types');
      } else {
        setError(err.response?.data?.error || 'Failed to load content types');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    loadContentTypes();
  };

  // Filtered content types
  const filteredContentTypes = useMemo(() => {
    return contentTypes.filter((type) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        type.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        type.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const matchesType =
        filterType === 'all' ||
        (filterType === 'system' && type.is_system) ||
        (filterType === 'custom' && !type.is_system);

      // Status filter
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'enabled' && type.is_enabled) ||
        (filterStatus === 'disabled' && !type.is_enabled);

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [contentTypes, searchQuery, filterType, filterStatus]);

  // Table columns
  const columns: Column<ContentType>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, type) => (
        <div className="type-name-cell">
          <div className="type-name">{type.name}</div>
          {type.description && <div className="type-description">{type.description}</div>}
        </div>
      ),
    },
    {
      key: 'slug',
      label: 'Slug',
      sortable: true,
      render: (value) => <code className="code-badge">{value}</code>,
    },
    {
      key: 'is_system',
      label: 'Type',
      sortable: true,
      render: (_value, type) => (
        <StatusBadge
          status={type.is_system ? 'SYSTEM' : 'CUSTOM'}
          variant={type.is_system ? 'info' : 'default'}
        />
      ),
    },
    {
      key: 'is_enabled',
      label: 'Status',
      sortable: true,
      render: (_value, type) => (
        <StatusBadge
          status={type.is_enabled ? 'ENABLED' : 'DISABLED'}
          variant={type.is_enabled ? 'success' : 'default'}
        />
      ),
    },
    {
      key: 'posts_count',
      label: 'Posts',
      sortable: true,
      align: 'center',
    },
    {
      key: 'sort_order',
      label: 'Order',
      sortable: true,
      align: 'center',
    },
  ];

  const renderActions = (type: ContentType) => {
    if (type.is_system) {
      return (
        <div className="locked-badge">
          <ShieldIcon size={14} />
          <span>Locked</span>
        </div>
      );
    }

    const actions = [
      {
        label: 'Edit',
        onClick: () => handleEditOpen(type),
        icon: <EditIcon size={16} />,
      },
      {
        label: 'Duplicate',
        onClick: () => handleDuplicate(type),
        icon: <CopyIcon size={16} />,
      },
      {
        label: type.is_enabled ? 'Disable' : 'Enable',
        onClick: () => handleToggleEnabled(type),
        icon: type.is_enabled ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />,
      },
      {
        label: 'Delete',
        onClick: () => handleDelete(type),
        icon: <DeleteIcon size={16} />,
        danger: true,
      },
    ];

    return <ActionMenu actions={actions} />;
  };

  // CRUD Handlers
  const handleCreateOpen = () => {
    setCreateForm({
      slug: '',
      name: '',
      description: '',
      sort_order: 100,
    });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await contentTypeService.create(createForm);
      setShowCreateModal(false);
      loadContentTypes();
    } catch (err: any) {
      alert(err.response?.data?.error || err.response?.data?.slug?.[0] || 'Failed to create content type');
    }
  };

  const handleEditOpen = (type: ContentType) => {
    setEditingType(type);
    setEditForm({
      name: type.name,
      description: type.description,
      is_enabled: type.is_enabled,
      sort_order: type.sort_order,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingType) return;

    try {
      await contentTypeService.update(editingType.id, editForm);
      setShowEditModal(false);
      setEditingType(null);
      loadContentTypes();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update content type');
    }
  };

  const handleDuplicate = async (type: ContentType) => {
    setCreateForm({
      slug: `${type.slug}_copy`,
      name: `${type.name} (Copy)`,
      description: type.description,
      sort_order: type.sort_order + 1,
    });
    setShowCreateModal(true);
  };

  const handleToggleEnabled = async (type: ContentType) => {
    const action = type.is_enabled ? 'disable' : 'enable';
    confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} Content Type`,
      message: `Are you sure you want to ${action} "${type.name}"?`,
      confirmLabel: action.charAt(0).toUpperCase() + action.slice(1),
      variant: 'neutral',
      onConfirm: async () => {
        try {
          await contentTypeService.toggleEnabled(type.id);
          loadContentTypes();
        } catch (err: any) {
          alert(err.response?.data?.error || `Failed to ${action} content type`);
        }
      },
    });
  };

  const handleDelete = (type: ContentType) => {
    if (!type.can_delete) {
      alert(`Cannot delete "${type.name}" because it is used by ${type.posts_count} post(s)`);
      return;
    }

    confirm({
      title: 'Delete Content Type',
      message: `Are you sure you want to delete "${type.name}"? This action cannot be undone.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await contentTypeService.delete(type.id);
          loadContentTypes();
        } catch (err: any) {
          alert(err.response?.data?.error || 'Failed to delete content type');
        }
      },
    });
  };

  return (
    <div className="settings-container">
      {/* Main Content Area */}
      <main className="settings-main">
        {/* Content Types Section */}
        {activeTab === 'content-types' && (
          <div className="settings-content">
            <Card>
              <div className="card-header-pro">
                <div className="card-header-content">
                  <h2>Content Types</h2>
                  <p className="card-description">Manage different types of content in your system</p>
                </div>
                <div className="card-header-actions">
                  <button className="btn-secondary-pro" onClick={handleRefresh}>
                    <RefreshIcon size={16} />
                    Refresh
                  </button>
                  <button className="btn-primary-pro" onClick={handleCreateOpen}>
                    <PlusIcon size={16} />
                    Add Custom Type
                  </button>
                </div>
              </div>

              {error && (
                <div className="error-banner">
                  <XIcon size={20} />
                  <span>{error}</span>
                </div>
              )}

              {/* Filters */}
              <div className="table-filters">
                <div className="filter-group">
                  <label>Type:</label>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
                    <option value="all">All</option>
                    <option value="system">System</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="filter-group">
                  <label>Status:</label>
                  <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
                    <option value="all">All</option>
                    <option value="enabled">Enabled</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              {/* DataTable */}
              <DataTable
                data={filteredContentTypes}
                columns={columns}
                actions={renderActions}
                searchable
                searchPlaceholder="Search content types..."
                loading={loading}
                emptyMessage="No content types found"
              />
            </Card>
          </div>
        )}

        {/* Other Sections (Placeholder) */}
        {activeTab !== 'content-types' && (
          <div className="settings-content">
            <div className="coming-soon-container">
              <p className="coming-soon-text">Coming Soon</p>
            </div>
          </div>
        )}
      </main>

      {/* Settings Sidebar Navigation - Right Side */}
      <aside className={`settings-nav settings-nav-right ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <button 
          className="settings-nav-toggle"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronLeftIcon size={20} /> : <ChevronRightIcon size={20} />}
        </button>
        
        <nav className="settings-nav-list">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`settings-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {!sidebarCollapsed && (
                <>
                  <span className="nav-label">{item.label}</span>
                  {item.count !== undefined && <span className="nav-badge">{item.count}</span>}
                </>
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content-pro" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Custom Content Type</h3>
              <button className="btn-close-x" onClick={() => setShowCreateModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="slug">
                    Slug <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="slug"
                    value={createForm.slug}
                    onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase() })}
                    placeholder="e.g., devotion, hymn"
                    pattern="[a-z0-9_-]+"
                    required
                  />
                  <small>Lowercase letters, numbers, hyphens, and underscores only. Cannot be changed later.</small>
                </div>

                <div className="form-group">
                  <label htmlFor="name">
                    Display Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder="e.g., Devotion, Hymn"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                    placeholder="Optional description for administrators"
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sort_order">Sort Order</label>
                  <input
                    type="number"
                    id="sort_order"
                    value={createForm.sort_order}
                    onChange={(e) => setCreateForm({ ...createForm, sort_order: parseInt(e.target.value) })}
                    min="0"
                  />
                  <small>Lower numbers appear first in dropdowns</small>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary-pro" onClick={() => setShowCreateModal(false)}>
                  <XIcon size={16} />
                  Cancel
                </button>
                <button type="submit" className="btn-primary-pro">
                  <CheckIcon size={16} />
                  Create Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingType && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content-pro" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Content Type</h3>
              <button className="btn-close-x" onClick={() => setShowEditModal(false)}>
                &times;
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Slug</label>
                  <input type="text" value={editingType.slug} disabled className="input-disabled" />
                  <small>Slug cannot be changed after creation</small>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-name">
                    Display Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-description">Description</label>
                  <textarea
                    id="edit-description"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-sort-order">Sort Order</label>
                  <input
                    type="number"
                    id="edit-sort-order"
                    value={editForm.sort_order}
                    onChange={(e) => setEditForm({ ...editForm, sort_order: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>

                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={editForm.is_enabled}
                      onChange={(e) => setEditForm({ ...editForm, is_enabled: e.target.checked })}
                    />
                    <span>Enabled (appears in post creation)</span>
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary-pro" onClick={() => setShowEditModal(false)}>
                  <XIcon size={16} />
                  Cancel
                </button>
                <button type="submit" className="btn-primary-pro">
                  <SaveIcon size={16} />
                  Update Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppSettings;
