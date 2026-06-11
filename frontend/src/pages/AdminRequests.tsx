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

  const load = () => {
    const params: any = {};
    if (filter) params.status = filter;
    api.get('/change-requests', { params }).then((r) => setRequests(r.data));
  };

  useEffect(() => { load(); }, [filter]);

  const handleReview = async (id: number, status: 'approved' | 'denied') => {
    const notes = reviewNotes[id] || '';
    if (status === 'denied' && !notes) {
      const input = prompt('Reason for denial:');
      if (!input) return;
      await api.put(`/change-requests/${id}/review`, { status, review_notes: input });
    } else {
      await api.put(`/change-requests/${id}/review`, { status, review_notes: notes });
    }
    setReviewNotes((prev) => ({ ...prev, [id]: '' }));
    load();
  };

  return (
    <div>
      <h1>Admin Panel</h1>
      <div className="filters">
        <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="denied">Denied</option>
          <option value="">All</option>
        </select>
      </div>

      {requests.map((cr) => (
        <div key={cr.id} className={`card request-card request-${cr.status}`}>
          <div className="request-header">
            <span className={`badge badge-${cr.status}`}>{cr.status}</span>
            <span className="request-type">{cr.request_type.replace('_', ' ')}</span>
            <span className="request-date">{new Date(cr.created_at).toLocaleDateString()}</span>
          </div>
          <p><strong>{cr.requester?.username}</strong> requested:</p>
          <p className="request-desc">{cr.description}</p>
          {cr.justification && <p className="request-just"><em>Justification: {cr.justification}</em></p>}
          {cr.asset && <p>Asset: {cr.asset.name}</p>}

          {cr.status === 'pending' && (
            <div className="review-box">
              <textarea
                className="input"
                rows={2}
                placeholder="Review notes (optional)"
                value={reviewNotes[cr.id] || ''}
                onChange={(e) => setReviewNotes((prev) => ({ ...prev, [cr.id]: e.target.value }))}
              />
              <div className="request-actions">
                <button className="btn btn-sm btn-success" onClick={() => handleReview(cr.id, 'approved')}>Approve</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleReview(cr.id, 'denied')}>Deny</button>
              </div>
            </div>
          )}
          {cr.reviewer && (
            <p className="text-muted">Reviewed by {cr.reviewer.username}: {cr.review_notes || '(no notes)'}</p>
          )}
        </div>
      ))}
      {requests.length === 0 && <p className="text-center">No requests found.</p>}
    </div>
  );
}
