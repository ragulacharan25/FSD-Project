const STORAGE_KEY = 'recallrocket_v1';
const defaultData = {
  subjects: [
    { id: 'cs', name: 'Computer Science', icon: '💻' },
    { id: 'math', name: 'Mathematics', icon: '🧮' },
    { id: 'physics', name: 'Physics', icon: '⚛️' },
    { id: 'chem', name: 'Chemistry', icon: '🧪' }
  ],
  cards: [
    { id: 'c1', subject: 'cs', question: 'What is an operating system?', answer: 'An operating system is system software that manages computer hardware and software resources and provides services for application programs.', status: 'new', created: Date.now() - 5000 },
    { id: 'c2', subject: 'cs', question: 'What is the main function of a CPU?', answer: 'The Central Processing Unit (CPU) executes instructions, performs calculations, and controls the operations of a computer.', status: 'known', created: Date.now() - 4000 },
    { id: 'c3', subject: 'math', question: 'What is the derivative of x²?', answer: 'The derivative is 2x, using the power rule: d(xⁿ)/dx = nxⁿ⁻¹.', status: 'review', created: Date.now() - 3000 },
    { id: 'c4', subject: 'physics', question: 'State Newton’s second law of motion.', answer: 'The net force acting on an object equals its mass multiplied by its acceleration: F = ma.', status: 'new', created: Date.now() - 2000 },
    { id: 'c5', subject: 'chem', question: 'What is the chemical formula of water?', answer: 'H₂O. Each water molecule contains two hydrogen atoms bonded to one oxygen atom.', status: 'known', created: Date.now() - 1000 },
    { id: 'c6', subject: 'math', question: 'What is the value of π (pi) approximately?', answer: 'Pi is approximately 3.14159. It is the ratio of a circle’s circumference to its diameter.', status: 'new', created: Date.now() }
  ],
  studyDates: []
};
let data = loadData();
let currentView = 'home';
let studyDeck = [];
let studyIndex = 0;
let sessionKnown = 0;
let sessionReview = 0;
let toastTimer;

function loadData() {
  try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (saved && Array.isArray(saved.subjects) && Array.isArray(saved.cards)) return saved; } catch (e) { console.warn('Could not load saved data', e); }
  return structuredClone(defaultData);
}
function saveData() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function id() { return 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function subjectById(subjectId) { return data.subjects.find(s => s.id === subjectId) || { name: 'Uncategorized', icon: '📚' }; }
function escapeHTML(value) { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
function showToast(message) { const el = document.getElementById('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2400); }
function openModal(id) { const modal = document.getElementById(id); modal.classList.add('open'); modal.setAttribute('aria-hidden', 'false'); }
function closeModal(id) { const modal = document.getElementById(id); modal.classList.remove('open'); modal.setAttribute('aria-hidden', 'true'); }
function setView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === view + 'View'));
  document.querySelectorAll('.nav-link[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  const names = { home: 'Overview', library: 'My flashcards', study: 'Study session', progress: 'Progress' };
  document.getElementById('crumb').textContent = names[view];
  document.getElementById('sidebar').classList.remove('open');
  if (view === 'study') prepareStudy();
  if (view === 'library') renderLibrary();
  if (view === 'progress') renderProgress();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function statusLabel(status) { return status === 'known' ? 'Known' : status === 'review' ? 'Need revision' : 'Not studied'; }
function renderSubjectOptions() {
  const options = data.subjects.map(s => `<option value="${escapeHTML(s.id)}">${escapeHTML(s.name)}</option>`).join('');
  document.getElementById('formSubject').innerHTML = options;
  document.getElementById('subjectFilter').innerHTML = '<option value="all">All subjects</option>' + options;
  document.getElementById('studySubject').innerHTML = '<option value="all">All subjects</option>' + options;
  document.getElementById('subjectNav').innerHTML = data.subjects.map(s => `<button class="nav-link" data-subject="${escapeHTML(s.id)}"><span>${escapeHTML(s.icon)}</span>${escapeHTML(s.name)}</button>`).join('');
  document.querySelectorAll('[data-subject]').forEach(btn => btn.addEventListener('click', () => { setView('library'); document.getElementById('subjectFilter').value = btn.dataset.subject; renderLibrary(); }));
}
function renderHome() {
  const total = data.cards.length, known = data.cards.filter(c => c.status === 'known').length, review = data.cards.filter(c => c.status === 'review').length;
  const streak = calculateStreak(), mastery = total ? Math.round(known / total * 100) : 0;
  document.getElementById('totalCards').textContent = total;
  document.getElementById('knownCards').textContent = known;
  document.getElementById('streakCount').textContent = streak + (streak === 1 ? ' day' : ' days');
  document.getElementById('sideStreak').textContent = streak + (streak === 1 ? ' day streak' : ' day streak');
  document.getElementById('masteryRate').textContent = mastery + '%';
  document.getElementById('subjectGrid').innerHTML = data.subjects.length ? data.subjects.map(s => {
    const cards = data.cards.filter(c => c.subject === s.id), mastered = cards.filter(c => c.status === 'known').length, percent = cards.length ? Math.round(mastered/cards.length*100) : 0;
    return `<article class="subject-card" data-open-subject="${escapeHTML(s.id)}"><div class="subject-card-top"><span class="subject-emoji">${escapeHTML(s.icon)}</span><span class="muted">→</span></div><h3>${escapeHTML(s.name)}</h3><p>${cards.length} flashcard${cards.length === 1 ? '' : 's'}</p><div class="progress-track"><span style="width:${percent}%"></span></div><div class="subject-foot"><span>${mastered} mastered</span><span>${percent}%</span></div></article>`;
  }).join('') : '<div class="empty-state"><div class="empty-icon">📚</div><h3>No subjects yet</h3><p>Add a subject to organize your flashcards.</p></div>';
  document.querySelectorAll('[data-open-subject]').forEach(el => el.addEventListener('click', () => { setView('library'); document.getElementById('subjectFilter').value = el.dataset.openSubject; renderLibrary(); }));
  const recent = [...data.cards].sort((a,b) => b.created-a.created).slice(0,4);
  document.getElementById('recentList').innerHTML = recent.length ? recent.map(c => `<div class="recent-item"><div class="recent-symbol">▤</div><div><strong>${escapeHTML(c.question)}</strong><small>${escapeHTML(subjectById(c.subject).name)}</small></div><span class="status ${c.status}">${statusLabel(c.status)}</span></div>`).join('') : '<div class="empty-state"><h3>Your first card is waiting</h3><p>Create a flashcard to see it here.</p></div>';
}
function renderLibrary() {
  const query = document.getElementById('searchInput').value.trim().toLowerCase(), subject = document.getElementById('subjectFilter').value, status = document.getElementById('statusFilter').value;
  const cards = data.cards.filter(c => (subject === 'all' || c.subject === subject) && (status === 'all' || c.status === status) && (!query || (c.question+' '+c.answer+' '+subjectById(c.subject).name).toLowerCase().includes(query))).sort((a,b)=>b.created-a.created);
  document.getElementById('librarySummary').textContent = `Showing ${cards.length} of ${data.cards.length} flashcards`;
  document.getElementById('cardGrid').innerHTML = cards.length ? cards.map(c => `<article class="flashcard-item"><div class="item-meta"><span class="item-subject">${escapeHTML(subjectById(c.subject).name)}</span><span class="status ${c.status}">${statusLabel(c.status)}</span></div><h3>${escapeHTML(c.question)}</h3><p>${escapeHTML(c.answer.length > 115 ? c.answer.slice(0,115)+'…' : c.answer)}</p><div class="item-actions"><button class="icon-btn" data-edit="${c.id}">✎ Edit</button><button class="icon-btn" data-study-one="${c.id}">◎ Study</button><button class="icon-btn delete" data-delete="${c.id}">⌫ Delete</button></div></article>`).join('') : `<div class="empty-state"><div class="empty-icon">${query ? '⌕' : '✦'}</div><h3>${query ? 'No matching flashcards' : 'Your library is ready for takeoff'}</h3><p>${query ? 'Try a different search or filter.' : 'Create your first flashcard and start learning.'}</p><button class="btn btn-primary" id="emptyCreate">＋ Create flashcard</button></div>`;
  document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editCard(b.dataset.edit)));
  document.querySelectorAll('[data-delete]').forEach(b => b.addEventListener('click', () => deleteCard(b.dataset.delete)));
  document.querySelectorAll('[data-study-one]').forEach(b => b.addEventListener('click', () => { studyDeck = data.cards.filter(c => c.id === b.dataset.studyOne); studyIndex = 0; setView('study'); renderStudyCard(); }));
  document.getElementById('emptyCreate')?.addEventListener('click', () => openCardModal());
}
function openCardModal(card) {
  document.getElementById('cardForm').reset(); document.getElementById('editCardId').value = card?.id || '';
  document.getElementById('modalTitle').textContent = card ? 'Edit flashcard' : 'Create a flashcard';
  if (card) { document.getElementById('formSubject').value = card.subject; document.getElementById('formQuestion').value = card.question; document.getElementById('formAnswer').value = card.answer; }
  openModal('cardModal');
}
function editCard(cardId) { const card = data.cards.find(c => c.id === cardId); if (card) openCardModal(card); }
function deleteCard(cardId) { const card = data.cards.find(c => c.id === cardId); if (!card) return; if (confirm('Delete this flashcard? This cannot be undone.')) { data.cards = data.cards.filter(c => c.id !== cardId); saveData(); refreshAll(); showToast('Flashcard deleted.'); } }
function prepareStudy() {
  const chosen = document.getElementById('studySubject').value || 'all';
  studyDeck = data.cards.filter(c => chosen === 'all' || c.subject === chosen);
  studyIndex = Math.min(studyIndex, Math.max(0, studyDeck.length-1));
  renderStudyCard();
}
function renderStudyCard() {
  const card = studyDeck[studyIndex]; const flip = document.getElementById('flipCard'); flip.classList.remove('flipped');
  if (!card) {
    document.getElementById('frontSubject').textContent = 'READY WHEN YOU ARE'; document.getElementById('questionText').textContent = 'No flashcards in this deck yet.'; document.getElementById('answerText').textContent = 'Create flashcards in your library, then come back here to study.'; document.getElementById('studyPosition').textContent = 'Card 0 of 0'; document.getElementById('studyProgressBar').style.width = '0%';
  } else {
    document.getElementById('frontSubject').textContent = subjectById(card.subject).name.toUpperCase(); document.getElementById('questionText').textContent = card.question; document.getElementById('answerText').textContent = card.answer; document.getElementById('studyPosition').textContent = `Card ${studyIndex+1} of ${studyDeck.length}`; document.getElementById('studyProgressBar').style.width = `${((studyIndex+1)/studyDeck.length)*100}%`;
  }
  document.getElementById('sessionKnown').textContent = sessionKnown; document.getElementById('sessionReview').textContent = sessionReview;
}
function moveStudy(direction) { if (!studyDeck.length) return; studyIndex = (studyIndex + direction + studyDeck.length) % studyDeck.length; renderStudyCard(); }
function markCurrent(status) {
  const card = studyDeck[studyIndex]; if (!card) return;
  const oldStatus = card.status; card.status = status; if (status === 'known') sessionKnown++; else sessionReview++;
  const today = new Date().toISOString().slice(0,10); if (!data.studyDates.includes(today)) data.studyDates.push(today);
  saveData(); renderStudyCard(); renderHome(); renderProgress(); showToast(status === 'known' ? 'Great work — marked as known!' : 'Added to your revision focus.');
  if (oldStatus !== status) { /* status change is persisted */ }
  if (studyIndex < studyDeck.length - 1) moveStudy(1); else showToast('Deck complete! You did great.');
}
function calculateStreak() {
  const dates = [...new Set(data.studyDates || [])].sort().reverse(); if (!dates.length) return 0;
  const today = new Date(); const todayStr = today.toISOString().slice(0,10); const yesterday = new Date(today); yesterday.setDate(yesterday.getDate()-1); const yesterdayStr = yesterday.toISOString().slice(0,10);
  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) return 0;
  let streak = 0, cursor = new Date(dates[0]+'T00:00:00');
  for (const date of dates) { const d = new Date(date+'T00:00:00'); if (Math.round((cursor-d)/86400000) === 0) { streak++; cursor.setDate(cursor.getDate()-1); } else if (Math.round((cursor-d)/86400000) > 0) break; }
  return streak;
}
function renderProgress() {
  const total=data.cards.length, known=data.cards.filter(c=>c.status==='known').length, review=data.cards.filter(c=>c.status==='review').length, fresh=total-known-review, percent=total?Math.round(known/total*100):0;
  document.getElementById('progressPercent').textContent=percent+'%'; document.getElementById('bigProgressBar').style.width=percent+'%'; document.getElementById('progressKnown').textContent=known; document.getElementById('progressReview').textContent=review; document.getElementById('progressNew').textContent=fresh;
  document.getElementById('progressCaption').textContent=total?`${known} of ${total} cards marked as known.`:'Add flashcards to begin your journey.';
  document.getElementById('subjectProgressList').innerHTML=data.subjects.length?data.subjects.map(s=>{const cards=data.cards.filter(c=>c.subject===s.id), k=cards.filter(c=>c.status==='known').length, p=cards.length?Math.round(k/cards.length*100):0;return `<div class="subject-progress-row"><span class="emoji">${escapeHTML(s.icon)}</span><div><strong>${escapeHTML(s.name)}</strong><small>${k} of ${cards.length} cards mastered</small><div class="progress-track"><span style="width:${p}%"></span></div></div><span class="percent">${p}%</span></div>`}).join(''):'<div class="empty-state"><h3>No subjects to show</h3><p>Add a subject and some flashcards to see your progress.</p></div>';
  document.getElementById('nextTip').textContent=review?`You have ${review} card${review===1?'':'s'} marked for revision. Spend a few minutes reviewing them today.`:fresh?`Try studying your ${fresh} not-yet-mastered card${fresh===1?'':'s'} and mark the ones you can recall.`:'Keep creating and reviewing cards to grow your knowledge.';
}
function refreshAll() { renderSubjectOptions(); renderHome(); renderLibrary(); renderProgress(); }

document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.go)));
document.getElementById('createCardBtn').addEventListener('click',()=>openCardModal());
document.getElementById('addSubjectBtn').addEventListener('click',()=>openModal('subjectModal'));
document.getElementById('addSubjectSide').addEventListener('click',()=>openModal('subjectModal'));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
document.querySelectorAll('.modal-backdrop').forEach(backdrop=>backdrop.addEventListener('click',e=>{if(e.target===backdrop)closeModal(backdrop.id)}));
document.getElementById('cardForm').addEventListener('submit',e=>{e.preventDefault();const editId=document.getElementById('editCardId').value;const payload={subject:document.getElementById('formSubject').value,question:document.getElementById('formQuestion').value.trim(),answer:document.getElementById('formAnswer').value.trim()};if(!payload.question||!payload.answer)return;if(editId){const card=data.cards.find(c=>c.id===editId);Object.assign(card,payload);showToast('Flashcard updated.')}else{data.cards.push({id:id(),...payload,status:'new',created:Date.now()});showToast('New flashcard added!')}saveData();closeModal('cardModal');refreshAll();});
document.getElementById('subjectForm').addEventListener('submit',e=>{e.preventDefault();const name=document.getElementById('subjectName').value.trim();if(!name)return;if(data.subjects.some(s=>s.name.toLowerCase()===name.toLowerCase())){showToast('That subject already exists.');return}data.subjects.push({id:id(),name,icon:document.getElementById('subjectIcon').value});saveData();closeModal('subjectModal');e.target.reset();refreshAll();showToast('Subject added successfully!')});
['searchInput','subjectFilter','statusFilter'].forEach(id=>document.getElementById(id).addEventListener(id==='searchInput'?'input':'change',renderLibrary));
document.getElementById('studySubject').addEventListener('change',()=>{studyIndex=0;prepareStudy()});
document.getElementById('flipCard').addEventListener('click',()=>document.getElementById('flipCard').classList.toggle('flipped'));
document.getElementById('flipCard').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();document.getElementById('flipCard').classList.toggle('flipped')}});
document.getElementById('prevCard').addEventListener('click',()=>moveStudy(-1));document.getElementById('nextCard').addEventListener('click',()=>moveStudy(1));
document.getElementById('markKnown').addEventListener('click',()=>markCurrent('known'));document.getElementById('markReview').addEventListener('click',()=>markCurrent('review'));
document.getElementById('shuffleBtn').addEventListener('click',()=>{for(let i=studyDeck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[studyDeck[i],studyDeck[j]]=[studyDeck[j],studyDeck[i]]}studyIndex=0;renderStudyCard();showToast('Deck shuffled — fresh challenge!')});
document.getElementById('themeToggle').addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('recallrocket_dark',document.body.classList.contains('dark')?'1':'0')});
document.getElementById('mobileMenu').addEventListener('click',()=>document.getElementById('sidebar').classList.toggle('open'));
document.getElementById('todayLabel').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'short',day:'numeric',month:'short'}).format(new Date());
if(localStorage.getItem('recallrocket_dark')==='1')document.body.classList.add('dark');
refreshAll();
