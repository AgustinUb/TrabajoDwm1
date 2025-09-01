🩺 Sistema de Citas Médicas – Consultorio de Barrio

Aplicación web desarrollada en **HTML, CSS, JavaScript** (Vanilla) que permite la **gestión de citas médicas** en un consultorio.  
El proyecto incluye manejo de **roles** (paciente / administrador), persistencia en **localStorage**, y carga inicial de datos desde `data.json`.

------------------------------------------------------------
🚀 Funcionalidades

Autenticación
- Inicio de sesión con RUT y contraseña.
- Registro de nuevos pacientes.
- Roles:
  - Paciente: solo ve y gestiona sus propias citas.
  - Administrador: puede ver y gestionar todas las citas.

Citas Médicas
- Listado de citas con filtros:
  - Especialidad
  - Médico
  - Estado (Confirmada / Cancelada)
  - Fecha
  - Orden por hora ascendente/descendente
- Crear nuevas citas:
  - Validación de RUT, email, fecha futura y disponibilidad de horario.
  - Modal de confirmación antes de guardar.
- Editar citas existentes.
- Cancelar citas (con confirmación).
- Persistencia en localStorage.

Interfaz
- Diseño responsivo.
- TailwindCSS + estilos personalizados (styles.css).
- Notificaciones tipo toast y uso de modales.
- Pantallas:
  - Login
  - Registro
  - Cuenta creada
  - Listado de citas
  - Reservar nueva cita
  - Editar cita

------------------------------------------------------------
📂 Estructura del proyecto

citas/
├── index.html       # Estructura principal de la aplicación
├── styles.css       # Estilos personalizados
├── script.js        # Lógica de la aplicación (JS Vanilla)
├── data.json        # Datos iniciales (usuarios, doctores, citas de prueba)
└── README.txt       # Documentación del proyecto

------------------------------------------------------------
⚙️ Requisitos

- Navegador moderno (Chrome, Firefox, Edge, Safari).
- Servidor web local para servir archivos:
  - XAMPP
  - MAMP
  - Live Server (VS Code)
  - o simplemente con Python:
    python -m http.server 8000

⚠️ Importante: No abrir con file://, ya que fetch('./data.json') necesita un servidor.

------------------------------------------------------------
▶️ Cómo ejecutar

1. Coloca la carpeta del proyecto dentro de tu servidor local, por ejemplo en XAMPP:
   C:\xampp\htdocs\citas\
2. Inicia Apache desde el panel de XAMPP.
3. Abre en el navegador:
   http://localhost/citas/
4. Inicia sesión con las credenciales de prueba:

   - Paciente
     - RUT: 11.111.111-1
     - Pass: paciente123
   - Administrador
     - RUT: 22.222.222-2
     - Pass: admin123

------------------------------------------------------------
🧪 Datos de prueba (data.json)

- Usuarios de prueba (paciente y admin).
- Doctores y especialidades preconfigurados.
- Citas futuras cargadas para probar los filtros.

------------------------------------------------------------
📌 Observaciones

- El sistema usa localStorage para persistir la información después de crear/editar citas.
- Si quieres resetear los datos al estado inicial (data.json):
  - Abre la consola del navegador (F12 → Console) y ejecuta:

    localStorage.removeItem('medicalAppData');

  - Recarga la página.

------------------------------------------------------------
✨ Autor

Proyecto desarrollado como caso práctico de Desarrollo Web y Móvil.  
Implementado en Figma (prototipo) + Visual Studio Code (código).
