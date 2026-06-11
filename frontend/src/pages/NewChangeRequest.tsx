import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

interface Asset {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
  email: string;
}

interface Group {
  id: number;
  name: string;
  members: { id: number }[];
}

const TARGET_TYPES = ['assign', 'transfer'];

export default function NewChangeRequest() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [form, setForm] = useState({ request_type: 'assign', asset_id: '', target_user_id: '', target_group_id: '', description: '', justification: '' });
  const [targetType, setTargetType] = useState<'user' | 'group'>('user');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/assets'),
      api.get('/auth/users'),
      api.get('/groups'),
    ]).then(([a, u, g]) => {
      setAssets(a.data);
      setUsers(u.data);
      setGroups(g.data);
    });
  }, []);

  const needsTarget = TARGET_TYPES.includes(form.request_type);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const body: any = { ...form };
      body.asset_id = form.asset_id ? parseInt(form.asset_id) : null;
      body.target_user_id = form.target_user_id ? parseInt(form.target_user_id) : null;
      body.target_group_id = form.target_group_id ? parseInt(form.target_group_id) : null;
      delete body.target_user_id_clear;
      await api.post('/change-requests', body);
      navigate('/change-requests');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create request');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>New Change Request</h1>
          <p className="page-subtitle">Submit a request for a change to be reviewed by an admin</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="card form-card" onSubmit={handleSubmit} style={{ maxWidth: '640px' }}>
        <div className="form-group">
          <label>Request Type</label>
          <select className="input" value={form.request_type} onChange={(e) => setForm({ ...form, request_type: e.target.value })}>
            <option value="assign">Assign Asset</option>
            <option value="return">Return Asset</option>
            <option value="transfer">Transfer Asset</option>
            <option value="maintenance">Maintenance</option>
            <option value="retire">Retire Asset</option>
            <option value="eol_extension">EOL Extension</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Related Asset (optional)</label>
          <select className="input" value={form.asset_id} onChange={(e) => setForm({ ...form, asset_id: e.target.value })}>
            <option value="">None</option>
            {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        {needsTarget && (
          <>
            <div className="form-group">
              <label>Assign to</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className={`btn btn-sm ${targetType === 'user' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTargetType('user')}>
                  Person
                </button>
                <button type="button" className={`btn btn-sm ${targetType === 'group' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTargetType('group')}>
                  Group
                </button>
              </div>
            </div>

            {targetType === 'user' && (
              <div className="form-group">
                <label>Select Person</label>
                <select className="input" value={form.target_user_id} onChange={(e) => setForm({ ...form, target_user_id: e.target.value, target_group_id: '' })}>
                  <option value="">Choose a person...</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.username} ({u.email})</option>)}
                </select>
              </div>
            )}

            {targetType === 'group' && (
              <div className="form-group">
                <label>Select Group</label>
                <select className="input" value={form.target_group_id} onChange={(e) => setForm({ ...form, target_group_id: e.target.value, target_user_id: '' })}>
                  <option value="">Choose a group...</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.members?.length || 0} members)</option>)}
                </select>
              </div>
            )}
          </>
        )}

        <div className="form-group">
          <label>Description *</label>
          <textarea
            className="input"
            required
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Describe the change you need..."
          />
        </div>
        <div className="form-group">
          <label>Justification</label>
          <textarea
            className="input"
            rows={2}
            value={form.justification}
            onChange={(e) => setForm({ ...form, justification: e.target.value })}
            placeholder="Why is this change needed? Provide context for the admin reviewing this request."
          />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="submit" className="btn btn-primary">Submit Request</button>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/change-requests')}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
