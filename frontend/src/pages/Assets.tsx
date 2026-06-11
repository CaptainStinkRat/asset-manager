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

export default function Assets() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [assets, setAssets] = useState<Asset[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editAsset, setEditAsset] = useState<Asset | null>(null);
  const [form, setForm] = useState({ name: '', description: '', category: '', serial_number: '', purchase_date: '', purchase_price: '', eol_date: '' });

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

  return (
    <div>
      <div className="page-header">
        <h1>Assets</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setEditAsset(null); setForm({ name: '', description: '', category: '', serial_number: '', purchase_date: '', purchase_price: '', eol_date: '' }); setShowForm(!showForm); }}>
            {showForm ? 'Cancel' : '+ Add Asset'}
          </button>
        )}
      </div>

      <div className="filters">
        <input className="input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
              <input className="input" type="number" step="0.01" value={form.purchase_price} onChange={(e) => setForm({ ...form, purchase_price: e.target.value })} />
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
                <td>{a.name}</td>
                <td>{a.category}</td>
                <td>{a.serial_number || '-'}</td>
                <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                <td>{a.eol_date || '-'}</td>
                <td className="actions">
                  <button className="btn btn-sm btn-outline" onClick={() => openEdit(a)}>Edit</button>
                  {isAdmin && <button className="btn btn-sm btn-danger" onClick={() => handleDelete(a.id)}>Delete</button>}
                </td>
              </tr>
            );
          })}
          {assets.length === 0 && (
            <tr><td colSpan={6} className="text-center">No assets found</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
