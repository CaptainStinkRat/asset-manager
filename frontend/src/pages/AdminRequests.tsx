import { useEffect, useState } from 'react';
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

export default function AdminRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CR[]>([]);
  const [filter, setFilter] = useState('pending');
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});

  const load = () => {
    const params: any = {};
    if (filter) params.status = filter;
    api.get('/change-requests', { params }).then((r) => setRequests(r.data));
  };

  useEffect(() => { load(); }, [filter]);

  const handleReview = async (id: number, status: 'approved' | 'denied') => {
    const notes = reviewNotes[id] || '';
    if (status === 'denied' && !notes) {
      const input = prompt('Please provide a reason for denial:');
      if (!input) return;
      setLoading((prev) => ({ ...prev, [id]: true }));
      await api.put(`/change-requests/${id}/review`, { status, review_notes: input });
    } else {
      setLoading((prev) => ({ ...prev, [id]: true }));
      await api.put(`/change-requests/${id}/review`, { status, review_notes: notes });
    }
    setLoading((prev) => ({ ...prev, [id]: false }));
    setReviewNotes((prev) => ({ ...prev, [id]: '' }));
    load();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Admin Panel</h1>
          <p className="page-subtitle">Review and manage change requests</p>
        </div>
      </div>

      <div className="filters">
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="">All</option>
        </select>
      </div>

      {requests.length === 0 && (
        <div className="card empty-state">
          <div className="empty-icon">&#9888;</div>
          <p>No {filter || ''} requests found.</p>
        </div>
      )}

      {requests.map((cr) => (
        <div key={cr.id} className={`card request-card request-${cr.status}`}>
          <div className="request-header">
            <span className={`badge badge-${cr.status}`}>{cr.status}</span>
            <span className="request-type">{cr.request_type.replace(/_/g, ' ')}</span>
            <span className="request-date">{new Date(cr.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
          <p><strong>{cr.requester?.username}</strong> requested:</p>
          <p className="request-desc">{cr.description}</p>
          {cr.justification && <p className="request-just">"{cr.justification}"</p>}
          {cr.asset && (
            <div className="request-meta">
              <span>Asset: <strong>{cr.asset.name}</strong></span>
            </div>
          )}

          {cr.status === 'pending' && (
            <div className="review-box">
              <textarea
                className="input"
                rows={2}
                placeholder="Add review notes (optional)"
                value={reviewNotes[cr.id] || ''}
                onChange={(e) => setReviewNotes((prev) => ({ ...prev, [cr.id]: e.target.value }))}
              />
              <div className="request-actions">
                <button
                  className="btn btn-sm btn-success"
                  disabled={loading[cr.id]}
                  onClick={() => handleReview(cr.id, 'approved')}
                >
                  {loading[cr.id] ? '...' : '\u2713 Approve'}
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  disabled={loading[cr.id]}
                  onClick={() => handleReview(cr.id, 'denied')}
                >
                  {loading[cr.id] ? '...' : '\u2717 Deny'}
                </button>
              </div>
            </div>
          )}
          {cr.reviewer && (
            <p className="text-muted" style={{ marginTop: '8px' }}>
              Reviewed by <strong>{cr.reviewer.username}</strong>: {cr.review_notes || '(no notes)'}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
