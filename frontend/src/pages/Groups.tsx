import { useEffect, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface User {
  id: number;
  username: string;
  email: string;
}

interface Group {
  id: number;
  name: string;
  description: string;
  created_at: string;
  members: User[];
}

export default function Groups() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [form, setForm] = useState({ name: '', description: '', member_ids: [] as number[] });
  const [error, setError] = useState('');

  const load = () => {
    api.get('/groups').then((r) => setGroups(r.data));
    if (isAdmin) {
      api.get('/auth/users').then((r) => setAllUsers(r.data));
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditGroup(null);
    setForm({ name: '', description: '', member_ids: [] });
    setShowForm(true);
    setError('');
  };

  const openEdit = (g: Group) => {
    setEditGroup(g);
    setForm({ name: g.name, description: g.description, member_ids: g.members.map((m) => m.id) });
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editGroup) {
        await api.put(`/groups/${editGroup.id}`, form);
      } else {
        await api.post('/groups', form);
      }
      setShowForm(false);
      setEditGroup(null);
      setForm({ name: '', description: '', member_ids: [] });
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save group');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this group?')) return;
    await api.delete(`/groups/${id}`);
    load();
  };

  const toggleMember = (uid: number) => {
    setForm((f) => ({
      ...f,
      member_ids: f.member_ids.includes(uid)
        ? f.member_ids.filter((id) => id !== uid)
        : [...f.member_ids, uid],
    }));
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Groups</h1>
          <p className="page-subtitle">Manage teams and group assignments</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreate}>
            {showForm ? 'Cancel' : '+ New Group'}
          </button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {showForm && isAdmin && (
        <form className="card form-card" onSubmit={handleSubmit}>
          <h3>{editGroup ? 'Edit Group' : 'New Group'}</h3>
          <div className="form-group">
            <label>Name *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Members</label>
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 8 }}>
              {allUsers.length === 0 && <span className="text-muted">No users available</span>}
              {allUsers.map((u) => (
                <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', cursor: 'pointer', borderRadius: 6 }}>
                  <input type="checkbox" checked={form.member_ids.includes(u.id)} onChange={() => toggleMember(u.id)} />
                  <span style={{ fontWeight: 500, fontSize: 14 }}>{u.username}</span>
                  <span className="text-muted" style={{ fontSize: 12 }}>({u.email})</span>
                </label>
              ))}
            </div>
          </div>
          <button type="submit" className="btn btn-primary">{editGroup ? 'Update' : 'Create'} Group</button>
        </form>
      )}

      {groups.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">&#9641;</div>
          <p>No groups yet. {isAdmin ? 'Click "+ New Group" to create one.' : ''}</p>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.id} className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>{g.name}</h3>
              {g.description && <p className="text-muted" style={{ marginTop: 4 }}>{g.description}</p>}
            </div>
            {isAdmin && (
              <div className="actions">
                <button className="btn btn-sm btn-ghost" onClick={() => openEdit(g)}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(g.id)}>Delete</button>
              </div>
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <span className="text-muted" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Members ({g.members.length})
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {g.members.length === 0 && <span className="text-muted" style={{ fontSize: 13 }}>No members</span>}
              {g.members.map((m) => (
                <span key={m.id} className="badge badge-available" style={{ fontSize: 12 }}>
                  {m.username}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
