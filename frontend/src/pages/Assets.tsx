import { useEffect, useState, FormEvent } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Asset {
  id: number;
  name: string;
  description: string;
  category: string;
  serial_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  eol_date: string | null;
  status: string;
}

interface User {
  id: number;
  username: string;
  email: string;
}

interface Group {
  id: number;
  name: string;
  members: { id: number; username: string }[];
}

export default function Assets() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState({ name: '', description: '', category: '', serial_number: '', purchase_date: '', purchase_price: '', eol_date: '' });

  // Assign modal state
  const [assignAsset, setAssignAsset] = useState<Asset | null>(null);
  const [assignType, setAssignType] = useState<'user' | 'group'>('user');
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [assignNotes, setAssignNotes] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');

  const load = () => {
    const params: any = {};
    if (search) params.search = search;
    if (filterStatus) params.status = filterStatus;
    api.get('/assets', { params }).then((r) => setAssets(r.data));
  };

  useEffect(() => { load(); }, [search, filterStatus]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (editAsset) {
      await api.put(`/assets/${editAsset.id}`, form);
    } else {
      await api.post('/assets', form);
    }
    setShowForm(false);
    setEditAsset(null);
    setForm({ name: '', description: '', category: '', serial_number: '', purchase_date: '', purchase_price: '', eol_date: '' });
    load();
  };

  const openEdit = (a: Asset) => {
    setEditAsset(a);
    setForm({
      name: a.name,
      description: a.description,
      category: a.category,
      serial_number: a.serial_number || '',
      purchase_date: a.purchase_date || '',
      purchase_price: a.purchase_price?.toString() || '',
      eol_date: a.eol_date || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this asset?')) return;
    await api.delete(`/assets/${id}`);
    load();
  };

  const openAssign = async (a: Asset) => {
    setAssignAsset(a);
    setAssignType('user');
    setSelectedUserId(null);
    setSelectedGroupId(null);
    setExpectedReturnDate('');
    setAssignNotes('');
    setAssignError('');
    setAssignSuccess('');
    setAssigning(false);
    try {
      const [usersRes, groupsRes] = await Promise.all([
        api.get('/auth/users'),
        api.get('/groups'),
      ]);
      setAvailableUsers(usersRes.data);
      setAvailableGroups(groupsRes.data);
    } catch {}
  };

  const closeAssign = () => {
    setAssignAsset(null);
  };

  const handleAssign = async () => {
    if (!assignAsset) return;
    setAssignError('');
    setAssignSuccess('');
    setAssigning(true);
    try {
      const body: any = { asset_id: assignAsset.id, notes: assignNotes };
      if (assignType === 'user') {
        if (!selectedUserId) throw new Error('Select a user');
        body.user_id = selectedUserId;
      } else {
        if (!selectedGroupId) throw new Error('Select a group');
        body.group_id = selectedGroupId;
      }
      if (expectedReturnDate) body.expected_return_date = expectedReturnDate;

      await api.post('/assignments', body);
      setAssignSuccess(`"${assignAsset.name}" assigned successfully`);
      load();
      setTimeout(() => closeAssign(), 1500);
    } catch (err: any) {
      setAssignError(err.response?.data?.detail || err.message || 'Assignment failed');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Assets</h1>
          <p className="page-subtitle">Manage your organization's assets</p>
        </div>
        {isAdmin && (
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditAsset(null);
              setForm({ name: '', description: '', category: '', serial_number: '', purchase_date: '', purchase_price: '', eol_date: '' });
              setShowForm(!showForm);
            }}
          >
            {showForm ? 'Cancel' : '+ Add Asset'}
          </button>
        )}
      </div>

      <div className="filters">
        <input className="input" placeholder="Search assets..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="available">Available</option>
          <option value="assigned">Assigned</option>
          <option value="retired">Retired</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </div>

      {showForm && (
        <form className="card form-card" onSubmit={handleSubmit}>
          <h3>{editAsset ? 'Edit Asset' : 'New Asset'}</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Name *</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Category *</label>
              <input className="input" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Serial Number</label>
              <input className="input" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Purchase Price</label>
              <input className="input" type="number" step="0.01" placeholder="0.00" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Purchase Date</label>
              <input className="input" type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label>End of Life Date</label>
              <input className="input" type="date" value={form.eol_date} onChange={(e) => setForm({ ...form, eol_date: e.target.value })} />
            </div>
          </div>
          <button type="submit" className="btn btn-primary">{editAsset ? 'Update' : 'Create'} Asset</button>
        </form>
      )}

      {/* Assign Modal */}
      {assignAsset && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
          }}
          onClick={closeAssign}
        >
          <div
            className="card"
            style={{ width: 480, maxWidth: '92%', maxHeight: '90vh', overflow: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>
              Assign Asset
            </h3>
            <p className="text-muted" style={{ marginBottom: 20, fontSize: 14 }}>
              {assignAsset.name} &middot; {assignAsset.category}
            </p>

            {assignError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{assignError}</div>}
            {assignSuccess && <div className="alert alert-success" style={{ marginBottom: 16 }}>{assignSuccess}</div>}

            <div className="form-group">
              <label>Assign to</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`btn btn-sm ${assignType === 'user' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setAssignType('user')}
                >
                  Person
                </button>
                <button
                  className={`btn btn-sm ${assignType === 'group' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setAssignType('group')}
                >
                  Group
                </button>
              </div>
            </div>

            {assignType === 'user' && (
              <div className="form-group">
                <label>Select Person</label>
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 4 }}>
                  {availableUsers.map((u) => (
                    <label
                      key={u.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', cursor: 'pointer', borderRadius: 6,
                        background: selectedUserId === u.id ? 'var(--primary-bg)' : 'transparent',
                      }}
                    >
                      <input
                        type="radio"
                        name="assignUser"
                        checked={selectedUserId === u.id}
                        onChange={() => setSelectedUserId(u.id)}
                      />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{u.username}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>{u.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {assignType === 'group' && (
              <div className="form-group">
                <label>Select Group</label>
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 4 }}>
                  {availableGroups.map((g) => (
                    <label
                      key={g.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', cursor: 'pointer', borderRadius: 6,
                        background: selectedGroupId === g.id ? 'var(--primary-bg)' : 'transparent',
                      }}
                    >
                      <input
                        type="radio"
                        name="assignGroup"
                        checked={selectedGroupId === g.id}
                        onChange={() => setSelectedGroupId(g.id)}
                      />
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 14 }}>{g.name}</div>
                        <div className="text-muted" style={{ fontSize: 12 }}>
                          {g.members?.length || 0} member{(g.members?.length || 0) !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </label>
                  ))}
                  {availableGroups.length === 0 && (
                    <div className="text-muted" style={{ padding: 16, textAlign: 'center', fontSize: 13 }}>
                      No groups available. Create one in Groups.
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Expected Return Date</label>
                <input className="input" type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea className="input" placeholder="Optional assignment notes..." value={assignNotes} onChange={(e) => setAssignNotes(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-outline" onClick={closeAssign}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleAssign}
                disabled={assigning || (assignType === 'user' && !selectedUserId) || (assignType === 'group' && !selectedGroupId)}
              >
                {assigning ? <span className="spinner" /> : null}
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Serial</th>
              <th>Status</th>
              <th>EOL Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const eolSoon = a.eol_date && new Date(a.eol_date) < new Date(Date.now() + 90 * 86400000) && a.status !== 'retired';
              return (
                <tr key={a.id} className={eolSoon ? 'row-warning' : ''}>
                  <td style={{ fontWeight: 500 }}>{a.name}</td>
                  <td><span className="badge badge-maintenance">{a.category}</span></td>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '13px' }}>{a.serial_number || '—'}</td>
                  <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                  <td>{a.eol_date || '—'}</td>
                  <td className="actions">
                    {isAdmin && a.status === 'available' && (
                      <button className="btn btn-sm btn-success" onClick={() => openAssign(a)}>Assign</button>
                    )}
                    <button className="btn btn-sm btn-ghost" onClick={() => openEdit(a)}>Edit</button>
                    {isAdmin && <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a.id)}>Delete</button>}
                  </td>
                </tr>
              );
            })}
            {assets.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-icon">&#9632;</div>
                    <p>No assets found. {search || filterStatus ? 'Try different filters.' : isAdmin ? 'Click "+ Add Asset" to get started.' : ''}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
