const API_ROOT = "http://localhost:5021";
const API_BASE = `${API_ROOT}/api/photos`;

const LS_KEYS = { favorites: "pa_favorites", trash: "pa_trash", albums: "pa_albums", usuario: "pa_usuario" };

let allPhotos = [];
let favorites = loadSet(LS_KEYS.favorites);
let trash = loadSet(LS_KEYS.trash);
let albums = loadAlbums();
let currentView = "photos";
let currentAlbumId = null;
let lightboxPhotoId = null;
let searchTerm = "";
let usuarioActual = loadUsuario();

function loadSet(key) {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); }
  catch { return new Set(); }
}
function saveSet(key, set) { localStorage.setItem(key, JSON.stringify([...set])); }
function loadAlbums() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.albums) || "[]"); }
  catch { return []; }
}
function saveAlbums() { localStorage.setItem(LS_KEYS.albums, JSON.stringify(albums)); }
function loadUsuario() {
  try { return JSON.parse(localStorage.getItem(LS_KEYS.usuario) || "null"); }
  catch { return null; }
}
function saveUsuario(usuario) { localStorage.setItem(LS_KEYS.usuario, JSON.stringify(usuario)); }
function clearUsuario() { localStorage.removeItem(LS_KEYS.usuario); }

function authHeaders() {
  return usuarioActual ? { "X-Usuario-Id": String(usuarioActual.id) } : {};
}

const loginScreen = document.getElementById("loginScreen");
const appRoot = document.getElementById("appRoot");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginError = document.getElementById("loginError");
const showRegisterLink = document.getElementById("showRegister");
const showLoginLink = document.getElementById("showLogin");

function isLoggedIn() {
  return !!usuarioActual;
}

async function loginUser(email, password) {
  try {
    const res = await fetch(`${API_ROOT}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) return { ok: false, message: await res.text() };
    const usuario = await res.json();
    return { ok: true, usuario };
  } catch {
    return { ok: false, message: "No se pudo conectar con el servidor." };
  }
}

async function registerUser(nombreUsuario, email, password) {
  try {
    const res = await fetch(`${API_ROOT}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombreUsuario, email, password })
    });
    if (!res.ok) return { ok: false, message: await res.text() };
    const usuario = await res.json();
    return { ok: true, usuario };
  } catch {
    return { ok: false, message: "No se pudo conectar con el servidor." };
  }
}

function showApp() {
  loginScreen.classList.add("hidden");
  appRoot.classList.remove("hidden");
  loadPhotos();
}

function showLogin() {
  appRoot.classList.add("hidden");
  loginScreen.classList.remove("hidden");
}

function logout() {
  clearUsuario();
  usuarioActual = null;
  loginForm.reset();
  registerForm.reset();
  switchToLogin();
  showLogin();
}

function switchToRegister() {
  loginForm.classList.add("hidden");
  registerForm.classList.remove("hidden");
  showRegisterLink.classList.add("hidden");
  showLoginLink.classList.remove("hidden");
  loginError.classList.add("hidden");
}
function switchToLogin() {
  registerForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
  showLoginLink.classList.add("hidden");
  showRegisterLink.classList.remove("hidden");
  loginError.classList.add("hidden");
}
showRegisterLink.addEventListener("click", switchToRegister);
showLoginLink.addEventListener("click", switchToLogin);

loginForm.addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("loginUser").value.trim();
  const pass = document.getElementById("loginPass").value;
  const result = await loginUser(email, pass);
  if (result.ok) {
    usuarioActual = result.usuario;
    saveUsuario(usuarioActual);
    showApp();
  } else {
    loginError.textContent = result.message || "Correo o contraseña incorrectos.";
    loginError.classList.remove("hidden");
  }
});

registerForm.addEventListener("submit", async e => {
  e.preventDefault();
  const nombre = document.getElementById("registerNombre").value.trim();
  const email = document.getElementById("registerUser").value.trim();
  const pass = document.getElementById("registerPass").value;
  const passConfirm = document.getElementById("registerPassConfirm").value;

  if (pass !== passConfirm) {
    loginError.textContent = "Las contraseñas no coinciden.";
    loginError.classList.remove("hidden");
    return;
  }

  const result = await registerUser(nombre, email, pass);
  if (result.ok) {
    usuarioActual = result.usuario;
    saveUsuario(usuarioActual);
    showApp();
  } else {
    loginError.textContent = result.message || "No se pudo crear la cuenta.";
    loginError.classList.remove("hidden");
  }
});

const themeToggleBtn = document.getElementById("theme-toggle");

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("pa_theme", theme);
}
applyTheme(localStorage.getItem("pa_theme") || "dark");

themeToggleBtn.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "light" ? "dark" : "light";
  applyTheme(newTheme);
});

const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", logout);

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const hamburgerBtn = document.getElementById("hamburgerBtn");
const closeSidebarBtn = document.getElementById("closeSidebar");

function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.remove("hidden");
  hamburgerBtn.setAttribute("aria-expanded", "true");
  hamburgerBtn.classList.add("active");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.add("hidden");
  hamburgerBtn.setAttribute("aria-expanded", "false");
  hamburgerBtn.classList.remove("active");
}
hamburgerBtn.addEventListener("click", () => {
  sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
});
closeSidebarBtn.addEventListener("click", closeSidebar);
sidebarOverlay.addEventListener("click", closeSidebar);

const fileInput = document.getElementById("fileInput");
const dropZone = document.getElementById("dropZone");
const uploadProgress = document.getElementById("uploadProgress");
const searchInput = document.getElementById("searchInput");

const views = {
  photos: document.getElementById("view-photos"),
  albums: document.getElementById("view-albums"),
  "album-detail": document.getElementById("view-album-detail"),
  favorites: document.getElementById("view-favorites"),
  trash: document.getElementById("view-trash"),
};
const navItems = document.querySelectorAll(".nav-item");

const gallery = document.getElementById("gallery");
const emptyPhotos = document.getElementById("emptyPhotos");
const albumsGrid = document.getElementById("albumsGrid");
const newAlbumCard = document.getElementById("newAlbumCard");
const albumGallery = document.getElementById("albumGallery");
const emptyAlbum = document.getElementById("emptyAlbum");
const albumDetailTitle = document.getElementById("albumDetailTitle");
const favoritesGallery = document.getElementById("favoritesGallery");
const emptyFavorites = document.getElementById("emptyFavorites");
const trashGallery = document.getElementById("trashGallery");
const emptyTrash = document.getElementById("emptyTrash");

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const closeLightboxBtn = document.getElementById("closeLightbox");
const favBtn = document.getElementById("favBtn");
const addToAlbumBtn = document.getElementById("addToAlbumBtn");
const deletePhotoBtn = document.getElementById("deletePhoto");

const albumPickerModal = document.getElementById("albumPickerModal");
const albumPickerList = document.getElementById("albumPickerList");
const newAlbumNameInline = document.getElementById("newAlbumNameInline");
const createAlbumInlineBtn = document.getElementById("createAlbumInlineBtn");
const closeAlbumPicker = document.getElementById("closeAlbumPicker");

navItems.forEach(btn => {
  btn.addEventListener("click", () => { switchView(btn.dataset.view); closeSidebar(); });
});
document.getElementById("backToAlbums").addEventListener("click", () => switchView("albums"));

function switchView(view) {
  currentView = view;
  navItems.forEach(b => b.classList.toggle("active", b.dataset.view === view));
  Object.entries(views).forEach(([key, el]) => el.classList.toggle("hidden", key !== view));
  render();
}

async function loadPhotos() {
  try {
    const res = await fetch(API_BASE, { headers: authHeaders() });
    if (!res.ok) throw new Error("No se pudo cargar la galería");
    allPhotos = await res.json();
  } catch (err) {
    console.error(err);
    gallery.innerHTML = `<p class="empty-state">No se pudo conectar con la API (${API_BASE}). ¿Está corriendo el backend?</p>`;
  }
  render();
}

function render() {
  const visible = allPhotos.filter(p => !trash.has(p.id));
  const filtered = searchTerm
    ? visible.filter(p => p.fileName.toLowerCase().includes(searchTerm))
    : visible;

  if (currentView === "photos") renderThumbs(gallery, emptyPhotos, filtered);
  if (currentView === "favorites") renderThumbs(favoritesGallery, emptyFavorites, filtered.filter(p => favorites.has(p.id)));
  if (currentView === "trash") renderThumbs(trashGallery, emptyTrash, allPhotos.filter(p => trash.has(p.id)), true);
  if (currentView === "albums") renderAlbumsGrid();
  if (currentView === "album-detail") renderAlbumDetail();
}

function renderThumbs(container, emptyEl, photos, isTrash = false) {
  container.querySelectorAll(".photo-thumb").forEach(el => el.remove());
  emptyEl.classList.toggle("hidden", photos.length > 0);

  photos.forEach(photo => {
    const div = document.createElement("div");
    div.className = "photo-thumb";
    const favMark = favorites.has(photo.id) ? '<span class="fav-badge">★</span>' : "";
    div.innerHTML = `<img src="${photo.url}" alt="${photo.fileName}" loading="lazy" />${favMark}`;

    if (isTrash) {
      div.addEventListener("click", () => trashActionMenu(photo));
    } else {
      div.addEventListener("click", () => openLightbox(photo));
    }
    container.appendChild(div);
  });
}

function trashActionMenu(photo) {
  const restore = confirm(`"${photo.fileName}"\n\nAceptar = Restaurar\nCancelar = Eliminar definitivamente`);
  if (restore) {
    trash.delete(photo.id);
    saveSet(LS_KEYS.trash, trash);
    render();
  } else {
    if (confirm("Esto borra la foto de forma permanente de Azure. ¿Continuar?")) {
      permanentlyDelete(photo.id);
    }
  }
}

function renderAlbumsGrid() {
  albumsGrid.querySelectorAll(".album-card:not(.new-album)").forEach(el => el.remove());

  albums.forEach(album => {
    const coverPhoto = allPhotos.find(p => album.photoIds.includes(p.id) && !trash.has(p.id));
    const card = document.createElement("div");
    card.className = "album-card";
    card.innerHTML = `
      <div class="album-cover ${coverPhoto ? "" : "empty"}">
        ${coverPhoto ? `<img src="${coverPhoto.url}" alt="${album.name}" />` : "Sin foto"}
      </div>
      <div class="album-name">${album.name}</div>
      <div class="album-count">${album.photoIds.length} foto(s)</div>
    `;
    card.addEventListener("click", () => openAlbum(album.id));
    albumsGrid.appendChild(card);
  });
}
newAlbumCard.addEventListener("click", () => {
  const name = prompt("Nombre del álbum:");
  if (name && name.trim()) createAlbum(name.trim());
});

function createAlbum(name) {
  const album = { id: crypto.randomUUID(), name, photoIds: [] };
  albums.push(album);
  saveAlbums();
  render();
  return album;
}

function openAlbum(id) {
  currentAlbumId = id;
  switchView("album-detail");
}

function renderAlbumDetail() {
  const album = albums.find(a => a.id === currentAlbumId);
  if (!album) { switchView("albums"); return; }
  albumDetailTitle.textContent = album.name;
  const photos = allPhotos.filter(p => album.photoIds.includes(p.id) && !trash.has(p.id));
  renderThumbs(albumGallery, emptyAlbum, photos);
}

document.getElementById("renameAlbumBtn").addEventListener("click", () => {
  const album = albums.find(a => a.id === currentAlbumId);
  if (!album) return;
  const name = prompt("Nuevo nombre:", album.name);
  if (name && name.trim()) { album.name = name.trim(); saveAlbums(); renderAlbumDetail(); }
});
document.getElementById("deleteAlbumBtn").addEventListener("click", () => {
  if (!confirm("¿Eliminar este álbum? Las fotos no se borran, solo el álbum.")) return;
  albums = albums.filter(a => a.id !== currentAlbumId);
  saveAlbums();
  switchView("albums");
});

async function uploadFiles(files) {
  if (!files.length) return;
  uploadProgress.classList.remove("hidden");

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    uploadProgress.textContent = `Subiendo ${i + 1} de ${files.length}: ${file.name}...`;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${API_BASE}/upload`, { method: "POST", headers: authHeaders(), body: formData });
      if (!res.ok) console.error("Error subiendo", file.name, await res.text());
    } catch (err) {
      console.error("Error de red subiendo", file.name, err);
    }
  }

  uploadProgress.classList.add("hidden");
  fileInput.value = "";
  await loadPhotos();
}

function openLightbox(photo) {
  lightboxPhotoId = photo.id;
  lightboxImg.src = photo.url;
  favBtn.classList.toggle("active", favorites.has(photo.id));
  lightbox.classList.remove("hidden");
}
function closeLightboxFn() {
  lightbox.classList.add("hidden");
  lightboxImg.src = "";
  lightboxPhotoId = null;
}
closeLightboxBtn.addEventListener("click", closeLightboxFn);
lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightboxFn(); });

favBtn.addEventListener("click", () => {
  if (!lightboxPhotoId) return;
  if (favorites.has(lightboxPhotoId)) favorites.delete(lightboxPhotoId);
  else favorites.add(lightboxPhotoId);
  saveSet(LS_KEYS.favorites, favorites);
  favBtn.classList.toggle("active", favorites.has(lightboxPhotoId));
  render();
});

deletePhotoBtn.addEventListener("click", () => {
  if (!lightboxPhotoId) return;
  if (!confirm("Mover esta foto a la papelera?")) return;
  trash.add(lightboxPhotoId);
  saveSet(LS_KEYS.trash, trash);
  closeLightboxFn();
  render();
});

async function permanentlyDelete(photoId) {
  try {
    await fetch(`${API_BASE}/${photoId}`, { method: "DELETE", headers: authHeaders() });
  } catch (err) { console.error(err); }
  trash.delete(photoId);
  saveSet(LS_KEYS.trash, trash);
  allPhotos = allPhotos.filter(p => p.id !== photoId);
  albums.forEach(a => { a.photoIds = a.photoIds.filter(id => id !== photoId); });
  saveAlbums();
  render();
}

addToAlbumBtn.addEventListener("click", () => {
  if (!lightboxPhotoId) return;
  renderAlbumPicker();
  albumPickerModal.classList.remove("hidden");
});
closeAlbumPicker.addEventListener("click", () => albumPickerModal.classList.add("hidden"));

function renderAlbumPicker() {
  albumPickerList.innerHTML = "";
  if (albums.length === 0) {
    albumPickerList.innerHTML = `<p style="color:var(--text-dim); font-size:0.85rem;">No tienes álbumes aún. Crea uno abajo.</p>`;
  }
  albums.forEach(album => {
    const inAlbum = album.photoIds.includes(lightboxPhotoId);
    const item = document.createElement("div");
    item.className = "album-picker-item" + (inAlbum ? " in-album" : "");
    item.innerHTML = `<span>${album.name}</span><span>${inAlbum ? "✓" : "+"}</span>`;
    item.addEventListener("click", () => {
      if (inAlbum) album.photoIds = album.photoIds.filter(id => id !== lightboxPhotoId);
      else album.photoIds.push(lightboxPhotoId);
      saveAlbums();
      renderAlbumPicker();
    });
    albumPickerList.appendChild(item);
  });
}

createAlbumInlineBtn.addEventListener("click", () => {
  const name = newAlbumNameInline.value.trim();
  if (!name) return;
  const album = createAlbum(name);
  album.photoIds.push(lightboxPhotoId);
  saveAlbums();
  newAlbumNameInline.value = "";
  renderAlbumPicker();
});

searchInput.addEventListener("input", e => {
  searchTerm = e.target.value.trim().toLowerCase();
  render();
});

fileInput.addEventListener("change", e => uploadFiles(Array.from(e.target.files)));
["dragenter", "dragover"].forEach(evt =>
  dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.add("drag-over"); })
);
["dragleave", "drop"].forEach(evt =>
  dropZone.addEventListener(evt, e => { e.preventDefault(); dropZone.classList.remove("drag-over"); })
);
dropZone.addEventListener("drop", e => uploadFiles(Array.from(e.dataTransfer.files)));

if (isLoggedIn()) showApp(); else showLogin();

const openCameraBtn = document.getElementById("openCameraBtn");
const cameraModal = document.getElementById("cameraModal");
const cameraVideo = document.getElementById("cameraVideo");
const cameraCanvas = document.getElementById("cameraCanvas");
const cameraError = document.getElementById("cameraError");
const captureBtn = document.getElementById("captureBtn");
const closeCameraBtn = document.getElementById("closeCameraBtn");
let cameraStream = null;

async function openCamera() {
  cameraError.classList.add("hidden");
  cameraModal.classList.remove("hidden");
  closeSidebar();

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false
    });
  } catch {
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    } catch {
      cameraError.textContent = "No se pudo acceder a la cámara. Revisa los permisos del navegador.";
      cameraError.classList.remove("hidden");
      return;
    }
  }

  cameraVideo.srcObject = cameraStream;
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  cameraVideo.srcObject = null;
}

function closeCamera() {
  stopCamera();
  cameraModal.classList.add("hidden");
}

openCameraBtn.addEventListener("click", openCamera);
closeCameraBtn.addEventListener("click", closeCamera);
cameraModal.addEventListener("click", e => { if (e.target === cameraModal) closeCamera(); });

captureBtn.addEventListener("click", () => {
  if (!cameraStream) return;

  cameraCanvas.width = cameraVideo.videoWidth;
  cameraCanvas.height = cameraVideo.videoHeight;
  const ctx = cameraCanvas.getContext("2d");
  ctx.drawImage(cameraVideo, 0, 0, cameraCanvas.width, cameraCanvas.height);

  cameraCanvas.toBlob(blob => {
    if (!blob) return;
    const file = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
    closeCamera();
    uploadFiles([file]);
  }, "image/jpeg", 0.92);
});
