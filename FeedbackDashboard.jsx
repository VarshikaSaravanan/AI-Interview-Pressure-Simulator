export default function FeedbackDashboard({ feedbackData, onRestart }) {
  return (
    <div className="glass-panel" style={{ maxWidth: '800px', margin: '5vh auto' }}>
      <h2>Interview Feedback & Analytics 📊</h2>
      
      <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '2rem', borderRadius: '16px', marginTop: '2rem' }}>
        <h3 style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>Overall Evaluation</h3>
        <div style={{ marginTop: '1.5rem', whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
          {feedbackData.split('\n').map((line, idx) => {
            if (line.toLowerCase().includes('score')) {
              return <p key={idx} style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#60a5fa' }}>{line}</p>;
            }
            if (line.toLowerCase().includes('strength') || line.toLowerCase().includes('improve') || line.toLowerCase().includes('recommendation')) {
              return <h4 key={idx} style={{ marginTop: '1rem', color: '#c084fc' }}>{line}</h4>;
            }
            return <p key={idx}>{line}</p>;
          })}
        </div>
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button onClick={onRestart} className="btn-primary" style={{ maxWidth: '250px' }}>
          Start Another Interview
        </button>
      </div>
    </div>
  );
}
