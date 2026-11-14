// VILLA MOTION — application front.
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

const api = async (url, opts = {}) => {
  const res = await fetch(url, {
    headers: opts.body && !(opts.body instanceof FormData) ? {'Content-Type': 'application/json'} : undefined,
    ...opts,
    body: opts.body && !(opts.body instanceof FormData) ? JSON.stringify(opts.body) : opts.body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
};

let config = {maxPhotos: 50, recommendedMin: 20, hardMinRender: 3};
let project = null;
let saveTimer = null;
let pollTimer = null;

// ---------- navigation ----------
const showHome = async () => {
  clearInterval(pollTimer);
  $('#view-editor').hidden = true;
  $('#view-home').hidden = false;
  history.replaceState(null, '', '#');
  await renderProjectList();
};

const showEditor = async (pid) => {
  project = await api(`/api/projects/${pid}`);
  $('#view-home').hidden = true;
  $('#view-editor').hidden = false;
  history.replaceState(null, '', `#p=${pid}`);
  renderEditor();
  startStatusPolling();
};

// ---------- accueil ----------
const renderProjectList = async () => {
  const list = await api('/api/projects');
  const grid = $('#projects-grid');
  grid.innerHTML = '';
  $('#projects-empty').hidden = list.length > 0;
  for (const p of list) {
    const card = document.createElement('button');
    card.className = 'project-card';
    card.innerHTML = `
      <div class="project-cover">${p.cover ? `<img src="${p.cover}" alt="" />` : '<span class="serif" style="font-size:26px">—</span>'}</div>
      <div class="project-body">
        <h3></h3>
        <div class="loc"></div>
        <div class="meta">
          <span>${p.photoCount} photo${p.photoCount > 1 ? 's' : ''}${p.hasVideo ? ' · film prêt' : ''}</span>
          <span class="project-del" title="Supprimer">Supprimer</span>
        </div>
      </div>`;
    card.querySelector('h3').textContent = p.villaName;
    card.querySelector('.loc').textContent = p.location || '—';
    card.addEventListener('click', (e) => {
      if (e.target.classList.contains('project-del')) return;
      showEditor(p.id);
    });
    card.querySelector('.project-del').addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm(`Supprimer définitivement « ${p.villaName} » ?`)) return;
      await api(`/api/projects/${p.id}`, {method: 'DELETE'});
      renderProjectList();
    });
    grid.appendChild(card);
  }
};

// ---------- modale ----------
$('#btn-new').addEventListener('click', () => {
  $('#m-name').value = '';
  $('#m-location').value = '';
  $('#modal').hidden = false;
  $('#m-name').focus();
});
$('#m-cancel').addEventListener('click', () => ($('#modal').hidden = true));
$('#modal').addEventListener('click', (e) => {
  if (e.target === $('#modal')) $('#modal').hidden = true;
});
$('#m-create').addEventListener('click', async () => {
  const villaName = $('#m-name').value.trim();
  if (!villaName) return $('#m-name').focus();
  const p = await api('/api/projects', {
    method: 'POST',
    body: {villaName, location: $('#m-location').value.trim()},
  });
  $('#modal').hidden = true;
  showEditor(p.id);
});

$('#btn-back').addEventListener('click', showHome);

// ---------- éditeur ----------
const scheduleSave = (patch) => {
  Object.assign(project, patch);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    project = await api(`/api/projects/${project.id}`, {method: 'PATCH', body: patch});
    $('#editor-title').textContent = project.villaName;
    updateSpecs();
  }, 450);
};

const renderEditor = () => {
  $('#editor-title').textContent = project.villaName;
  $('#f-name').value = project.villaName;
  $('#f-location').value = project.location;
  $('#f-tagline').value = project.tagline;
  $$('.style-card').forEach((c) => c.classList.toggle('selected', c.dataset.style === project.styleId));
  $$('.music-item').forEach((m) => m.classList.toggle('selected', m.dataset.music === project.music));
  $$('.pill').forEach((d) => d.classList.toggle('selected', Number(d.dataset.duration) === project.durationSeconds));
  $('#render-error').hidden = true;
  $('#render-progress').hidden = true;
  renderPhotoGrid();
  renderResult();
  updateSpecs();
};

const updateSpecs = () => {
  // Estimation du nombre de scènes photo, miroir du calcul Remotion.
  const T = {luxury: [4.2, 4.6, 3.4, 1.0], cinematic: [4.4, 4.8, 3.1, 0.9], modern: [3.8, 4.2, 2.7, 0.6]}[project.styleId];
  const [intro, outro, base, trans] = T;
  const total = project.durationSeconds;
  let n = Math.max(1, Math.round((total - intro - outro + trans) / (base - trans)));
  n = Math.min(n, Math.max(1, project.photos.length));
  $('#spec-scenes').textContent = project.photos.length
    ? `Intro · ${n} tableau${n > 1 ? 'x' : ''} · Finale`
    : '—';
  const warnEl = $('#photo-warning');
  if (project.photos.length === 0) {
    warnEl.hidden = true;
  } else if (project.photos.length < config.recommendedMin) {
    warnEl.hidden = false;
    warnEl.textContent = `Conseil : importez au moins ${config.recommendedMin} photos pour un film riche (actuellement ${project.photos.length}).`;
  } else {
    warnEl.hidden = false;
    warnEl.textContent = `Selon la durée choisie, ${n} photographies seront mises en scène, réparties harmonieusement sur votre ordre.`;
  }
};

// champs texte
$('#f-name').addEventListener('input', (e) => scheduleSave({villaName: e.target.value}));
$('#f-location').addEventListener('input', (e) => scheduleSave({location: e.target.value}));
$('#f-tagline').addEventListener('input', (e) => scheduleSave({tagline: e.target.value}));

// style / musique / durée
$$('.style-card').forEach((c) =>
  c.addEventListener('click', () => {
    $$('.style-card').forEach((x) => x.classList.remove('selected'));
    c.classList.add('selected');
    scheduleSave({styleId: c.dataset.style});
  })
);
$$('.music-item').forEach((m) =>
  m.addEventListener('click', (e) => {
    if (e.target.closest('.play') && e.target.closest('.play').dataset.src) return;
    $$('.music-item').forEach((x) => x.classList.remove('selected'));
    m.classList.add('selected');
    scheduleSave({music: m.dataset.music});
  })
);
$$('.pill').forEach((d) =>
  d.addEventListener('click', () => {
    $$('.pill').forEach((x) => x.classList.remove('selected'));
    d.classList.add('selected');
    scheduleSave({durationSeconds: Number(d.dataset.duration)});
  })
);

// pré-écoute musique
const previewAudio = $('#preview-audio');
let playingBtn = null;
$$('.play[data-src]').forEach((btn) =>
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (playingBtn === btn && !previewAudio.paused) {
      previewAudio.pause();
      btn.innerHTML = '&#9654;';
      playingBtn = null;
      return;
    }
    if (playingBtn) playingBtn.innerHTML = '&#9654;';
    previewAudio.src = btn.dataset.src;
    previewAudio.play();
    btn.innerHTML = '&#10073;&#10073;';
    playingBtn = btn;
  })
);
previewAudio.addEventListener('ended', () => {
  if (playingBtn) playingBtn.innerHTML = '&#9654;';
  playingBtn = null;
});

// ---------- photos ----------
const dropzone = $('#dropzone');
const fileInput = $('#file-input');
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('drag');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag'));
dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag');
  if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
});
fileInput.addEventListener('change', () => {
  if (fileInput.files.length) uploadFiles(fileInput.files);
  fileInput.value = '';
});

const uploadFiles = async (files) => {
  const fd = new FormData();
  [...files].forEach((f) => fd.append('photos', f));
  dropzone.style.opacity = '0.5';
  try {
    const updated = await api(`/api/projects/${project.id}/photos`, {method: 'POST', body: fd});
    project = updated;
    renderPhotoGrid();
    updateSpecs();
    if (updated.rejected > 0) {
      alert(`${updated.rejected} photo(s) non importée(s) : limite de ${config.maxPhotos} photos atteinte.`);
    }
  } catch (err) {
    alert(err.message);
  } finally {
    dropzone.style.opacity = '';
  }
};

let dragSrcId = null;
const renderPhotoGrid = () => {
  const grid = $('#photo-grid');
  grid.innerHTML = '';
  $('#photo-count').textContent = project.photos.length ? `${project.photos.length} / ${config.maxPhotos}` : '';
  project.photos.forEach((ph, i) => {
    const card = document.createElement('div');
    card.className = 'photo-card';
    card.draggable = true;
    card.dataset.id = ph.id;
    card.innerHTML = `
      <img src="${ph.url}" alt="" loading="lazy" />
      <div class="photo-num">${String(i + 1).padStart(2, '0')}</div>
      <button class="photo-x" title="Retirer">&#215;</button>
      <input class="photo-label" type="text" maxlength="40" placeholder="Libellé (Salon…)" />
    `;
    card.querySelector('.photo-label').value = ph.label || '';
    card.querySelector('.photo-x').addEventListener('click', async () => {
      project = await api(`/api/projects/${project.id}/photos/${ph.id}`, {method: 'DELETE'});
      renderPhotoGrid();
      updateSpecs();
    });
    card.querySelector('.photo-label').addEventListener('input', (e) => {
      ph.label = e.target.value;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        api(`/api/projects/${project.id}`, {method: 'PATCH', body: {labels: {[ph.id]: e.target.value}}});
      }, 450);
    });
    card.querySelector('.photo-label').addEventListener('mousedown', (e) => e.stopPropagation());
    card.querySelector('.photo-label').addEventListener('dragstart', (e) => e.preventDefault());

    card.addEventListener('dragstart', (e) => {
      dragSrcId = ph.id;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragend', () => {
      dragSrcId = null;
      $$('.photo-card').forEach((c) => c.classList.remove('dragging', 'drag-over'));
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (dragSrcId && dragSrcId !== ph.id) card.classList.add('drag-over');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
    card.addEventListener('drop', async (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      if (!dragSrcId || dragSrcId === ph.id) return;
      const ids = project.photos.map((x) => x.id);
      const from = ids.indexOf(dragSrcId);
      const to = ids.indexOf(ph.id);
      ids.splice(to, 0, ids.splice(from, 1)[0]);
      project.photos = ids.map((pid) => project.photos.find((x) => x.id === pid));
      renderPhotoGrid();
      project = await api(`/api/projects/${project.id}`, {method: 'PATCH', body: {order: ids}});
      renderPhotoGrid();
      updateSpecs();
    });
    grid.appendChild(card);
  });
};

// ---------- rendu ----------
const STATE_LABELS = {
  starting: 'Initialisation…',
  bundling: 'Préparation du moteur…',
  preparing: 'Composition des scènes…',
  rendering: 'Rendu du film',
  finalizing: 'Finalisation…',
};

$('#btn-render').addEventListener('click', async () => {
  $('#render-error').hidden = true;
  try {
    clearTimeout(saveTimer);
    await api(`/api/projects/${project.id}`, {
      method: 'PATCH',
      body: {
        villaName: project.villaName,
        location: project.location,
        tagline: project.tagline,
        styleId: project.styleId,
        music: project.music,
        durationSeconds: project.durationSeconds,
      },
    });
    await api(`/api/projects/${project.id}/render`, {method: 'POST'});
    $('#btn-render').disabled = true;
    $('#render-progress').hidden = false;
    $('#progress-bar').style.width = '0%';
    $('#progress-label').textContent = 'Initialisation…';
  } catch (err) {
    $('#render-error').hidden = false;
    $('#render-error').textContent = err.message;
  }
});

const startStatusPolling = () => {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (!project || $('#view-editor').hidden) return;
    try {
      const s = await api(`/api/projects/${project.id}/render/status`);
      const running = s.running;
      $('#btn-render').disabled = running;
      if (running || ['starting', 'bundling', 'preparing', 'rendering'].includes(s.state)) {
        $('#render-progress').hidden = false;
        const pct = Math.round((s.progress || 0) * 100);
        $('#progress-bar').style.width = `${s.state === 'rendering' ? pct : Math.min(pct, 12)}%`;
        $('#progress-label').textContent =
          s.state === 'rendering' ? `Rendu du film — ${pct} %` : STATE_LABELS[s.state] || 'En cours…';
      } else {
        $('#render-progress').hidden = true;
        if (s.state === 'error') {
          $('#render-error').hidden = false;
          $('#render-error').textContent = `Échec du rendu : ${s.error || 'erreur inconnue'}`;
        }
        if (s.lastVideo && s.lastVideo !== project.lastVideo) {
          project.lastVideo = s.lastVideo;
          renderResult(true);
        }
      }
    } catch {}
  }, 1200);
};

const renderResult = (fresh = false) => {
  const has = Boolean(project.lastVideo);
  $('#result').hidden = !has;
  if (has) {
    const url = `/api/projects/${project.id}/video?v=${encodeURIComponent(project.lastVideo)}`;
    const video = $('#result-video');
    if (fresh || !video.src.includes(encodeURIComponent(project.lastVideo))) video.src = url;
    $('#btn-download').href = `/api/projects/${project.id}/video?download=1`;
  }
};

// ---------- démarrage ----------
(async () => {
  try {
    config = await api('/api/config');
  } catch {}
  const m = location.hash.match(/#p=([a-f0-9]{16})/);
  if (m) {
    try {
      await showEditor(m[1]);
      return;
    } catch {}
  }
  showHome();
})();
