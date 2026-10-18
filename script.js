'use strict';

/* ===== Constantes ===== */
const STORAGE_KEY = 'sms.students.v2'; // v2 : modèle de données « scolarité »
const PAGE_SIZE = 8;
const LEVELS = ['1ère année', '2ème année', '3ème année']; // Licence appliquée : 3 ans
// Départements proposés (à vérifier et adapter selon l'offre de formation de l'ISET)
const DEPARTMENTS = ["Technologies de l'Informatique", 'Génie Mécanique', 'Génie Électrique', 'Génie des Procédés'];
const STATUSES = ['En attente', 'Validé', 'À corriger', 'Refusé']; // état du dossier
// Pièces demandées pour un dossier (liste à adapter)
const DOCUMENTS = ['Copie de la CIN', "Photo d'identité", 'Diplôme du baccalauréat', 'Relevé de notes du baccalauréat'];
// Message affiché à l'étudiant dans le suivi de dossier
const STATUS_HELP = {
  'En attente': 'Votre dossier est en cours de traitement par le service de la scolarité.',
  'Validé': 'Votre inscription est validée. Vous pouvez imprimer votre attestation.',
  'À corriger': 'Des corrections sont nécessaires. Consultez les messages ci-dessous et contactez le service de la scolarité.',
  'Refusé': "Votre dossier a été refusé. Contactez le service de la scolarité pour plus d'informations."
};
const STATUS_CLASS = { 'En attente': 'wait', 'Validé': 'ok', 'À corriger': 'warn', 'Refusé': 'bad' };
const YEARS = ['2024-2025', '2025-2026', '2026-2027'];
const CURRENT_YEAR = '2026-2027';
const FIELD_NAMES = ['academicYear', 'cin', 'birthDate', 'firstName', 'lastName', 'email', 'phone', 'department', 'program', 'level', 'status', 'enrollmentDate'];
const VIEW_TITLES = { dashboard: 'Tableau de bord', students: 'Dossiers des étudiants', form: 'Inscription', track: 'Suivre mon dossier', login: 'Espace administration', contact: 'Contact' };

// DÉMO : ce code est visible dans le fichier JavaScript, ce n'est PAS une vraie sécurité
const ADMIN_CODE = 'admin2026';
const MESSAGES_KEY = 'sms.messages.v1';
const ADMIN_VIEWS = ['dashboard', 'students', 'contact']; // vues réservées à l'administrateur
// Motifs de contact et phrase utilisée dans le modèle de message
const REASONS = {
  'Données incorrectes': 'certaines informations de votre dossier sont incorrectes ou incomplètes',
  'Document manquant': 'un document est manquant dans votre dossier',
  'CIN invalide': 'le numéro de CIN renseigné semble invalide',
  'Autre': ''
};

/* ===== État ===== */
const state = { students: [], messages: [], role: 'student', page: 1, editingId: null };
const $ = (selector) => document.querySelector(selector);

/* ===== Utilitaires ===== */
// Crée un élément avec textContent : jamais d'innerHTML avec des données utilisateur
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const fullName = (s) => `${s.firstName} ${s.lastName}`;
const today = () => new Date().toISOString().slice(0, 10);
const formatDate = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR');

// ID unique : on repart du plus grand numéro existant
function generateId() {
  const max = state.students.reduce((m, s) => Math.max(m, parseInt(s.id.replace(/\D/g, ''), 10) || 0), 0);
  return `SBZ-${String(max + 1).padStart(4, '0')}`;
}

let toastTimer;
function showToast(message, type = 'success') {
  const toast = $('#toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

function confirmAction(message) {
  return new Promise((resolve) => {
    const dialog = $('#confirmDialog');
    $('#confirmMessage').textContent = message;
    dialog.returnValue = '';
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'ok'), { once: true });
    dialog.showModal();
  });
}

/* ===== LocalStorage ===== */
function isValidRecord(s) {
  return s && typeof s === 'object' &&
    ['id', 'cin', 'birthDate', 'firstName', 'lastName', 'email', 'department', 'level', 'status', 'academicYear', 'enrollmentDate'].every((k) => typeof s[k] === 'string');
}

function loadStudents() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data.filter(isValidRecord) : [];
  } catch {
    return []; // JSON corrompu : on repart d'une liste vide
  }
}

function saveStudents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.students));
  } catch {
    showToast("Impossible d'enregistrer les données.", 'error');
  }
}

function saveAndRender() {
  saveStudents();
  render();
}

/* ===== Dashboard ===== */
function countBy(key) {
  const counts = new Map();
  state.students.forEach((s) => counts.set(s[key], (counts.get(s[key]) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function renderStatList(list, entries) {
  list.replaceChildren();
  if (!entries.length) {
    list.append(el('li', 'muted', 'Aucune donnée'));
    return;
  }
  entries.forEach(([label, value]) => {
    const li = el('li');
    li.append(el('span', '', label), el('strong', '', String(value)));
    list.append(li);
  });
}

function renderDashboard() {
  countTo($('#statTotal'), state.students.length);
  const pending = state.students.filter((s) => s.status === 'En attente' || s.status === 'À corriger').length;
  $('#statPending').textContent = `${pending} dossier(s) à traiter`;
  renderStatList($('#statLevels'), countBy('level'));
  renderStatList($('#statFields'), countBy('department'));
  renderStatList($('#statStatus'), countBy('status'));
  const recent = [...state.students]
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5)
    .map((s) => [`${fullName(s)} (${s.level})`, formatDate(s.enrollmentDate)]);
  renderStatList($('#recentList'), recent);
}

/* ===== Liste : recherche, filtres, tri, pagination ===== */
function getVisibleStudents() {
  const term = $('#search').value.trim().toLowerCase();
  const level = $('#filterLevel').value;
  const department = $('#filterDepartment').value;
  const [key, direction] = $('#sort').value.split('-');

  const list = state.students.filter((s) =>
    (!term || [fullName(s), s.email, s.id, s.cin].some((v) => v.toLowerCase().includes(term))) &&
    (!level || s.level === level) &&
    (!department || s.department === department));

  list.sort((a, b) => {
    const result = key === 'name'
      ? fullName(a).localeCompare(fullName(b))
      : a.enrollmentDate.localeCompare(b.enrollmentDate);
    return direction === 'asc' ? result : -result;
  });
  return list;
}

function actionButton(label, action, student) {
  const button = el('button', `btn btn-sm ${action === 'delete' ? 'btn-danger-outline' : 'btn-secondary'}`, label);
  button.type = 'button';
  button.dataset.action = action;
  button.dataset.id = student.id;
  button.setAttribute('aria-label', `${label} ${fullName(student)}`);
  return button;
}

function buildRow(student) {
  const row = el('tr');
  const cells = [
    ['N° inscription', student.id], ['Nom', fullName(student)], ['CIN', student.cin],
    ['Département', student.department], ['Niveau', student.level], ['Pièces', `${(student.documents || []).length}/${DOCUMENTS.length}`],
    ['Statut', student.status]
  ];
  cells.forEach(([label, value]) => {
    const cell = el('td', '');
    cell.dataset.label = label;
    cell.append(label === 'Statut' ? el('span', `badge badge-${STATUS_CLASS[value]}`, value) : document.createTextNode(value));
    row.append(cell);
  });
  const actions = el('td', 'actions');
  if (student.status !== 'Validé') actions.append(actionButton('Valider', 'validate', student));
  else actions.append(actionButton('Attestation', 'attest', student));
  actions.append(actionButton('Modifier', 'edit', student), actionButton('Supprimer', 'delete', student));
  row.append(actions);
  return row;
}

function renderTable() {
  const list = getVisibleStudents();
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  state.page = Math.min(state.page, pages);
  const slice = list.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

  const body = $('#studentRows');
  body.replaceChildren(...slice.map(buildRow));

  $('#tableWrap').hidden = slice.length === 0;
  $('#emptyState').hidden = slice.length > 0;
  $('#emptyText').textContent = state.students.length
    ? 'Aucun étudiant ne correspond à votre recherche. Modifiez ou réinitialisez les filtres.'
    : "Aucun étudiant pour l'instant. Ajoutez un étudiant ou chargez des exemples.";
  $('#pagination').hidden = list.length <= PAGE_SIZE;
  $('#pageInfo').textContent = `Page ${state.page} / ${pages}`;
  $('#prevPage').disabled = state.page <= 1;
  $('#nextPage').disabled = state.page >= pages;
}

function render() {
  renderDashboard();
  renderTable();
  renderMessages();
  refreshContactStudents();
}

/* ===== Formulaire : validation, ajout, modification ===== */
function readForm() {
  const data = {};
  FIELD_NAMES.forEach((name) => { data[name] = $(`#${name}`).value.trim(); });
  return data;
}

function validate(data, ignoreId = null) {
  const errors = {};
  const others = state.students.filter((s) => s.id !== ignoreId);
  if (!data.firstName) errors.firstName = 'Le prénom est obligatoire.';
  if (!data.lastName) errors.lastName = 'Le nom est obligatoire.';

  // CIN tunisien : 8 chiffres, unique
  if (!data.cin) errors.cin = 'Le numéro de CIN est obligatoire.';
  else if (!/^\d{8}$/.test(data.cin)) errors.cin = 'Le CIN doit contenir exactement 8 chiffres.';
  else if (others.some((s) => s.cin === data.cin)) errors.cin = 'Ce CIN est déjà enregistré.';

  if (!data.birthDate) errors.birthDate = 'La date de naissance est obligatoire.';
  else if (data.birthDate >= today()) errors.birthDate = 'La date de naissance doit être dans le passé.';

  if (!data.email) errors.email = "L'email est obligatoire.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = "Format d'email invalide (exemple : nom@domaine.com).";
  else if (others.some((s) => s.email.toLowerCase() === data.email.toLowerCase())) errors.email = 'Cet email est déjà utilisé par un autre étudiant.';

  // Téléphone tunisien : 8 chiffres, avec ou sans +216
  if (data.phone && !/^(\+216)?\s?\d{2}\s?\d{3}\s?\d{3}$/.test(data.phone)) errors.phone = 'Numéro invalide (8 chiffres, ex. 20 123 456).';

  if (!DEPARTMENTS.includes(data.department)) errors.department = 'Choisissez un département.';
  if (!LEVELS.includes(data.level)) errors.level = "Choisissez l'année d'étude.";
  if (!STATUSES.includes(data.status)) errors.status = 'Choisissez un statut.';
  if (!YEARS.includes(data.academicYear)) errors.academicYear = "Choisissez l'année universitaire.";
  if (!data.enrollmentDate) errors.enrollmentDate = "La date d'inscription est obligatoire.";
  return errors;
}

function showErrors(errors) {
  FIELD_NAMES.forEach((name) => {
    $(`#err-${name}`).textContent = errors[name] || '';
    $(`#${name}`).setAttribute('aria-invalid', errors[name] ? 'true' : 'false');
  });
}

function readDocs() {
  return [...document.querySelectorAll('#docsBox input:checked')].map((box) => box.value);
}

function setDocs(list) {
  document.querySelectorAll('#docsBox input').forEach((box) => { box.checked = list.includes(box.value); });
}

function resetForm() {
  $('#studentForm').reset();
  setDocs([]);
  state.editingId = null;
  showErrors({});
  $('#enrollmentDate').value = today();
  $('#academicYear').value = CURRENT_YEAR;
  $('#status').value = 'En attente';
  $('#submitResult').hidden = true;
  $('#studentId').value = generateId();
  $('#formTitle').textContent = 'Nouvelle inscription';
  $('#submitBtn').textContent = state.role === 'admin' ? 'Ajouter' : 'Envoyer mon inscription';
  $('#cancelEdit').hidden = true;
}

function handleSubmit(event) {
  event.preventDefault();
  const data = readForm();
  data.documents = readDocs();
  const errors = validate(data, state.editingId);
  showErrors(errors);

  const firstError = FIELD_NAMES.find((name) => errors[name]);
  if (firstError) {
    $(`#${firstError}`).focus();
    return;
  }

  if (state.editingId) {
    const index = state.students.findIndex((s) => s.id === state.editingId);
    state.students[index] = { ...state.students[index], ...data };
    saveAndRender();
    resetForm();
    showView('students');
    showToast('Étudiant modifié avec succès.');
  } else {
    const student = { id: generateId(), ...data, createdAt: Date.now() };
    state.students.push(student);
    saveAndRender();
    resetForm();
    showToast('Inscription enregistrée avec succès.');
    if (state.role === 'student') showSubmitResult(student);
  }
}

function startEdit(id) {
  const student = state.students.find((s) => s.id === id);
  if (!student) return;
  resetForm();
  state.editingId = id;
  FIELD_NAMES.forEach((name) => { $(`#${name}`).value = student[name] || ''; });
  $('#studentId').value = student.id;
  setDocs(student.documents || []);
  $('#formTitle').textContent = `Modifier ${fullName(student)}`;
  $('#submitBtn').textContent = 'Enregistrer les modifications';
  $('#cancelEdit').hidden = false;
  showView('form');
  $('#pageTitle').textContent = 'Modifier un étudiant';
  $('#firstName').focus();
}

async function deleteStudent(id) {
  const student = state.students.find((s) => s.id === id);
  if (!student) return;
  const confirmed = await confirmAction(`Supprimer ${fullName(student)} ? Cette action est irréversible.`);
  if (!confirmed) return;
  state.students = state.students.filter((s) => s.id !== id);
  saveAndRender();
  showToast('Étudiant supprimé.', 'info');
}

/* ===== Données de démonstration ===== */
async function clearAll() {
  if (!state.students.length) return showToast('Il n\'y a aucune donnée à supprimer.', 'info');
  const confirmed = await confirmAction('Supprimer tous les étudiants enregistrés dans ce navigateur ?');
  if (!confirmed) return;
  state.students = [];
  state.messages = [];
  saveMessages();
  saveAndRender();
  resetForm();
  showToast('Toutes les données ont été supprimées.', 'info');
}

/* ===== Navigation ===== */
function showView(name) {
  if (ADMIN_VIEWS.includes(name) && state.role !== 'admin') name = 'login'; // accès réservé
  if (name !== 'track') { // on efface le suivi dès qu'on quitte la page (ordinateur partagé)
    $('#trackForm').reset();
    $('#trackResult').hidden = true;
    $('#err-track').textContent = '';
  }
  document.querySelectorAll('.view').forEach((view) => { view.hidden = view.id !== `view-${name}`; });
  document.querySelectorAll('.nav-link').forEach((button) => {
    const active = button.dataset.view === name;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $('#pageTitle').textContent = VIEW_TITLES[name];
  $('#sidebar').classList.remove('open');
}

function fillSelect(select, items) {
  items.forEach((item) => {
    const option = el('option', '', item);
    option.value = item;
    select.append(option);
  });
}

function resetFilters() {
  $('#search').value = '';
  $('#filterLevel').value = '';
  $('#filterDepartment').value = '';
  $('#sort').value = 'date-desc';
  state.page = 1;
  renderTable();
}

/* ===== Attestation d'inscription (impression) ===== */
function printAttestation(student) {
  if (!student) return;
  const logo = el('img', 'print-logo');
  logo.src = 'assets/images/logo-iset-sbz.png';
  logo.alt = "Logo de l'ISET Sidi Bouzid";
  const program = student.program ? ` (parcours ${student.program})` : '';
  $('#printArea').replaceChildren(
    logo,
    el('p', 'print-banner', 'DOCUMENT DE DÉMONSTRATION : sans valeur officielle'),
    el('h1', '', "Attestation d'inscription"),
    el('p', '', `Il est attesté que l'étudiant(e) ${fullName(student)}, titulaire de la CIN n° ${student.cin}, né(e) le ${formatDate(student.birthDate)}, est inscrit(e) en ${student.level}, département ${student.department}${program}, pour l'année universitaire ${student.academicYear}.`),
    el('p', '', `Numéro d'inscription : ${student.id}`),
    el('p', '', `Fait à Sidi Bouzid, le ${formatDate(today())}.`),
    el('p', 'print-sign', 'Le service de la scolarité')
  );
  window.print(); // le CSS @media print n'affiche que #printArea
}

/* ===== Export CSV ===== */
function csvCell(value) {
  let text = String(value ?? '');
  // Évite l'injection de formule dans Excel (cellule commençant par = @ + -), sauf numéros de téléphone
  if (/^[=@\t\r]/.test(text) || (/^[+-]/.test(text) && !/^[+-]?[\d\s().-]+$/.test(text))) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv() {
  if (!state.students.length) return showToast('Aucun dossier à exporter.', 'info');
  const columns = [
    ['N° inscription', 'id'], ['Nom', 'lastName'], ['Prénom', 'firstName'], ['CIN', 'cin'],
    ['Date de naissance', 'birthDate'], ['Email', 'email'], ['Téléphone', 'phone'],
    ['Département', 'department'], ['Parcours', 'program'], ["Année d'étude", 'level'],
    ['Année universitaire', 'academicYear'], ['Statut', 'status'], ["Date d'inscription", 'enrollmentDate']
  ];
  const rows = [
    [...columns.map(([label]) => label), 'Pièces reçues'],
    ...state.students.map((s) => [...columns.map(([, key]) => s[key]), (s.documents || []).join(' / ')])
  ];
  // BOM UTF-8 + séparateur « ; » : s'ouvre correctement dans Excel (accents)
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = el('a');
  link.href = url;
  link.download = `dossiers-iset-sbz-${today()}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showToast(`${state.students.length} dossier(s) exporté(s).`);
}

/* ===== Rôles : étudiant / administrateur ===== */
function applyRole() {
  document.querySelectorAll('[data-role]').forEach((node) => { node.hidden = node.dataset.role !== state.role; });
  $('#roleChip').textContent = state.role === 'admin' ? 'Administrateur connecté' : 'Espace étudiant';
}

function handleLogin(event) {
  event.preventDefault();
  if ($('#adminCode').value !== ADMIN_CODE) {
    $('#err-adminCode').textContent = 'Code incorrect.';
    return;
  }
  $('#adminCode').value = '';
  $('#err-adminCode').textContent = '';
  state.role = 'admin';
  try { sessionStorage.setItem('sms.role', 'admin'); } catch { /* stockage indisponible */ }
  applyRole();
  showView('dashboard');
  showToast("Connecté en tant qu'administrateur.");
}

function logout() {
  state.role = 'student';
  try { sessionStorage.removeItem('sms.role'); } catch { /* stockage indisponible */ }
  applyRole();
  resetForm();
  showView('form');
  showToast('Vous êtes déconnecté.', 'info');
}

function setStatus(id, status) {
  const student = state.students.find((s) => s.id === id);
  if (!student) return;
  student.status = status;
  saveAndRender();
  showToast(`Dossier ${student.id} : ${status}.`);
}

/* ===== Espace étudiant : confirmation et suivi du dossier ===== */
function showSubmitResult(student) {
  const box = $('#submitResult');
  box.replaceChildren(
    el('strong', '', 'Inscription enregistrée.'),
    el('p', '', `Votre numéro d'inscription est ${student.id}. Conservez-le avec votre CIN pour suivre votre dossier.`)
  );
  box.hidden = false;
}

function handleTrack(event) {
  event.preventDefault();
  const id = $('#trackId').value.trim().toUpperCase();
  const cin = $('#trackCin').value.trim();
  const student = state.students.find((s) => s.id === id && s.cin === cin);
  const result = $('#trackResult');
  $('#err-track').textContent = student ? '' : 'Aucun dossier ne correspond à ce numéro et à ce CIN.';
  result.hidden = !student;
  if (!student) return;

  result.replaceChildren(el('h2', '', fullName(student)), el('p', 'info', STATUS_HELP[student.status] || ''));
  const list = el('ul', 'stat-list');
  [['Numéro', student.id], ['Département', student.department], ["Année d'étude", student.level],
   ['Année universitaire', student.academicYear], ['Statut du dossier', student.status]].forEach(([label, value]) => {
    const li = el('li');
    li.append(el('span', '', label), el('strong', '', value));
    list.append(li);
  });
  result.append(list);

  result.append(el('h3', '', 'Pièces du dossier'));
  const docList = el('ul', 'stat-list');
  DOCUMENTS.forEach((doc) => {
    const li = el('li');
    li.append(el('span', '', doc), el('strong', '', (student.documents || []).includes(doc) ? 'Reçue' : 'Manquante'));
    docList.append(li);
  });
  result.append(docList);

  if (student.status === 'Validé') {
    const button = el('button', 'btn btn-primary', "Imprimer l'attestation d'inscription");
    button.type = 'button';
    button.addEventListener('click', () => printAttestation(student));
    result.append(button);
  }

  const mine = state.messages.filter((m) => m.studentId === student.id);
  if (mine.length) {
    result.append(el('h3', '', "Messages de l'administration"));
    mine.forEach((m) => {
      const box = el('div', 'message');
      box.append(el('strong', '', `${m.subject} (${formatDate(m.date)})`), el('p', '', m.body));
      result.append(box);
    });
  }
}

/* ===== Page Contact : message de l'administrateur à un étudiant ===== */
function loadMessages() {
  try {
    const data = JSON.parse(localStorage.getItem(MESSAGES_KEY) || '[]');
    return Array.isArray(data)
      ? data.filter((m) => m && ['studentId', 'to', 'subject', 'body', 'date'].every((k) => typeof m[k] === 'string'))
      : [];
  } catch {
    return [];
  }
}

function saveMessages() {
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(state.messages));
  } catch {
    showToast("Impossible d'enregistrer l'historique.", 'error');
  }
}

function refreshContactStudents() {
  const select = $('#contactStudent');
  const current = select.value;
  select.replaceChildren(new Option('Choisir…', ''), ...state.students.map((s) => new Option(`${fullName(s)} (${s.id})`, s.id)));
  select.value = current;
}

function renderMessages() {
  const entries = [...state.messages].reverse().map((m) => [`${m.subject} — ${m.to}`, formatDate(m.date)]);
  renderStatList($('#messageList'), entries);
}

// Remplit objet + message avec un modèle selon l'étudiant et le motif (modifiable ensuite)
function applyTemplate() {
  const student = state.students.find((s) => s.id === $('#contactStudent').value);
  const reason = REASONS[$('#contactReason').value];
  const detail = reason ? `Après vérification, nous avons constaté que ${reason}.\n\nMerci de nous transmettre les corrections nécessaires.\n\n` : '';
  const missing = student ? DOCUMENTS.filter((d) => !(student.documents || []).includes(d)) : [];
  const extra = $('#contactReason').value === 'Document manquant' && missing.length
    ? `Pièces manquantes :\n${missing.map((d) => `- ${d}`).join('\n')}\n\n` : '';
  $('#contactSubject').value = student ? `Votre dossier d'inscription (${student.id})` : '';
  $('#contactBody').value = `Bonjour ${student ? student.firstName : ''},\n\n${detail}${extra}Cordialement,\nLe service de la scolarité\nISET Sidi Bouzid`;
}

// Valide le formulaire, enregistre le message dans l'historique et renvoie ses données (ou null)
function prepareMessage() {
  const student = state.students.find((s) => s.id === $('#contactStudent').value);
  const subject = $('#contactSubject').value.trim();
  const body = $('#contactBody').value.trim();
  $('#err-contactStudent').textContent = student ? '' : 'Choisissez un étudiant.';
  $('#err-contactSubject').textContent = subject ? '' : "L'objet est obligatoire.";
  $('#err-contactBody').textContent = body ? '' : 'Le message est obligatoire.';
  if (!student || !subject || !body) return null;

  state.messages.push({ studentId: student.id, to: student.email, subject, body, date: today() });
  saveMessages();
  if ($('#contactMark').checked) student.status = 'À corriger';
  saveAndRender();
  return { to: student.email, subject, body };
}

// Bouton principal : messagerie par défaut du système (lien mailto:)
function handleContact(event) {
  event.preventDefault();
  const message = prepareMessage();
  if (!message) return;
  showToast("Votre messagerie s'ouvre avec le message prérempli.", 'info');
  window.location.href = `mailto:${message.to}?subject=${encodeURIComponent(message.subject)}&body=${encodeURIComponent(message.body)}`;
}

// Gmail dans le navigateur : ne dépend d'aucun logiciel installé
function openGmail() {
  const message = prepareMessage();
  if (!message) return;
  const params = new URLSearchParams({ view: 'cm', fs: '1', to: message.to, su: message.subject, body: message.body });
  window.open(`https://mail.google.com/mail/?${params}`, '_blank', 'noopener');
}

async function copyMessage() {
  const message = prepareMessage();
  if (!message) return;
  try {
    await navigator.clipboard.writeText(`À : ${message.to}\nObjet : ${message.subject}\n\n${message.body}`);
    showToast('Message copié dans le presse-papiers.');
  } catch {
    showToast('Copie impossible : sélectionnez le texte manuellement.', 'error');
  }
}

/* ===== Animations ===== */
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Compteur animé du tableau de bord
function countTo(node, target) {
  const start = Number(node.textContent) || 0;
  if (start === target || reducedMotion()) {
    node.textContent = target;
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min((now - t0) / 600, 1);
    node.textContent = Math.round(start + (target - start) * (1 - (1 - k) ** 3));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Écran d'accueil : une seule fois par session, on peut le passer (clic ou touche)
function initSplash() {
  const splash = $('#splash');
  let seen = false;
  try { seen = sessionStorage.getItem('sms.splash') === '1'; } catch { /* stockage indisponible */ }
  if (seen || reducedMotion()) {
    splash.remove();
    return;
  }
  try { sessionStorage.setItem('sms.splash', '1'); } catch { /* stockage indisponible */ }
  const close = () => {
    splash.classList.add('leaving');
    setTimeout(() => splash.remove(), 650);
  };
  splash.addEventListener('click', close);
  document.addEventListener('keydown', close, { once: true });
  setTimeout(close, 2800);
}

/* ===== Initialisation ===== */
function init() {
  initSplash();
  state.students = loadStudents();
  state.messages = loadMessages();
  fillSelect($('#contactReason'), Object.keys(REASONS));
  DOCUMENTS.forEach((doc) => {
    const label = el('label', 'check');
    const box = el('input');
    box.type = 'checkbox';
    box.value = doc;
    label.append(box, ` ${doc}`);
    $('#docsBox').append(label);
  });
  $('#docsHint').textContent = `Pièces à fournir au service de la scolarité : ${DOCUMENTS.join(', ')}.`;
  ['level', 'filterLevel'].forEach((id) => fillSelect($(`#${id}`), LEVELS));
  ['department', 'filterDepartment'].forEach((id) => fillSelect($(`#${id}`), DEPARTMENTS));
  fillSelect($('#status'), STATUSES);
  fillSelect($('#academicYear'), YEARS);

  document.querySelectorAll('.nav-link').forEach((button) => {
    button.addEventListener('click', () => {
      if (!button.dataset.view) return; // bouton Déconnexion
      if (button.dataset.view === 'form') resetForm();
      showView(button.dataset.view);
    });
  });
  $('#menuToggle').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

  ['search', 'filterLevel', 'filterDepartment', 'sort'].forEach((id) => {
    $(`#${id}`).addEventListener('input', () => { state.page = 1; renderTable(); });
  });
  $('#resetFilters').addEventListener('click', resetFilters);
  $('#prevPage').addEventListener('click', () => { state.page -= 1; renderTable(); });
  $('#nextPage').addEventListener('click', () => { state.page += 1; renderTable(); });

  // Délégation d'événements : un seul listener pour tous les boutons du tableau
  $('#studentRows').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { action, id } = button.dataset;
    if (action === 'edit') startEdit(id);
    else if (action === 'validate') setStatus(id, 'Validé');
    else if (action === 'attest') printAttestation(state.students.find((s) => s.id === id));
    else deleteStudent(id);
  });

  $('#studentForm').addEventListener('submit', handleSubmit);
  $('#cancelEdit').addEventListener('click', () => { resetForm(); showView('students'); });
  $('#exportCsv').addEventListener('click', exportCsv);
  $('#clearAll').addEventListener('click', clearAll);

  $('#loginForm').addEventListener('submit', handleLogin);
  $('#logout').addEventListener('click', logout);
  $('#trackForm').addEventListener('submit', handleTrack);
  $('#contactForm').addEventListener('submit', handleContact);
  $('#openGmail').addEventListener('click', openGmail);
  $('#copyMessage').addEventListener('click', copyMessage);
  ['contactStudent', 'contactReason'].forEach((id) => $(`#${id}`).addEventListener('change', applyTemplate));

  try { if (sessionStorage.getItem('sms.role') === 'admin') state.role = 'admin'; } catch { /* stockage indisponible */ }
  $('#birthDate').max = today();
  applyRole();
  resetForm();
  render();
  applyTemplate();
  showView(state.role === 'admin' ? 'dashboard' : 'form'); // l'espace étudiant est la page d'accueil
}

document.addEventListener('DOMContentLoaded', init);
