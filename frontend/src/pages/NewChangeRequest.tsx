import { useEffect, useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

interface Asset {
  id: number;
  name: string;
}

export default function NewChangeRequest() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState({ request_type: 'assign', asset_id: '', description: '', justification: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/assets').then((r) => setAssets(r.data));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/change-requests', {
        ...form,
        asset_id: form.asset_id ? parseInt(form.asset_id) : null,
      });
      navigate('/change-requests');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create request');
    }
  };

  return (
    <div>
      <h1>New Change Request</h1>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card form-card" onSubmit={handleSubmit}>
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
        <div className="form-group">
          <label>Description *</label>
          <textarea className="input" required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the change you need..." />
        </div>
        <div className="form-group">
          <label>Justification</label>
          <textarea className="input" rows={2} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} placeholder="Why is this change needed?" />
        </div>
        <button type="submit" className="btn btn-primary">Submit Request</button>
      </form>
    </div>
  );
}
