import { useState } from 'react';
import { uploadResume } from '../services/api';

export default function ResumeUpload({ onComplete }) {
  const [file, setFile] = useState(null);
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => setFile(e.target.files[0]);
  const handleRoleChange = (e) => setRole(e.target.value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !role) {
      setError('Please provide both a resume and a target role.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const data = await uploadResume(file, role);
      if (data.error) throw new Error(data.error);
      onComplete(data);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ maxWidth: '600px', margin: '10vh auto' }}>
      <h2>Ready to ace your interview? 🚀</h2>
      <p>Upload your resume and tell us your target role. Our AI will tailor the questions specifically for you.</p>
      
      <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Target Role</label>
          <input 
            type="text" 
            placeholder="e.g. Senior Frontend Developer" 
            value={role}
            onChange={handleRoleChange}
          />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Resume (PDF)</label>
          <input 
            type="file" 
            accept=".pdf"
            onChange={handleFileChange}
          />
        </div>

        {error && <p style={{ color: '#ef4444' }}>{error}</p>}

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? <span className="loading-spinner"></span> : 'Start Interview'}
        </button>
      </form>
    </div>
  );
}
