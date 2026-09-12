import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Icon from '../components/Icon';
import Btn from '../components/Btn';

const Contact = ({ go, onNotify }) => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      if (onNotify) onNotify('Please fill out all fields.', 'error');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'contacts'), {
        ...formData,
        createdAt: new Date().toISOString()
      });
      if (onNotify) onNotify('Message sent! We will get back to you shortly.');
      setFormData({ name: '', email: '', message: '' });
      setTimeout(() => go('landing'), 2000);
    } catch (error) {
      console.error('Error submitting contact form: ', error);
      if (onNotify) onNotify('Error submitting the form. Try again later.', 'error');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', paddingTop: 80, paddingBottom: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'var(--s0)', padding: '80px 20px 40px' }}>
      
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center', marginBottom: 40 }}>
        <p className="eyebrow ru" style={{ marginBottom: 16 }}>Talk to us</p>
        <h1 className="ru d1" style={{ fontSize: 'clamp(2.5rem,5vw,3.5rem)', fontWeight: 800, letterSpacing: '-.05em', lineHeight: 1.05, marginBottom: 16 }}>
          How can we help?
        </h1>
        <p className="ru d2" style={{ color: 'var(--ts)', fontSize: '1rem', lineHeight: 1.6 }}>
          Have a question about Resumeeit? Found a bug? Let us know below.
        </p>
      </div>

      <div className="card ru grain d3" style={{ maxWidth: 520, width: '100%', padding: '40px 32px', borderRadius: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.06)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--ts)', textTransform: 'uppercase', marginBottom: 8 }}>Name</label>
            <input 
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Steve Jobs"
              className="inp" 
              style={{ background: 'var(--s1)', padding: '14px 16px', fontSize: '.95rem', borderRadius: 14 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--ts)', textTransform: 'uppercase', marginBottom: 8 }}>Email</label>
            <input 
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="steve@apple.com"
              className="inp" 
              style={{ background: 'var(--s1)', padding: '14px 16px', fontSize: '.95rem', borderRadius: 14 }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: 'var(--ts)', textTransform: 'uppercase', marginBottom: 8 }}>Message</label>
            <textarea 
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us what you need help with..."
              className="inp" 
              rows={5}
              style={{ background: 'var(--s1)', padding: '16px', fontSize: '.95rem', borderRadius: 14, resize: 'vertical' }}
            />
          </div>

          <Btn v="dark" sz="lg" full pill disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Sending...' : 'Send Message'} <Icon id="arrow" size={14} color="white" />
          </Btn>
          
        </form>
      </div>
    </div>
  );
};

export default Contact;
