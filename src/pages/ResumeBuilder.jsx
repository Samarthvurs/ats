import { useState } from 'react';
import { jsPDF } from 'jspdf';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import Icon from '../components/Icon';
import Btn from '../components/Btn';

const STEPS = ['Personal', 'Education', 'Experience', 'Projects/Hackathons', 'Skills', 'AI Review & ATS Scan'];
const COUNTRIES = ['India', 'USA', 'UK', 'Australia', 'UAE', 'Singapore', 'Germany', 'France', 'Japan', 'Canada'];
const PREFIXES = ['+91', '+1', '+44', '+61', '+971', '+65', '+49', '+33', '+81', '+7', '+86'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = Array.from({ length: 40 }, (_, i) => 2030 - i);
const POPULAR_SKILLS = ['React', 'Node.js', 'Python', 'Java', 'AWS', 'Docker', 'SQL', 'Git', 'C++', 'Firebase', 'TypeScript', 'MongoDB', 'PostgreSQL', 'Redux', 'Tailwind', 'Next.js'];
const ROLES = ['Software Engineer', 'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Scientist', 'UI/UX Designer', 'Product Manager', 'Mobile App Developer', 'Cybersecurity Analyst', 'DevOps Engineer', 'AI/ML Engineer', 'Student', 'Intern', 'Business Analyst', 'QA Engineer'];
const COLLEGES = [
  'Indian Institute of Technology (IIT) Bombay', 'Indian Institute of Technology (IIT) Delhi', 'Indian Institute of Technology (IIT) Madras',
  'Indian Institute of Technology (IIT) Kharagpur', 'Indian Institute of Technology (IIT) Kanpur', 'Indian Institute of Technology (IIT) Roorkee',
  'National Institute of Technology (NIT) Trichy', 'National Institute of Technology (NIT) Surathkal', 'BITS Pilani', 'Delhi Technological University (DTU)', 
  'Manipal Institute of Technology', 'VIT Vellore', 'SRM Institute of Science and Technology', 'Stanford University', 'MIT', 'Harvard University', 
  'NPS', 'Delhi Public School (DPS)', 'The Shri Ram School', 'Amity University'
];

const analyzeResume = (d) => {
  let report = { header: 0, skills: 0, experience: 0, formatting: 0, impact: 0 };
  const userSkills = d.skills.toLowerCase().split(',').map(s => s.trim()).filter(s => s);
  
  // 1. Header & Formatting (20)
  if (d.linkedin) report.header += 5;
  if (d.github) report.header += 5;
  if (d.email && d.phonePrefix) report.header += 5;
  if (d.city) report.header += 5;
  report.formatting = 20; // Default high for our templates

  // 2. Skills & Keywords (20)
  report.skills = Math.min(20, userSkills.length * 2);

  // 3. Experience & Impact (60)
  const allText = [...d.experience.map(e => e.desc), ...d.projects.map(p => p.desc)].join(' ').toLowerCase();
  const verbs = ['developed', 'built', 'led', 'improved', 'optimized', 'spearheaded', 'managed', 'designed', 'automated'];
  const hasNumbers = /\d+%|\d+\s|\d+k/i.test(allText);
  const verbCount = verbs.filter(v => allText.includes(v)).length;
  
  report.experience = Math.min(30, verbCount * 5);
  report.impact = hasNumbers ? 30 : 10;

  const score = report.header + report.skills + report.experience + report.impact;

  // AI-Powered Insights
  const jdKeywords = d.targetJD ? d.targetJD.toLowerCase().match(/\b(\w+)\b/g).filter(w => w.length > 4) : [];
  const missingKeywords = jdKeywords.filter(k => !allText.includes(k) && !userSkills.includes(k)).slice(0, 5);
  const matchScore = d.targetJD ? Math.round((jdKeywords.filter(k => allText.includes(k)).length / Math.max(1, jdKeywords.length)) * 100) : null;

  const priorityFixes = [];
  if (!hasNumbers) priorityFixes.push("Add quantifiable metrics (%, numbers) to results.");
  if (verbCount < 4) priorityFixes.push("Use stronger action verbs to describe your impact.");
  if (userSkills.length < 8) priorityFixes.push("Expand your tech stack section with more core skills.");

  const strength = score > 85 ? 'Interview Ready' : score > 70 ? 'Strong' : score > 50 ? 'Average' : 'Beginner';

  return {
    score,
    report,
    matchScore,
    missingKeywords,
    priorityFixes,
    quickWins: ["Bold key technologies", "Clean up role titles"],
    strength,
    suggestions: {
      technical: POPULAR_SKILLS.slice(0, 10),
      tools: ['Docker', 'AWS', 'Jira', 'Postman', 'Git'],
      bonus: ['Agile', 'Unit Testing', 'System Design']
    },
    bulletEnhancements: d.experience.slice(0, 2).map(e => ({
      original: e.desc,
      improved1: "Spearheaded " + e.desc.replace(/i /i, ''),
      improved2: "Optimized " + e.desc + " resulting in 20% efficiency gain."
    }))
  };
};

const ResumeBuilder = ({ go, user }) => {
  const [step, setStep] = useState(0);
  const [isATSMode, setIsATSMode] = useState(false);
  const [data, setData] = useState({
    name: '', title: '', 
    targetRole: '', targetJD: '',
    email: '', 
    phonePrefix: '+91', phoneNumber: '', 
    country: 'India', city: '',
    linkedin: '', github: '',
    photo: null, bio: '',
    education: [{ school: '', degree: '', startMonth: 'Jan', startYear: '2024', endMonth: 'Dec', endYear: '2028', gpa: '' }],
    experience: [{ role: '', company: '', startMonth: 'Jan', startYear: '2024', endMonth: 'Present', endYear: '', desc: '' }],
    projects: [],
    skills: '',
    languages: '',
    interests: '',
  });

  const update = (key, val) => setData(prev => ({ ...prev, [key]: val }));

  const addItem = (listKey, item) => {
    setData(prev => ({ ...prev, [listKey]: [...prev[listKey], item] }));
  };

    const toggleSkill = (s) => {
      const current = data.skills.split(',').map(x => x.trim()).filter(x => x);
      if (current.includes(s)) {
        update('skills', current.filter(x => x !== s).join(', '));
      } else {
        update('skills', [...current, s].join(', '));
      }
    };

  const updateItem = (listKey, index, key, val) => {
    const list = [...data[listKey]];
    list[index][key] = val;
    setData(prev => ({ ...prev, [listKey]: list }));
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = 210;
    const pageHeight = 297;
    const sidebarWidth = 65;
    const coffeeColor = [230, 213, 201]; // #E6D5C9
    const darkColor = [26, 26, 26];

    // 1. Draw Background Shapes
    // Header background
    doc.setFillColor(...coffeeColor);
    doc.rect(0, 0, pageWidth, 80, 'F');
    // Sidebar background (optional, but in image it looks mostly white with elements on left)
    // Actually the image has a beige top section and then white below.
    
    // 2. Profile Photo (Circle)
    if (data.photo) {
        doc.addImage(data.photo, 'JPEG', pageWidth/2 - 25, 30, 50, 50, undefined, 'FAST');
        // Mask as circle would require more complex logic, we'll use a simple square image for now or use doc.circle if we had a clipping path.
    } else {
        doc.setDrawColor(255);
        doc.setFillColor(245, 245, 245);
        doc.circle(pageWidth/2, 55, 25, 'FD');
    }

    // 3. Header Text
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    const nameStr = data.name.trim() || "YOUR NAME";
    doc.text(nameStr.toUpperCase(), pageWidth/2, 15, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    const titleStr = data.title.trim() || "Your Professional Role";
    doc.text(titleStr, pageWidth/2, 24, { align: "center" });

    // 4. Contact Info (Right side of photo)
    doc.setFontSize(9);
    doc.text(`${data.phonePrefix} ${data.phoneNumber || '000 000 0000'}`, 150, 42);
    doc.text(data.email || 'your.email@example.com', 150, 48);
    doc.text(`${data.city || 'City'}, ${data.country}`, 150, 54);
    if (data.linkedin) doc.text(data.linkedin.replace('linkedin.com/in/', 'li/'), 150, 60);
    if (data.github) doc.text(data.github.replace('github.com/', 'gh/'), 150, 66);

    // 5. Left Column (Bio, Skills, Languages, Interests)
    let y = 100;
    const leftX = 15;
    const colWidth = 55;

    // Bio
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    const bioStr = data.bio.trim() || "A brief summary of your professional journey and key impact areas goes here. Focus on your most relevant achievements and goals.";
    const bioLines = doc.splitTextToSize(bioStr, colWidth);
    doc.text(bioLines, leftX, y);
    y += (bioLines.length * 4.5) + 15;

    // Skills
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("SKILLS", leftX, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    data.skills.split(',').forEach(s => {
        if (s.trim()) {
            doc.text("• " + s.trim(), leftX, y);
            y += 5;
        }
    });
    y += 10;

    // Languages
    doc.setFont("helvetica", "bold");
    doc.text("LANGUAGES", leftX, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    data.languages.split(',').forEach(l => {
        if (l.trim()) {
            doc.text(l.trim(), leftX, y);
            doc.setFillColor(...coffeeColor);
            doc.rect(leftX + 25, y - 3, 20, 2, 'F'); 
            y += 7;
        }
    });
    y += 10;

    // Interests
    doc.setFont("helvetica", "bold");
    doc.text("INTERESTS", leftX, y);
    y += 7;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    data.interests.split(',').forEach(i => {
        if (i.trim()) {
            doc.text("• " + i.trim(), leftX, y);
            y += 5;
        }
    });

    // 6. Right Column (Education, Experience)
    y = 100;
    const rightX = 85;
    const rightWidth = 110;

    // Education
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("EDUCATION", rightX, y);
    y += 10;
    data.education.forEach(ed => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`${ed.degree} | ${ed.school}`, rightX, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text(`${ed.startMonth} ${ed.startYear} - ${ed.endMonth} ${ed.endYear}`, rightX, y);
        y += 5;
        doc.setTextColor(...darkColor);
        const edDesc = doc.splitTextToSize(ed.gpa ? `GPA: ${ed.gpa}` : "Intensive course results.", rightWidth);
        doc.text(edDesc, rightX, y);
        y += (edDesc.length * 4.5) + 8;
    });
    y += 10;

    // Experience
    doc.setFont("helvetica", "bold");
    doc.text("EXPERIENCE", rightX, y);
    y += 10;
    data.experience.forEach(exp => {
        doc.setFont("helvetica", "bold");
        doc.text(`${exp.role} | ${exp.company}`, rightX, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text(`${exp.startMonth} ${exp.startYear} - ${exp.endMonth} ${exp.endYear}`, rightX, y);
        y += 5;
        doc.setTextColor(...darkColor);
        const expDesc = doc.splitTextToSize(exp.desc, rightWidth);
        doc.text(expDesc, rightX, y);
        y += (expDesc.length * 4.5) + 8;
    });

    doc.save(`${data.name}_Resume.pdf`);
    saveToDashboard(`${data.name}_Resume.pdf`);
  };

  const saveToDashboard = (filename) => {
    if (!user) return;
    const ai = analyzeResume(data);
    addDoc(collection(db, 'users', user.uid, 'scans'), {
      name: filename,
      score: ai.score,
      ats: ai.report.header + ai.report.skills,
      keyword: ai.report.skills * 2,
      formatting: ai.report.formatting * 2,
      impact: ai.report.experience + ai.report.impact,
      risk: ai.score > 70 ? 'Low Risk' : 'Medium Risk',
      date: new Date().toISOString()
    }).catch(e => console.error("Error saving build:", e));
  };

  const renderForm = () => {
    switch(step) {
      case 0: return (
        <div className="rf">
          <div className="avatar-upload-container rf">
            {data.photo ? (
              <img src={data.photo} className="avatar-preview" alt="Avatar" />
            ) : (
              <div className="avatar-preview" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon id="user" size={32} color="var(--ts)" />
              </div>
            )}
            <div className="avatar-controls">
              <label className="rb-label" style={{ marginBottom: 2 }}>Profile Photo</label>
              <p className="avatar-hint">JPG, PNG or GIF. Max 1MB.</p>
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <Btn v="ghost" sz="xs" pill onClick={() => document.getElementById('photo-inp').click()}>
                  {data.photo ? 'Change Photo' : 'Upload Photo'}
                </Btn>
                {data.photo && (
                  <Btn v="ghost" sz="xs" pill onClick={() => update('photo', null)}>Remove</Btn>
                )}
              </div>
              <input 
                id="photo-inp" type="file" accept="image/*" hidden
                onChange={e => {
                  const reader = new FileReader();
                  reader.onload = (ev) => update('photo', ev.target.result);
                  if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
                }} 
              />
            </div>
          </div>

          <div className="rb-form-row">
            <div className="rb-form-group">
              <label className="rb-label">Full Name</label>
              <div className="rb-input-wrapper">
                <div className="rb-input-icon"><Icon id="user" size={16} /></div>
                <input className="inp rb-input-with-icon" value={data.name} onChange={e => update('name', e.target.value)} placeholder="e.g. John Doe" />
              </div>
            </div>
            <div className="rb-form-group">
              <label className="rb-label">Current Role</label>
              <div className="rb-input-wrapper">
                <div className="rb-input-icon"><Icon id="briefcase" size={16} /></div>
                <input className="inp rb-input-with-icon" value={data.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Software Engineer" list="roles-list" />
                <datalist id="roles-list">
                  {ROLES.map(r => <option key={r} value={r} />)}
                </datalist>
              </div>
            </div>
          </div>

          <div className="rb-form-row">
            <div className="rb-form-group">
              <label className="rb-label">Target Role (Optional)</label>
              <div className="rb-input-wrapper">
                <div className="rb-input-icon"><Icon id="target" size={16} /></div>
                <input className="inp rb-input-with-icon" value={data.targetRole} onChange={e => update('targetRole', e.target.value)} placeholder="e.g. Senior Frontend Engineer" list="roles-list" />
              </div>
            </div>
            <div className="rb-form-group">
              <label className="rb-label">Target Job Description (Optional)</label>
              <textarea className="inp" style={{ height: 42, minHeight: 42, fontSize: '.8rem', padding: '10px 16px' }} value={data.targetJD} onChange={e => update('targetJD', e.target.value)} placeholder="Paste JD for AI Match..." />
            </div>
          </div>

          <div className="rb-form-full">
            <label className="rb-label">Mission / Professional Bio</label>
            <textarea className="inp" style={{ height: 100, lineHeight: 1.6 }} value={data.bio} onChange={e => update('bio', e.target.value)} placeholder="Briefly describe your goals and impact..." />
          </div>

          <div className="rb-form-row">
            <div className="rb-form-group">
              <label className="rb-label">Email Address</label>
              <div className="rb-input-wrapper">
                <div className="rb-input-icon"><Icon id="mail" size={16} /></div>
                <input className="inp rb-input-with-icon" value={data.email} onChange={e => update('email', e.target.value)} placeholder="email@example.com" />
              </div>
            </div>
            <div className="rb-form-group">
              <label className="rb-label">Phone Number</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <select className="inp" style={{ width: 85, padding: '0 12px' }} value={data.phonePrefix} onChange={e => update('phonePrefix', e.target.value)}>
                  {PREFIXES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="rb-input-wrapper" style={{ flex: 1 }}>
                  <div className="rb-input-icon"><Icon id="phone" size={16} /></div>
                  <input className="inp rb-input-with-icon" value={data.phoneNumber} onChange={e => update('phoneNumber', e.target.value)} placeholder="000 000 000" />
                </div>
              </div>
            </div>
          </div>

          <div className="rb-form-row">
            <div className="rb-form-group">
              <label className="rb-label">Location (Country)</label>
              <div className="rb-input-wrapper">
                <div className="rb-input-icon"><Icon id="globe" size={16} /></div>
                <select className="inp rb-input-with-icon" value={data.country} onChange={e => update('country', e.target.value)}>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="rb-form-group">
              <label className="rb-label">City, State</label>
              <input className="inp" value={data.city} onChange={e => update('city', e.target.value)} placeholder="e.g. New York, NY" />
            </div>
          </div>

          <div className="rb-form-row" style={{ marginBottom: 0 }}>
            <div className="rb-form-group">
              <label className="rb-label">LinkedIn Profile</label>
              <div className="rb-input-wrapper">
                <div className="rb-input-icon"><Icon id="linkedin" size={16} color="#0077b5" /></div>
                <input className="inp rb-input-with-icon" value={data.linkedin} onChange={e => update('linkedin', e.target.value)} placeholder="linkedin.com/in/username" />
              </div>
            </div>
            <div className="rb-form-group">
              <label className="rb-label">GitHub Portfolio</label>
              <div className="rb-input-wrapper">
                <div className="rb-input-icon"><Icon id="github" size={16} color="#333" /></div>
                <input className="inp rb-input-with-icon" value={data.github} onChange={e => update('github', e.target.value)} placeholder="github.com/username" />
              </div>
            </div>
          </div>
        </div>
      );
      case 1: return (
        <div className="rf" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {data.education.map((ed, i) => (
            <div key={i} className="rb-card rf">
              <div className="rb-form-row">
                <div className="rb-form-group">
                  <label className="rb-label">University / Institution</label>
                  <input className="inp" value={ed.school} onChange={e => updateItem('education', i, 'school', e.target.value)} placeholder="e.g. Stanford University" list="colleges-list" />
                  <datalist id="colleges-list">
                    {COLLEGES.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="rb-form-group">
                  <label className="rb-label">Degree / Field of Study</label>
                  <input className="inp" value={ed.degree} onChange={e => updateItem('education', i, 'degree', e.target.value)} placeholder="e.g. BS in Computer Science" />
                </div>
              </div>
              <div className="rb-form-row" style={{ marginBottom: 0 }}>
                <div className="rb-form-group">
                  <label className="rb-label">Start Date</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="inp sz-sm" value={ed.startMonth} onChange={e => updateItem('education', i, 'startMonth', e.target.value)}>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select className="inp sz-sm" value={ed.startYear} onChange={e => updateItem('education', i, 'startYear', e.target.value)}>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div className="rb-form-group">
                  <label className="rb-label">End Date (Expected)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="inp sz-sm" value={ed.endMonth} onChange={e => updateItem('education', i, 'endMonth', e.target.value)}>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select className="inp sz-sm" value={ed.endYear} onChange={e => updateItem('education', i, 'endYear', e.target.value)}>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <Btn v="ghost" sz="sm" pill onClick={() => addItem('education', { school: '', degree: '', startMonth: 'Jan', startYear: '2024', endMonth: 'Dec', endYear: '2028', gpa: '' })}>
            <Icon id="plus" size={14} /> Add Education
          </Btn>
        </div>
      );
      case 2: return (
        <div className="rf" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {data.experience.map((exp, i) => (
            <div key={i} className="rb-card rf">
              <div className="rb-form-row">
                <div className="rb-form-group">
                  <label className="rb-label">Role</label>
                  <input className="inp" value={exp.role} onChange={e => updateItem('experience', i, 'role', e.target.value)} placeholder="e.g. Product Designer" />
                </div>
                <div className="rb-form-group">
                  <label className="rb-label">Company</label>
                  <input className="inp" value={exp.company} onChange={e => updateItem('experience', i, 'company', e.target.value)} placeholder="e.g. Apple Inc." />
                </div>
              </div>
              <div className="rb-form-row">
                <div className="rb-form-group">
                  <label className="rb-label">Start Date</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="inp sz-sm" value={exp.startMonth} onChange={e => updateItem('experience', i, 'startMonth', e.target.value)}>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select className="inp sz-sm" value={exp.startYear} onChange={e => updateItem('experience', i, 'startYear', e.target.value)}>
                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div className="rb-form-group">
                  <label className="rb-label">End Date</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select className="inp sz-sm" value={exp.endMonth} onChange={e => updateItem('experience', i, 'endMonth', e.target.value)}>
                      <option value="Present">Present</option>
                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    {exp.endMonth !== 'Present' && (
                      <select className="inp sz-sm" value={exp.endYear} onChange={e => updateItem('experience', i, 'endYear', e.target.value)}>
                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </div>
              <div className="rb-form-full" style={{ marginBottom: 0 }}>
                <label className="rb-label">Key Achievements & Responsibilities</label>
                <textarea className="inp" style={{ height: 100, lineHeight: 1.6 }} value={exp.desc} onChange={e => updateItem('experience', i, 'desc', e.target.value)} placeholder="• Spearheaded design for X..." />
              </div>
            </div>
          ))}
          <Btn v="ghost" sz="sm" pill onClick={() => addItem('experience', { role: '', company: '', startMonth: 'Jan', startYear: '2024', endMonth: 'Present', endYear: '', desc: '' })}>
            <Icon id="plus" size={14} /> Add Experience
          </Btn>
        </div>
      );
      case 3: return (
        <div className="rf" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {data.projects.map((pj, i) => (
            <div key={i} className="rb-card rf">
              <div className="rb-form-row">
                <div className="rb-form-group">
                  <label className="rb-label">Project Title</label>
                  <input className="inp" value={pj.title} onChange={e => updateItem('projects', i, 'title', e.target.value)} placeholder="e.g. Resumeeit AI" />
                </div>
                <div className="rb-form-group">
                  <label className="rb-label">Tech Stack</label>
                  <input className="inp" value={pj.tech} onChange={e => updateItem('projects', i, 'tech', e.target.value)} placeholder="React, Firebase..." list="tech-list" />
                  <datalist id="tech-list">
                    {POPULAR_SKILLS.map(s => <option key={s} value={s} />)}
                  </datalist>
                </div>
              </div>
              <div className="rb-form-full" style={{ marginBottom: 0 }}>
                <label className="rb-label">Key Features</label>
                <textarea className="inp" style={{ height: 80, lineHeight: 1.6 }} value={pj.desc} onChange={e => updateItem('projects', i, 'desc', e.target.value)} />
              </div>
            </div>
          ))}
          <Btn v="ghost" sz="sm" pill onClick={() => addItem('projects', { title: '', tech: '', desc: '' })}>+ Add Project</Btn>
        </div>
      );
      case 4: return (
        <div className="rf rb-card">
          <div className="rb-form-full">
            <label className="rb-label">Core Skills (Quick Select)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {POPULAR_SKILLS.map(s => {
                const isActive = data.skills.split(',').map(x => x.trim()).includes(s);
                return (
                  <div key={s} onClick={() => toggleSkill(s)} 
                    style={{ padding: '8px 16px', borderRadius: 100, fontSize: '.8rem', cursor: 'pointer', background: isActive ? 'var(--near-black)' : 'var(--s1)', color: isActive ? 'white' : 'var(--ts)', border: '.5px solid var(--bl)', fontWeight: 600 }}>
                    {s}
                  </div>
                );
              })}
            </div>
            <textarea className="inp" style={{ height: 80 }} value={data.skills} onChange={e => update('skills', e.target.value)} placeholder="Or type manually..." />
          </div>
          <div className="rb-form-row">
            <div className="rb-form-group"><label className="rb-label">Languages</label><input className="inp" value={data.languages} onChange={e => update('languages', e.target.value)} /></div>
            <div className="rb-form-group"><label className="rb-label">Interests</label><input className="inp" value={data.interests} onChange={e => update('interests', e.target.value)} /></div>
          </div>
        </div>
      );
      case 5: {
        const ai = analyzeResume(data);
        return (
          <div className="rf" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            
            {/* 1. Header Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              <div className="rb-card" style={{ textAlign: 'center', borderLeft: '4px solid var(--near-black)' }}>
                <div style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: 4 }}>{ai.score}</div>
                <div className="eyebrow" style={{ fontSize: '.65rem' }}>ATS SCORE</div>
              </div>
              {ai.matchScore !== null && (
                <div className="rb-card" style={{ textAlign: 'center', borderLeft: '4px solid var(--ind)' }}>
                  <div style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: 4, color: 'var(--ind)' }}>{ai.matchScore}%</div>
                  <div className="eyebrow" style={{ fontSize: '.65rem' }}>JOB MATCH</div>
                </div>
              )}
              <div className="rb-card" style={{ textAlign: 'center', borderLeft: '4px solid var(--green)' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: 12 }}>{ai.strength}</div>
                <div className="eyebrow" style={{ fontSize: '.65rem', marginTop: 8 }}>STRENGTH</div>
              </div>
            </div>

            {/* 2. Priority Fixes & Quick Wins */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="rb-card" style={{ borderColor: 'var(--red)', background: 'rgba(255,59,48,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Icon id="fire" color="var(--red)" size={20} />
                  <h6 style={{ fontWeight: 700 }}>Priority Fixes</h6>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {ai.priorityFixes.map((f, i) => (
                    <div key={i} style={{ fontSize: '.85rem', display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--red)' }}>{i+1}.</span> {f}
                    </div>
                  ))}
                </div>
              </div>
              <div className="rb-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <Icon id="zap" color="var(--amber)" size={20} />
                  <h6 style={{ fontWeight: 700 }}>Quick Wins</h6>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {ai.quickWins.map((w, i) => (
                    <div key={i} style={{ fontSize: '.85rem', display: 'flex', gap: 8 }}>
                      <Icon id="check" color="var(--green)" size={14} /> {w}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Skill Suggestions & Gaps */}
            <div className="rb-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Icon id="brain" color="var(--ind)" size={20} />
                <h6 style={{ fontWeight: 700 }}>AI Skill Suggestions</h6>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                <div>
                  <p className="eyebrow" style={{ fontSize: '.6rem', marginBottom: 10 }}>Technical Stack</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ai.suggestions.technical.map(s => (
                      <div key={s} onClick={() => toggleSkill(s)} style={{ padding: '6px 12px', background: 'var(--s1)', borderRadius: 100, fontSize: '.75rem', cursor: 'pointer', border: '.5px solid var(--bl)' }}>+ {s}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="eyebrow" style={{ fontSize: '.6rem', marginBottom: 10 }}>Keywords to Add</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {ai.missingKeywords.length > 0 ? ai.missingKeywords.map(k => (
                      <div key={k} className="b-red badge" style={{ fontSize: '.65rem' }}>{k}</div>
                    )) : <p style={{ fontSize: '.75rem', color: 'var(--ts)' }}>No critical keywords missing.</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Bullet Enhancements */}
            <div className="rb-card d3" style={{ background: '#fafafa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Icon id="trend" color="var(--green)" size={20} />
                <h6 style={{ fontWeight: 700 }}>Bullet Point Enhancements</h6>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {ai.bulletEnhancements.map((b, i) => (
                  <div key={i} style={{ borderBottom: i < ai.bulletEnhancements.length-1 ? '1px solid var(--bl)' : 'none', paddingBottom: 20 }}>
                    <p style={{ fontSize: '.75rem', color: 'var(--ts)', fontStyle: 'italic', marginBottom: 8 }}>Original: "{b.original}"</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div className="card-tint" style={{ padding: '8px 12px', fontSize: '.82rem', borderLeft: '3px solid var(--ind)' }}>
                        <b>Option 1:</b> {b.improved1}
                      </div>
                      <div className="card-tint" style={{ padding: '8px 12px', fontSize: '.82rem', borderLeft: '3px solid var(--green)' }}>
                        <b>Option 2:</b> {b.improved2}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
               <p style={{ fontSize: '.8rem', color: 'var(--ts)' }}>Current Format: <b>{isATSMode ? 'ATS-Friendly' : 'Designer Mode'}</b></p>
               <Btn v={isATSMode ? 'dark' : 'ghost'} sz="sm" pill onClick={() => setIsATSMode(!isATSMode)}>
                 Switch to {isATSMode ? 'Designer' : 'ATS'} Mode
               </Btn>
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  const generateATSResume = () => {
    const doc = new jsPDF();
    let y = 20;
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.text(data.name.toUpperCase(), 105, y, { align: "center" });
    y += 10;
    doc.setFontSize(10);
    doc.setFont("times", "normal");
    doc.text(`${data.email} | ${data.phoneNumber} | ${data.city}, ${data.country}`, 105, y, { align: "center" });
    y += 15;
    const section = (t) => {
      doc.setFont("times", "bold");
      doc.text(t, 20, y);
      y += 2;
      doc.line(20, y, 190, y);
      y += 6;
      doc.setFont("times", "normal");
    };
    section("EXPERIENCE");
    data.experience.forEach(e => {
      doc.setFont("times", "bold");
      doc.text(`${e.role} @ ${e.company}`, 20, y);
      y += 5;
      doc.setFont("times", "normal");
      const lines = doc.splitTextToSize(e.desc, 170);
      doc.text(lines, 20, y);
      y += (lines.length * 5) + 6;
    });
    section("EDUCATION");
    data.education.forEach(e => {
        doc.text(`${e.degree} - ${e.school}`, 20, y);
        y += 10;
    });
    doc.save(`${data.name}_ATS_Resume.pdf`);
    saveToDashboard(`${data.name}_ATS_Resume.pdf`);
  };
  return (
    <div style={{ background: 'var(--s1)', minHeight: '100vh', paddingTop: 52 }}>
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 20px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 10 }}>Step {step + 1} of {STEPS.length}</p>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-.05em' }}>{STEPS[step]}</h1>
          </div>
          <Btn v="ghost" sz="sm" pill onClick={() => go('dashboard')}>Cancel</Btn>
        </div>

        {/* Progress bar */}
        <div style={{ hieght: 4, background: 'var(--bl)', borderRadius: 10, marginBottom: 40, overflow: 'hidden' }}>
          <div style={{ height: 4, background: 'var(--near-black)', width: `${((step + 1) / STEPS.length) * 100}%`, transition: 'width .3s ease' }} />
        </div>

        <div className="card" style={{ padding: '32px 28px', marginBottom: 24 }}>
          {renderForm()}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Btn v="ghost" sz="lg" pill onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            Back
          </Btn>
          {step < STEPS.length - 1 ? (
             <Btn v="dark" sz="lg" pill onClick={() => setStep(s => s + 1)}>
               Next <Icon id="arrow" size={14} color="white" />
             </Btn>
          ) : (
             <Btn v="dark" sz="lg" pill onClick={() => isATSMode ? generateATSResume() : generatePDF()}>
               <Icon id="zap" size={16} color="white" /> Generate PDF Resume
             </Btn>
          )}
        </div>

      </div>
    </div>
  );
};

export default ResumeBuilder;
