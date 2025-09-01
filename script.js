// ==========================
// Helpers de fecha
// ==========================

// Convierte "YYYY-MM-DD" a Date en UTC (00:00 UTC)
function dateFromYMD_UTC(yyyyMmDd) {
  const [y, m, d] = (yyyyMmDd || '').split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

// Devuelve "YYYY-MM-DD" usando la hora local (sin UTC)
function localISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ==========================
// Estado global de la app
// ==========================
class AppState {
  constructor() {
    this.currentUser = null;
    this.currentScreen = 'login';
    this.users = [];
    this.appointments = [];
    this.specialties = [];
    this.doctors = [];
    this.editingAppointment = null;
    this.filteredAppointments = [];
    this.hasSavedData = false;

    // Intentar cargar datos guardados
    const savedData = localStorage.getItem('medicalAppData');
    if (savedData) {
      const data = JSON.parse(savedData);
      this.users = Array.from(data.users || []);
      this.appointments = Array.from(data.appointments || []);
      this.specialties = Array.from(data.specialties || []);
      this.doctors = Array.from(data.doctors || []);
      this.filteredAppointments = Array.from(this.appointments);
      this.hasSavedData = true;

      // Migrar roles guardados en español, si existieran
      this.users = this.users.map(u => {
        const rr = (u.role || '').toString().trim().toLowerCase();
        return { ...u, role: rr === 'admin' || rr === 'administrador' ? 'admin' : 'patient' };
      });
    }

    this.init();
  }

  async init() {
    try {
      document.getElementById('loading-screen').style.display = 'flex';

      if (!this.hasSavedData) {
        const response = await fetch('./data.json');
        if (!response.ok) throw new Error('Error al cargar los datos');
        const data = await response.json();
        this.users = data.users || [];
        this.appointments = [...(data.appointments || [])];
        this.specialties = [...(data.specialties || [])];
        this.doctors = [...(data.doctors || [])];
        this.filteredAppointments = [...this.appointments];
      }

      this.setupEventListeners();
      this.hideLoading();
      this.showScreen('login');
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.hideLoading();
      this.showToast('Error cargando la aplicación', 'error');
      document.getElementById('login-screen').style.display = 'block';
    }
  }

  hideLoading() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) loadingScreen.style.display = 'none';
  }

  showScreen(screenName) {
    const screenMap = { 'bookAppointment': 'book-appointment', 'editAppointment': 'edit-appointment', 'accountCreated': 'account-created' };
    const adjusted = screenMap[screenName] || screenName;
    const target = document.getElementById(`${adjusted}-screen`);
    if (!target) return;

    const appContainer = document.getElementById('app');
    if (appContainer) appContainer.style.display = 'block';

    document.querySelectorAll('.screen').forEach(s => {
      if (s !== target) { s.style.display = 'none'; s.classList.remove('active'); }
    });

    target.style.display = 'block';
    void target.offsetWidth;
    target.classList.add('active');

    this.currentScreen = screenName;
    this.initializeScreen(screenName);
  }

  initializeScreen(screenName) {
    switch (screenName) {
      case 'appointments': this.initializeAppointmentsScreen(); break;
      case 'bookAppointment': this.initializeBookAppointmentScreen(); break;
      case 'editAppointment': this.initializeEditAppointmentScreen(); break;
      case 'register': document.getElementById('register-form')?.reset(); break;
      default: break;
    }
  }

  setupEventListeners() {
    // Login / Register navegación
    document.getElementById('login-form')?.addEventListener('submit', (e) => this.handleLogin(e));
    document.getElementById('go-to-register')?.addEventListener('click', () => this.showScreen('register'));
    document.getElementById('back-to-login')?.addEventListener('click', () => this.showScreen('login'));
    document.getElementById('go-to-login-from-created')?.addEventListener('click', () => this.showScreen('login'));

    // Register
    document.getElementById('register-form')?.addEventListener('submit', (e) => this.handleRegister(e));

    // Password toggles
    this.setupPasswordToggles();

    // RUT formateo
    this.setupRutFormatting();

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => this.handleLogout());

    // Navegación entre pantallas
    document.getElementById('new-appointment-btn')?.addEventListener('click', () => this.showScreen('bookAppointment'));
    document.getElementById('back-to-appointments')?.addEventListener('click', () => this.showScreen('appointments'));
    document.getElementById('back-to-appointments-from-edit')?.addEventListener('click', () => this.showScreen('appointments'));

    // Formularios de cita
    document.getElementById('book-appointment-form')?.addEventListener('submit', (e) => this.handleBookAppointment(e));
    document.getElementById('edit-appointment-form')?.addEventListener('submit', (e) => this.handleEditAppointment(e));

    // Cancel botones
    document.getElementById('cancel-book')?.addEventListener('click', () => this.showScreen('appointments'));
    document.getElementById('cancel-edit')?.addEventListener('click', () => this.showScreen('appointments'));

    // Especialidad → médicos
    document.getElementById('book-specialty')?.addEventListener('change', (e) => this.updateDoctorOptions('book', e.target.value));
    document.getElementById('edit-specialty')?.addEventListener('change', (e) => this.updateDoctorOptions('edit', e.target.value));

    // Filtros (incluye fecha y orden)
    this.setupFilters();

    // Modal
    this.setupModal();
  }

  setupPasswordToggles() {
    ['toggle-login-password', 'toggle-register-password', 'toggle-confirm-password'].forEach(id => {
      const btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const icon = btn.querySelector('i');
        if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; }
        else { input.type = 'password'; icon.className = 'fas fa-eye'; }
      });
    });
  }

  setupRutFormatting() {
    ['login-rut', 'register-rut', 'book-patient-rut', 'edit-patient-rut'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', (e) => { e.target.value = this.formatRUT(e.target.value); });
    });
  }

  setupFilters() {
    ['filter-specialty', 'filter-doctor', 'filter-status', 'filter-date', 'sort-order'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => this.applyFilters());
    });
    document.getElementById('clear-filters')?.addEventListener('click', () => this.clearFilters());
  }

  setupModal() {
    document.getElementById('modal-cancel')?.addEventListener('click', () => this.hideModal());
    document.getElementById('modal-confirm')?.addEventListener('click', () => this.confirmModalAction());
  }

  // ==========================
  // Validaciones
  // ==========================
  validateRUT(rut) {
    const clean = rut.replace(/\./g, '').replace('-', '');
    if (clean.length < 8 || clean.length > 9) return false;
    const body = clean.slice(0, -1);
    const dv = clean.slice(-1).toLowerCase();
    let sum = 0, mult = 2;
    for (let i = body.length - 1; i >= 0; i--) { sum += parseInt(body[i]) * mult; mult = mult === 7 ? 2 : mult + 1; }
    const resto = sum % 11;
    const calc = resto === 0 ? '0' : resto === 1 ? 'k' : (11 - resto).toString();
    return dv === calc;
  }

  formatRUT(rut) {
    const clean = rut.replace(/[^0-9kK]/g, '');
    if (clean.length <= 1) return clean;
    const body = clean.slice(0, -1), dv = clean.slice(-1);
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${formattedBody}-${dv}`;
  }

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // Solo compara fechas, no usa UTC ni toISOString
  validateFutureDate(dateStr) {
    const utcDate = dateFromYMD_UTC(dateStr);
    if (!utcDate) return false;
    const today = new Date();
    // Normalizamos hoy a UTC (00:00 UTC equivalente)
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    return utcDate.getTime() >= todayUTC.getTime();
  }

  // ==========================
  // Autenticación
  // ==========================
  handleLogin(e) {
    e.preventDefault();
    const rut = document.getElementById('login-rut').value.trim();
    const password = document.getElementById('login-password').value.trim();

    this.clearErrors(['login-rut-error', 'login-password-error']);
    document.getElementById('login-error').style.display = 'none';

    const errors = {};
    if (!rut) errors['login-rut-error'] = 'El RUT es obligatorio';
    else if (!this.validateRUT(rut)) errors['login-rut-error'] = 'RUT inválido';
    if (!password) errors['login-password-error'] = 'La contraseña es obligatoria';
    if (Object.keys(errors).length) { this.showErrors(errors); return; }

    const user = this.users.find(u => u.rut === rut && u.password === password);
    if (!user) {
      const ebox = document.getElementById('login-error');
      ebox.textContent = 'Credenciales incorrectas';
      ebox.style.display = 'block';
      return;
    }

    // Normalizar rol
    const role = (user.role || '').toString().trim().toLowerCase() === 'admin' ? 'admin' : 'patient';
    this.currentUser = { ...user, role };
    this.showScreen('appointments');
    this.showToast(`Bienvenido, ${user.name}`, 'success');
  }

  handleRegister(e) {
    e.preventDefault();
    const formData = {
      name: document.getElementById('register-name').value.trim(),
      rut: document.getElementById('register-rut').value.trim(),
      email: document.getElementById('register-email').value.trim(),
      password: document.getElementById('register-password').value.trim(),
      confirmPassword: document.getElementById('register-confirm-password').value.trim()
    };

    this.clearErrors(['register-name-error','register-rut-error','register-email-error','register-password-error','register-confirm-password-error']);

    const errors = {};
    if (!formData.name) errors['register-name-error'] = 'El nombre es obligatorio';
    if (!formData.rut) errors['register-rut-error'] = 'El RUT es obligatorio';
    else if (!this.validateRUT(formData.rut)) errors['register-rut-error'] = 'RUT inválido';
    else if (this.users.some(u => u.rut === formData.rut)) errors['register-rut-error'] = 'Este RUT ya está registrado';
    if (!formData.email) errors['register-email-error'] = 'El email es obligatorio';
    else if (!this.validateEmail(formData.email)) errors['register-email-error'] = 'Email inválido';
    if (!formData.password) errors['register-password-error'] = 'La contraseña es obligatoria';
    else if (formData.password.length < 6) errors['register-password-error'] = 'Mínimo 6 caracteres';
    if (!formData.confirmPassword) errors['register-confirm-password-error'] = 'Confirma tu contraseña';
    else if (formData.password !== formData.confirmPassword) errors['register-confirm-password-error'] = 'Las contraseñas no coinciden';

    if (Object.keys(errors).length) { this.showErrors(errors); return; }

    try {
      const newUser = {
        id: Date.now().toString(),
        name: formData.name,
        rut: formData.rut,
        email: formData.email,
        password: formData.password,
        role: 'patient'
      };
      this.users.push(newUser);

      localStorage.setItem('medicalAppData', JSON.stringify({
        users: this.users,
        appointments: this.appointments,
        specialties: this.specialties,
        doctors: this.doctors
      }));

      document.getElementById('register-form').reset();
      this.showScreen('accountCreated');
      this.showToast('Cuenta creada exitosamente', 'success');
    } catch (err) {
      console.error('Error al registrar usuario:', err);
      this.showToast('Error al crear la cuenta', 'error');
    }
  }

  handleLogout() {
    this.currentUser = null;
    this.editingAppointment = null;
    this.showScreen('login');
    document.getElementById('login-form')?.reset();
    this.showToast('Sesión cerrada correctamente', 'info');
  }

  // ==========================
  // Pantalla de citas
  // ==========================
  initializeAppointmentsScreen() {
    if (!this.currentUser) { this.showScreen('login'); return; }
    const userName = document.getElementById('user-name');
    const userRole = document.getElementById('user-role');
    if (userName) userName.textContent = this.currentUser.name;
    if (userRole) userRole.textContent = this.currentUser.role === 'admin' ? 'Administrador' : 'Paciente';
    this.applyFilters();
  }

  applyFilters() {
    const specialtyFilter = document.getElementById('filter-specialty')?.value || '';
    const doctorFilter = document.getElementById('filter-doctor')?.value || '';
    const statusFilter = document.getElementById('filter-status')?.value || '';
    const dateFilter = document.getElementById('filter-date')?.value || '';
    const sortOrder = document.getElementById('sort-order')?.value || '';

    const me = this.currentUser;
    const myRole = ((me?.role) || '').toString().trim().toLowerCase();

    const appointments = Array.from(this.appointments || []);
    this.filteredAppointments = appointments.filter(appointment => {
      if (myRole !== 'admin' && appointment.patientRut !== me?.rut) return false;
      if (specialtyFilter && appointment.specialty !== specialtyFilter) return false;
      if (doctorFilter && appointment.doctor !== doctorFilter) return false;
      if (statusFilter && appointment.status !== statusFilter) return false;
      if (dateFilter && appointment.date !== dateFilter) return false;
      return true;
    });

    // Ordenar por fecha y hora vía strings (evita Date/UTC)
    if (sortOrder === 'time-asc' || sortOrder === 'time-desc') {
      const dir = sortOrder === 'time-asc' ? 1 : -1;
      this.filteredAppointments.sort((a, b) => {
        const byDate = a.date.localeCompare(b.date);
        if (byDate !== 0) return byDate * dir;
        return a.time.localeCompare(b.time) * dir;
      });
    }

    this.renderAppointments();
  }

  clearFilters() {
    ['filter-specialty','filter-doctor','filter-status','filter-date','sort-order'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this.applyFilters();
  }

  renderAppointments() {
    const container = document.getElementById('appointments-container');
    const noAppointments = document.getElementById('no-appointments');
    if (!container) return;

    if (this.filteredAppointments.length === 0) {
      container.innerHTML = '';
      if (noAppointments) noAppointments.style.display = 'block';
      return;
    }
    if (noAppointments) noAppointments.style.display = 'none';

    container.innerHTML = this.filteredAppointments.map(appointment => {
      const statusClass = appointment.status === 'confirmed' ? 'confirmed' : 'cancelled';
      const statusText = appointment.status === 'confirmed' ? 'Confirmada' : 'Cancelada';
      const canEdit = this.currentUser.role === 'admin' ||
        (this.currentUser.role === 'patient' && appointment.patientRut === this.currentUser.rut);

      return `
        <div class="appointment-card">
          <div class="appointment-header">
            <div class="appointment-info">
              <div class="appointment-patient">${appointment.patientName}</div>
              <div class="appointment-rut">${appointment.patientRut}</div>
            </div>
            <div class="appointment-status ${statusClass}">${statusText}</div>
          </div>

          <div class="appointment-details">
            <div class="appointment-detail">
              <i class="fas fa-user-md"></i>
              <span>${appointment.specialty}</span>
            </div>
            <div class="appointment-detail">
              <i class="fas fa-stethoscope"></i>
              <span>${appointment.doctor}</span>
            </div>
            <div class="appointment-detail">
              <i class="fas fa-calendar"></i>
              <span>${this.formatDate(appointment.date)}</span>
            </div>
            <div class="appointment-detail">
              <i class="fas fa-clock"></i>
              <span>${appointment.time}</span>
            </div>
          </div>

          ${canEdit ? `
            <div class="appointment-actions">
              <button class="btn btn-outline" onclick="app.editAppointment('${appointment.id}')">
                <i class="fas fa-edit"></i> Editar
              </button>
              ${appointment.status === 'confirmed' ? `
                <button class="btn btn-destructive" onclick="app.cancelAppointment('${appointment.id}')">
                  <i class="fas fa-times"></i> Cancelar
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  // Mostrar fecha SIN desfase (UTC fijo)
  formatDate(dateString) {
    const dUTC = dateFromYMD_UTC(dateString);
    if (!dUTC) return dateString || '';
    return dUTC.toLocaleDateString('es-CL', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'UTC'
    });
  }

  // ==========================
  // Reservar cita
  // ==========================
  initializeBookAppointmentScreen() {
    if (this.currentUser.role === 'patient') {
      document.getElementById('book-patient-name').value = this.currentUser.name;
      document.getElementById('book-patient-rut').value = this.currentUser.rut;
      document.getElementById('book-patient-name').disabled = true;
      document.getElementById('book-patient-rut').disabled = true;
    } else {
      document.getElementById('book-patient-name').disabled = false;
      document.getElementById('book-patient-rut').disabled = false;
    }

    document.getElementById('book-specialty').value = '';
    document.getElementById('book-doctor').value = '';
    document.getElementById('book-date').value = '';
    document.getElementById('book-time').value = '';

    // min(fecha) local (no UTC)
    const today = new Date(); today.setHours(0,0,0,0);
    const iso = localISODate(today);
    document.getElementById('book-date')?.setAttribute('min', iso);

    this.updateDoctorOptions('book', '');
  }

  updateDoctorOptions(formType, specialty) {
    const select = document.getElementById(`${formType}-doctor`);
    if (!select) return;
    select.innerHTML = '<option value="">Selecciona un médico</option>';
    if (!specialty) return;
    const filtered = this.doctors.filter(d => d.specialty === specialty);
    filtered.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.name;
      opt.textContent = d.name;
      select.appendChild(opt);
    });
  }

  handleBookAppointment(e) {
    e.preventDefault();

    const formData = {
      patientName: document.getElementById('book-patient-name').value.trim(),
      patientRut: document.getElementById('book-patient-rut').value.trim(),
      specialty: document.getElementById('book-specialty').value,
      doctor: document.getElementById('book-doctor').value,
      date: document.getElementById('book-date').value,
      time: document.getElementById('book-time').value
    };

    this.clearErrors(['book-patient-name-error','book-patient-rut-error','book-specialty-error','book-doctor-error','book-date-error','book-time-error']);

    const errors = {};
    if (!formData.patientName) errors['book-patient-name-error'] = 'El nombre es obligatorio';
    if (!formData.patientRut) errors['book-patient-rut-error'] = 'El RUT es obligatorio';
    else if (!this.validateRUT(formData.patientRut)) errors['book-patient-rut-error'] = 'RUT inválido';
    if (!formData.specialty) errors['book-specialty-error'] = 'Selecciona una especialidad';
    if (!formData.doctor) errors['book-doctor-error'] = 'Selecciona un médico';
    if (!formData.date) errors['book-date-error'] = 'Selecciona una fecha';
    else if (!this.validateFutureDate(formData.date)) errors['book-date-error'] = 'La fecha debe ser futura';
    if (!formData.time) errors['book-time-error'] = 'Selecciona una hora';
    if (Object.keys(errors).length) { this.showErrors(errors); return; }

    // Conflicto por doctor+fecha+hora confirmada
    const conflict = this.appointments.some(apt =>
      apt.doctor === formData.doctor &&
      apt.date === formData.date &&
      apt.time === formData.time &&
      apt.status === 'confirmed'
    );
    if (conflict) { this.showErrors({ 'book-time-error': 'El médico ya tiene una cita en ese horario' }); return; }

    // Confirmación
    this.showModal(
      'Confirmar reserva',
      `¿Confirmas la cita con ${formData.doctor} (${formData.specialty}) el ${this.formatDate(formData.date)} a las ${formData.time}?`,
      () => {
        const newAppointment = { id: Date.now().toString(), ...formData, status: 'confirmed' };
        this.appointments = Array.from(this.appointments || []);
        this.appointments.push(newAppointment);

        localStorage.setItem('medicalAppData', JSON.stringify({
          users: this.users, appointments: this.appointments,
          specialties: this.specialties, doctors: this.doctors
        }));

        this.filteredAppointments = Array.from(this.appointments);
        this.applyFilters();
        this.hideModal();
        this.showScreen('appointments');
        this.showToast('Cita reservada exitosamente', 'success');
      }
    );
  }

  // ==========================
  // Editar cita
  // ==========================
  editAppointment(id) {
    const appointment = this.appointments.find(a => a.id === id);
    if (!appointment) return;
    this.editingAppointment = appointment;
    this.showScreen('editAppointment');
  }

  initializeEditAppointmentScreen() {
    if (!this.editingAppointment) { this.showScreen('appointments'); return; }
    const a = this.editingAppointment;

    document.getElementById('edit-patient-name').value = a.patientName;
    document.getElementById('edit-patient-rut').value = a.patientRut;
    document.getElementById('edit-specialty').value = a.specialty;
    document.getElementById('edit-date').value = a.date;
    document.getElementById('edit-time').value = a.time;

    const today = new Date(); today.setHours(0,0,0,0);
    const iso = localISODate(today);
    document.getElementById('edit-date')?.setAttribute('min', iso);

    this.updateDoctorOptions('edit', a.specialty);
    setTimeout(() => { document.getElementById('edit-doctor').value = a.doctor; }, 100);

    if (this.currentUser.role === 'patient') {
      document.getElementById('edit-patient-name').disabled = true;
      document.getElementById('edit-patient-rut').disabled = true;
    } else {
      document.getElementById('edit-patient-name').disabled = false;
      document.getElementById('edit-patient-rut').disabled = false;
    }
  }

  handleEditAppointment(e) {
    e.preventDefault();
    if (!this.editingAppointment) return;

    const formData = {
      patientName: document.getElementById('edit-patient-name').value.trim(),
      patientRut: document.getElementById('edit-patient-rut').value.trim(),
      specialty: document.getElementById('edit-specialty').value,
      doctor: document.getElementById('edit-doctor').value,
      date: document.getElementById('edit-date').value,
      time: document.getElementById('edit-time').value
    };

    this.clearErrors(['edit-patient-name-error','edit-patient-rut-error','edit-specialty-error','edit-doctor-error','edit-date-error','edit-time-error']);

    const errors = {};
    if (!formData.patientName) errors['edit-patient-name-error'] = 'El nombre es obligatorio';
    if (!formData.patientRut) errors['edit-patient-rut-error'] = 'El RUT es obligatorio';
    else if (!this.validateRUT(formData.patientRut)) errors['edit-patient-rut-error'] = 'RUT inválido';
    if (!formData.specialty) errors['edit-specialty-error'] = 'Selecciona una especialidad';
    if (!formData.doctor) errors['edit-doctor-error'] = 'Selecciona un médico';
    if (!formData.date) errors['edit-date-error'] = 'Selecciona una fecha';
    else if (!this.validateFutureDate(formData.date)) errors['edit-date-error'] = 'La fecha debe ser futura';
    if (!formData.time) errors['edit-time-error'] = 'Selecciona una hora';
    if (Object.keys(errors).length) { this.showErrors(errors); return; }

    // Conflicto (excluye la cita actual)
    const conflict = this.appointments.some(apt =>
      apt.id !== this.editingAppointment.id &&
      apt.doctor === formData.doctor &&
      apt.date === formData.date &&
      apt.time === formData.time &&
      apt.status === 'confirmed'
    );
    if (conflict) { this.showErrors({ 'edit-time-error': 'El médico ya tiene una cita en ese horario' }); return; }

    const index = this.appointments.findIndex(apt => apt.id === this.editingAppointment.id);
    if (index !== -1) this.appointments[index] = { ...this.appointments[index], ...formData };

    localStorage.setItem('medicalAppData', JSON.stringify({
      users: this.users, appointments: this.appointments,
      specialties: this.specialties, doctors: this.doctors
    }));

    this.editingAppointment = null;
    this.applyFilters();
    this.showScreen('appointments');
    this.showToast('Cita actualizada exitosamente', 'success');
  }

  // ==========================
  // Cancelar cita
  // ==========================
  cancelAppointment(id) {
    const appointment = this.appointments.find(apt => apt.id === id);
    if (!appointment) return;
    this.showModal(
      'Cancelar Cita',
      `¿Estás seguro de que deseas cancelar la cita de ${appointment.patientName}?`,
      () => this.confirmCancelAppointment(id)
    );
  }

  confirmCancelAppointment(id) {
    const index = this.appointments.findIndex(apt => apt.id === id);
    if (index !== -1) {
      this.appointments[index].status = 'cancelled';
      localStorage.setItem('medicalAppData', JSON.stringify({
        users: this.users, appointments: this.appointments,
        specialties: this.specialties, doctors: this.doctors
      }));
      this.applyFilters();
      this.showToast('Cita cancelada exitosamente', 'info');
    }
    this.hideModal();
  }

  // ==========================
  // Modal / Toasts / Utilidades
  // ==========================
  showModal(title, message, confirmCallback) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    document.getElementById('confirmation-modal').style.display = 'flex';
    this.modalConfirmCallback = confirmCallback;
  }
  hideModal() {
    document.getElementById('confirmation-modal').style.display = 'none';
    this.modalConfirmCallback = null;
  }
  confirmModalAction() {
    if (this.modalConfirmCallback) {
      const cb = this.modalConfirmCallback;
      this.modalConfirmCallback = null;
      cb();
    }
  }

  showToast(message, type = 'info', title = '') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toastId = `toast-${Date.now()}`;
    const iconMap = { success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', info: 'fas fa-info-circle' };
    const titleMap = { success: 'Éxito', error: 'Error', info: 'Información' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.id = toastId;
    toast.innerHTML = `
      <i class="${iconMap[type]}"></i>
      <div class="toast-content">
        <div class="toast-title">${title || titleMap[type]}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close" onclick="app.removeToast('${toastId}')">
        <i class="fas fa-times"></i>
      </button>`;
    container.appendChild(toast);
    setTimeout(() => this.removeToast(toastId), 5000);
  }

  removeToast(id) { document.getElementById(id)?.remove(); }

  showErrors(errors) {
    Object.keys(errors).forEach(errorId => {
      const el = document.getElementById(errorId);
      if (!el) return;
      el.textContent = errors[errorId];
      el.classList.add('show');
      const input = el.previousElementSibling;
      if (input && input.tagName !== 'DIV') input.classList.add('error');
      else if (input && input.classList.contains('password-input')) input.querySelector('input')?.classList.add('error');
    });
  }

  clearErrors(ids) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = '';
      el.classList.remove('show');
      const input = el.previousElementSibling;
      if (input && input.tagName !== 'DIV') input.classList.remove('error');
      else if (input && input.classList.contains('password-input')) input.querySelector('input')?.classList.remove('error');
    });
  }
}

// Inicializar
let app;
document.addEventListener('DOMContentLoaded', () => {
  try {
    app = new AppState();
    window.app = app;
  } catch (e) {
    console.error('Error al inicializar la aplicación:', e);
  }
});
