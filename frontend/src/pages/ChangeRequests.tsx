import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

interface CR {
  id: number;
  request_type: string;
  description: string;
  justification: string;
  status: string;
  created_at: string;
  asset: { id: number; name: string } | null;
  requester: { id: number; username: string };
  reviewer: { id: number; username: string } | null;
  review_notes: string;
}

export default function ChangeRequests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [requests, setRequests] = useState<CR[]>([]);
  const [filter, setFilter] = useState('');

  const load = () => {
    const params: any = {};
    if (filter) params.status = filter;
    api.get('/change-requests', { params }).then((r) => setRequests(r.data));
  };

  useEffect(() => { load(); }, [filter]);

  return (
    <div>
      <div className="page-header">
        <h1>Change Requests</h1>
        <button className="btn btn-primary" onClick={() => navigate('/change-requests/new')}>
          + New Request
        </button>
      </div>

      <div className="filters">
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
        </select>
      </div>

      {requests.map((cr) => (
        <div key={cr.id} className={`card request-card request-${cr.status}`}>
          <div className="request-header">
            <span className={`badge badge-${cr.status}`}>{cr.status}</span>
            <span className="request-type">{cr.request_type.replace('_', ' ')}</span>
            <span className="request-date">{new Date(cr.created_at).toLocaleDateString()}</span>
          </div>
          <p className="request-desc">{cr.description}</p>
          {cr.justification && <p className="request-just"><em>{cr.justification}</em></p>}
          <div className="request-meta">
            <span>By: {cr.requester?.username}</span>
            {cr.asset && <span>Asset: {cr.asset.name}</span>}
            {cr.reviewer && <span>Reviewed by: {cr.reviewer.username}</span>}
          </div>
          {cr.review_notes && <div className="alert alert-info">{cr.review_notes}</div>}
          {isAdmin && cr.status === 'pending' && (
            <div className="request-actions">
              <button className="btn btn-sm btn-success" onClick={async () => {
                await api.put(`/change-requests/${cr.id}/review`, { status: 'approved', review_notes: '' });
                load();
              }}>Approve</button>
              <button className="btn btn-sm btn-danger" onClick={async () => {
                const notes = prompt('Reason for denial:');
                if (notes !== null) {
                  await api.put(`/change-requests/${cr.id}/review`, { status: 'denied', review_notes: notes });
                  load();
                }
              }}>Deny</button>
            </div>
          )}
        </div>
      ))}
      {requests.length === 0 && <p className="text-center">No change requests found.</p>}
    </div>
  );
}
