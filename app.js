/**
 * U.E. FE Y ALEGRÍA "NUEVA AMÉRICA" - SISTEMA DE PREINSCRIPCIÓN PRIMARIA
 * Lógica de Interfaz, Selector de Perfiles (Representante vs Docente),
 * Autenticación Administrativa, Panel de Recaudación y Conexión MySQL.
 * 
 * Periodo Escolar: 2026 - 2027 | Nivel: Educación Primaria (1° a 6° Grado)
 * Ubicación: San Francisco, Estado Zulia
 */

const AppState = {
    pasoActual: 1,
    rol: localStorage.getItem('fya_rol') || null, // 'representante' | 'docente' | null
    docenteAutenticado: localStorage.getItem('fya_docente_auth') === 'true',
    registros: JSON.parse(localStorage.getItem('fya_preinscripciones_db') || 'null'),
    contadorCorrelativo: 5
};

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    cargarRegistroSemillaSiVacio();
    actualizarResumenGrado();
    actualizarBadges();
    configurarLimpiezaValidacionEnTiempoReal();
    initCatalogoInstitutosZulia();
    initSistemaRoles();
});

/* ==============================================================================
   GESTIÓN DE PERFILES: REPRESENTANTE VS DOCENTE (CON CLAVE ÚNICA)
   ============================================================================== */
function initSistemaRoles() {
    if (!AppState.rol) {
        // Mostrar modal inicial para elegir rol
        abrirModal('modalSeleccionRol');
    } else {
        aplicarModoPerfil(AppState.rol);
    }
}

function abrirSelectorRol() {
    abrirModal('modalSeleccionRol');
}

function seleccionarRol(rol) {
    if (rol === 'representante') {
        AppState.rol = 'representante';
        AppState.docenteAutenticado = false;
        localStorage.setItem('fya_rol', 'representante');
        localStorage.setItem('fya_docente_auth', 'false');
        cerrarModal('modalSeleccionRol');
        aplicarModoPerfil('representante');
        mostrarToast('Perfil Representante', 'Bienvenido. Diligencia la solicitud para Educación Primaria 2026-2027.');
    } else if (rol === 'docente') {
        if (AppState.docenteAutenticado) {
            AppState.rol = 'docente';
            localStorage.setItem('fya_rol', 'docente');
            cerrarModal('modalSeleccionRol');
            aplicarModoPerfil('docente');
        } else {
            // Solicitar clave única de administrador
            cerrarModal('modalSeleccionRol');
            document.getElementById('loginErrorMsg').style.display = 'none';
            document.getElementById('formLoginDocente').reset();
            abrirModal('modalLoginDocente');
            setTimeout(() => {
                document.getElementById('adminUsername').focus();
            }, 250);
        }
    }
}

function manejarLoginDocente(e) {
    e.preventDefault();
    const user = document.getElementById('adminUsername').value.trim().toLowerCase();
    const pass = document.getElementById('adminPassword').value.trim();
    const errorDiv = document.getElementById('loginErrorMsg');

    // Validación de credencial única de administrador / docente
    // Acepta usuario 'admin' con clave 'feyalegria2026' (o 'docente'/'admin123')
    if ((user === 'admin' && pass === 'feyalegria2026') || 
        (user === 'docente' && pass === 'feyalegria2026') || 
        (user === 'admin' && pass === 'admin123')) {
        
        AppState.rol = 'docente';
        AppState.docenteAutenticado = true;
        localStorage.setItem('fya_rol', 'docente');
        localStorage.setItem('fya_docente_auth', 'true');

        cerrarModal('modalLoginDocente');
        aplicarModoPerfil('docente');
        mostrarToast('Sesión Iniciada', 'Bienvenido al Panel de Control de Estudios e Información Recaudada.');
    } else {
        errorDiv.style.display = 'block';
        mostrarToast('Acceso Denegado', 'Usuario o contraseña incorrectos.', 'error');
    }
}

function cerrarSesionDocente() {
    AppState.rol = 'representante';
    AppState.docenteAutenticado = false;
    localStorage.setItem('fya_rol', 'representante');
    localStorage.setItem('fya_docente_auth', 'false');

    aplicarModoPerfil('representante');
    mostrarToast('Sesión Cerrada', 'Has vuelto al perfil de Representante.');
}

function aplicarModoPerfil(rol) {
    const body = document.body;
    const badge = document.getElementById('roleBadgeIndicator');
    const badgeText = document.getElementById('roleBadgeText');
    const badgeIcon = document.getElementById('roleBadgeIcon');
    const btnCerrarSesion = document.getElementById('btnCerrarSesionDocente');
    const panelDocente = document.getElementById('panelDocenteContainer');
    const preContainerForm = document.getElementById('preContainerForm');
    const bannerDocenteForm = document.getElementById('bannerModoDocenteEnForm');
    const adminAuditoriaSection = document.getElementById('adminAuditoriaSection');

    if (rol === 'docente' && AppState.docenteAutenticado) {
        body.classList.remove('mode-representante');
        body.classList.add('mode-docente');

        badge.className = 'role-badge-pill docente-active';
        badgeText.textContent = 'Perfil: Docente / Admin';
        badgeIcon.className = 'fa-solid fa-user-shield';

        if (btnCerrarSesion) btnCerrarSesion.style.display = 'inline-flex';
        if (adminAuditoriaSection) adminAuditoriaSection.style.display = 'grid';

        // Por defecto en modo docente, mostrar la información recaudada (Dashboard)
        mostrarPanelDocente();
    } else {
        // Modo Representante (Por defecto o explícito)
        body.classList.remove('mode-docente');
        body.classList.add('mode-representante');

        badge.className = 'role-badge-pill repre-active';
        badgeText.textContent = 'Perfil: Representante';
        badgeIcon.className = 'fa-solid fa-user-check';

        if (btnCerrarSesion) btnCerrarSesion.style.display = 'none';

        // OCULTAR ABSOLUTAMENTE EL APARTADO DE AUDITORÍA / OPERADOR PARA EL REPRESENTANTE
        if (adminAuditoriaSection) adminAuditoriaSection.style.display = 'none';
        if (bannerDocenteForm) bannerDocenteForm.style.display = 'none';

        // Mostrar el formulario de registro para el representante
        if (panelDocente) panelDocente.classList.remove('active');
        if (panelDocente) panelDocente.style.display = 'none';
        if (preContainerForm) preContainerForm.style.display = 'block';
    }

    actualizarBadges();
}

function mostrarPanelDocente() {
    if (!AppState.docenteAutenticado) {
        abrirModal('modalLoginDocente');
        return;
    }
    const panelDocente = document.getElementById('panelDocenteContainer');
    const preContainerForm = document.getElementById('preContainerForm');
    if (panelDocente) {
        panelDocente.style.display = 'block';
        panelDocente.classList.add('active');
    }
    if (preContainerForm) preContainerForm.style.display = 'none';

    renderizarPanelDocente();
    window.scrollTo({ top: 180, behavior: 'smooth' });
}

function mostrarFormularioEnModoDocente() {
    const panelDocente = document.getElementById('panelDocenteContainer');
    const preContainerForm = document.getElementById('preContainerForm');
    const bannerDocenteForm = document.getElementById('bannerModoDocenteEnForm');
    const adminAuditoriaSection = document.getElementById('adminAuditoriaSection');

    if (panelDocente) {
        panelDocente.style.display = 'none';
        panelDocente.classList.remove('active');
    }
    if (preContainerForm) preContainerForm.style.display = 'block';
    if (bannerDocenteForm) bannerDocenteForm.style.display = 'flex';
    if (adminAuditoriaSection) adminAuditoriaSection.style.display = 'grid';

    irAlPaso(1);
    window.scrollTo({ top: 180, behavior: 'smooth' });
}

/* ==============================================================================
   DASHBOARD DOCENTE: CONSULTA Y GESTIÓN DE INFORMACIÓN RECAUDADA
   ============================================================================== */
function renderizarPanelDocente() {
    filtrarYRenderizarPanelDocente();
    actualizarKpisDocente();
}

function actualizarKpisDocente() {
    const registros = AppState.registros || [];
    const total = registros.length;
    let bajos = 0; // 1° a 3°
    let altos = 0; // 4° a 6°
    let aprobadas = 0;

    registros.forEach(r => {
        const g = r.grado || '';
        if (g.includes('1er') || g.includes('2do') || g.includes('3er')) {
            bajos++;
        } else {
            altos++;
        }
        if (r.estado === 'APROBADA') {
            aprobadas++;
        }
    });

    const elTotal = document.getElementById('kpiTotalPreinscritos');
    const elBajos = document.getElementById('kpiGradosBajos');
    const elAltos = document.getElementById('kpiGradosAltos');
    const elAprob = document.getElementById('kpiAprobadas');

    if (elTotal) elTotal.textContent = total;
    if (elBajos) elBajos.textContent = bajos;
    if (elAltos) elAltos.textContent = altos;
    if (elAprob) elAprob.textContent = aprobadas;
}

function filtrarYRenderizarPanelDocente() {
    const tbody = document.getElementById('tablaDocenteRegistrosBody');
    if (!tbody) return;

    const texto = (document.getElementById('filtroDocenteBusqueda')?.value || '').trim().toLowerCase();
    const gradoFiltro = document.getElementById('filtroDocenteGrado')?.value || '';
    const estadoFiltro = document.getElementById('filtroDocenteEstado')?.value || '';

    const filtrados = AppState.registros.filter(r => {
        const matchTexto = !texto || 
            (r.alumno && r.alumno.toLowerCase().includes(texto)) ||
            (r.codigo && r.codigo.toLowerCase().includes(texto)) ||
            (r.alumnoDoc && r.alumnoDoc.toLowerCase().includes(texto)) ||
            (r.representante && r.representante.toLowerCase().includes(texto)) ||
            (r.repreDoc && r.repreDoc.toLowerCase().includes(texto));

        const matchGrado = !gradoFiltro || (r.grado && r.grado.includes(gradoFiltro));
        const matchEstado = !estadoFiltro || r.estado === estadoFiltro;

        return matchTexto && matchGrado && matchEstado;
    });

    if (filtrados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2.5rem; color: #64748b;">
                    <i class="fa-solid fa-inbox" style="font-size: 2rem; color: #cbd5e1; display: block; margin-bottom: 0.5rem;"></i>
                    No se encontraron preinscripciones con los criterios seleccionados.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    filtrados.forEach(r => {
        const badgeColor = {
            'APROBADA': 'background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0;',
            'EN_REVISION': 'background: #fef3c7; color: #b45309; border: 1px solid #fde68a;',
            'DOCUMENTOS_INCOMPLETOS': 'background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca;',
            'PENDIENTE': 'background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0;',
            'LISTA_DE_ESPERA': 'background: #ede9fe; color: #6d28d9; border: 1px solid #ddd6fe;'
        }[r.estado] || 'background: #f1f5f9; color: #475569;';

        const recaudosBadge = r.recaudosCount || '4/5';

        html += `
            <tr>
                <td><strong style="font-family: monospace; color: var(--fya-red);">${r.codigo}</strong></td>
                <td>
                    <div style="font-weight: 700; color: #0f172a;">${r.alumno}</div>
                    <span style="font-size: 0.78rem; color: #64748b;">C.I./C.E: ${r.alumnoDoc || 'S/N'}</span>
                </td>
                <td>
                    <div style="font-weight: 600;">${r.representante}</div>
                    <span style="font-size: 0.78rem; color: #64748b;"><i class="fa-solid fa-phone"></i> ${r.repreTelefono || 'N/A'}</span>
                </td>
                <td>
                    <span class="badge-tag" style="background: var(--fya-red-bg); color: var(--fya-red-dark); font-size: 0.8rem;">
                        ${r.grado}
                    </span>
                </td>
                <td>
                    <span style="font-size: 0.85rem; color: #334155;">${r.instituto || 'C.E.I. Barrio 24 de Julio'}</span><br>
                    <span style="font-size: 0.75rem; color: #94a3b8;">${r.institutoCiudad || 'San Francisco, Zulia'}</span>
                </td>
                <td>
                    <span class="badge-tag" style="background: #e0f2fe; color: #0369a1; font-weight: 700;">
                        <i class="fa-solid fa-folder-open"></i> ${recaudosBadge}
                    </span>
                </td>
                <td>
                    <select class="form-control" style="font-size: 0.78rem; font-weight: 700; padding: 0.25rem 0.5rem; ${badgeColor}" onchange="cambiarEstadoPreinscripcion('${r.codigo}', this.value)">
                        <option value="EN_REVISION" ${r.estado === 'EN_REVISION' ? 'selected' : ''}>EN REVISIÓN</option>
                        <option value="APROBADA" ${r.estado === 'APROBADA' ? 'selected' : ''}>APROBADA</option>
                        <option value="DOCUMENTOS_INCOMPLETOS" ${r.estado === 'DOCUMENTOS_INCOMPLETOS' ? 'selected' : ''}>DOCS. INCOMPLETOS</option>
                        <option value="PENDIENTE" ${r.estado === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
                        <option value="LISTA_DE_ESPERA" ${r.estado === 'LISTA_DE_ESPERA' ? 'selected' : ''}>LISTA DE ESPERA</option>
                    </select>
                </td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 0.4rem; justify-content: center;">
                        <button type="button" class="btn btn-outline-red btn-sm" onclick="verPlanillaRegistro('${r.codigo}')" title="Ver / Imprimir Planilla Oficial">
                            <i class="fa-solid fa-print"></i> Planilla
                        </button>
                        <button type="button" class="btn btn-secondary btn-sm" onclick="verSqlDeRegistro('${r.codigo}')" title="Ver Sentencia MySQL">
                            <i class="fa-solid fa-database"></i> SQL
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

window.cambiarEstadoPreinscripcion = function(codigo, nuevoEstado) {
    const reg = AppState.registros.find(r => r.codigo === codigo);
    if (reg) {
        reg.estado = nuevoEstado;
        localStorage.setItem('fya_preinscripciones_db', JSON.stringify(AppState.registros));
        actualizarKpisDocente();
        mostrarToast('Estado Actualizado', `Solicitud ${codigo} actualizada a ${nuevoEstado}.`);
    }
};

window.verPlanillaRegistro = function(codigo) {
    const reg = AppState.registros.find(r => r.codigo === codigo);
    if (reg) {
        sincronizarDatosPlanillaDesdeRegistro(reg);
        abrirModal('modalPlanillaBackdrop');
    }
};

window.verSqlDeRegistro = function(codigo) {
    const reg = AppState.registros.find(r => r.codigo === codigo);
    if (reg) {
        const sql = generarSqlPreinscripcion(reg);
        document.getElementById('sqlCodeDisplay').textContent = sql;
        abrirModal('modalSqlBackdrop');
    }
};

/* ==============================================================================
   INICIALIZACIÓN DE EVENTOS Y ELEMENTOS DEL FORMULARIO
   ============================================================================== */
function initEventListeners() {
    // Stepper superior
    document.querySelectorAll('.step-item').forEach(item => {
        item.addEventListener('click', () => {
            const pasoDestino = parseInt(item.getAttribute('data-step'));
            if (pasoDestino < AppState.pasoActual) {
                irAlPaso(pasoDestino);
            } else if (pasoDestino > AppState.pasoActual) {
                let todosValidos = true;
                for (let p = AppState.pasoActual; p < pasoDestino; p++) {
                    if (!validarPaso(p)) {
                        todosValidos = false;
                        break;
                    }
                }
                if (todosValidos) {
                    irAlPaso(pasoDestino);
                }
            }
        });
    });

    // Selección de Perfil en Modal
    const cardRepre = document.getElementById('cardElegirRepresentante');
    if (cardRepre) cardRepre.addEventListener('click', () => seleccionarRol('representante'));

    const cardDocente = document.getElementById('cardElegirDocente');
    if (cardDocente) cardDocente.addEventListener('click', () => seleccionarRol('docente'));

    const btnCambiarRol = document.getElementById('btnCambiarRolModal');
    if (btnCambiarRol) btnCambiarRol.addEventListener('click', abrirSelectorRol);

    // Formulario Login Docente
    const formLogin = document.getElementById('formLoginDocente');
    if (formLogin) formLogin.addEventListener('submit', manejarLoginDocente);

    const btnCerrarLoginDocente = document.getElementById('btnCerrarLoginDocente');
    if (btnCerrarLoginDocente) btnCerrarLoginDocente.addEventListener('click', () => cerrarModal('modalLoginDocente'));

    const btnCancelarLoginDocente = document.getElementById('btnCancelarLoginDocente');
    if (btnCancelarLoginDocente) btnCancelarLoginDocente.addEventListener('click', () => cerrarModal('modalLoginDocente'));

    // Botones de sesión docente
    const btnCerrarSesion = document.getElementById('btnCerrarSesionDocente');
    if (btnCerrarSesion) btnCerrarSesion.addEventListener('click', cerrarSesionDocente);

    const btnCerrarSesionBanner = document.getElementById('btnCerrarSesionDocenteBanner');
    if (btnCerrarSesionBanner) btnCerrarSesionBanner.addEventListener('click', cerrarSesionDocente);

    const btnVerPanelDocente = document.getElementById('btnVerPanelDocente');
    if (btnVerPanelDocente) btnVerPanelDocente.addEventListener('click', mostrarPanelDocente);

    const btnIrNuevaPre = document.getElementById('btnIrNuevaPreinscripcionDocente');
    if (btnIrNuevaPre) btnIrNuevaPre.addEventListener('click', mostrarFormularioEnModoDocente);

    const btnVolverPanel = document.getElementById('btnVolverAlPanelDocente');
    if (btnVolverPanel) btnVolverPanel.addEventListener('click', mostrarPanelDocente);

    // Filtros del Panel Docente
    const inputBusqueda = document.getElementById('filtroDocenteBusqueda');
    if (inputBusqueda) inputBusqueda.addEventListener('input', filtrarYRenderizarPanelDocente);

    const selGradoFiltro = document.getElementById('filtroDocenteGrado');
    if (selGradoFiltro) selGradoFiltro.addEventListener('change', filtrarYRenderizarPanelDocente);

    const selEstadoFiltro = document.getElementById('filtroDocenteEstado');
    if (selEstadoFiltro) selEstadoFiltro.addEventListener('change', filtrarYRenderizarPanelDocente);

    const btnResetFiltros = document.getElementById('btnResetDocenteFiltros');
    if (btnResetFiltros) {
        btnResetFiltros.addEventListener('click', () => {
            if (inputBusqueda) inputBusqueda.value = '';
            if (selGradoFiltro) selGradoFiltro.value = '';
            if (selEstadoFiltro) selEstadoFiltro.value = '';
            filtrarYRenderizarPanelDocente();
        });
    }

    // Checkbox Misma Dirección
    const chkMismaDir = document.getElementById('chkMismaDireccion');
    if (chkMismaDir) {
        chkMismaDir.addEventListener('change', (e) => {
            const dirAlumno = document.getElementById('alumnoDireccion').value;
            const dirRepre = document.getElementById('repreDireccion');
            if (e.target.checked && dirAlumno) {
                dirRepre.value = dirAlumno;
                dirRepre.classList.remove('input-invalid');
            }
        });
    }

    // Checkbox Primer Ingreso (InstAuto)
    const chkPrimerIngreso = document.getElementById('chkPrimerIngreso');
    const instWrapper = document.getElementById('institutoFieldsWrapper');
    if (chkPrimerIngreso && instWrapper) {
        chkPrimerIngreso.addEventListener('change', (e) => {
            const instNombre = document.getElementById('institutoNombre');
            const instCodigo = document.getElementById('institutoCodigo');
            if (e.target.checked) {
                instWrapper.style.opacity = '0.4';
                instWrapper.style.pointerEvents = 'none';
                instNombre.value = 'Primer Ingreso (Sin Plantel Anterior)';
                instCodigo.value = 'S/N';
                instNombre.classList.remove('input-invalid');
            } else {
                instWrapper.style.opacity = '1';
                instWrapper.style.pointerEvents = 'auto';
                instNombre.value = 'C.E.I. Barrio 24 de Julio';
                instCodigo.value = 'DEA-CEI-24J';
            }
        });
    }

    // Selector de Grados
    const selectGrado = document.getElementById('selectGrado');
    if (selectGrado) {
        selectGrado.addEventListener('change', actualizarResumenGrado);
    }

    // Botón Llenar Ejemplo
    const btnCargarEjemplo = document.getElementById('btnCargarEjemplo');
    if (btnCargarEjemplo) {
        btnCargarEjemplo.addEventListener('click', cargarAspiranteEjemplo);
    }

    // Generar Planilla
    const btnGenerarPlanilla = document.getElementById('btnGenerarPlanilla');
    if (btnGenerarPlanilla) {
        btnGenerarPlanilla.addEventListener('click', () => {
            if (!validarFormularioCompleto()) {
                mostrarToast('Datos Incompletos', 'Completa los campos obligatorios antes de generar la planilla oficial.', 'error');
                return;
            }
            sincronizarDatosPlanillaOficial();
            abrirModal('modalPlanillaBackdrop');
        });
    }

    // Modales
    const btnCerrarPlanillaModal = document.getElementById('btnCerrarPlanillaModal');
    if (btnCerrarPlanillaModal) {
        btnCerrarPlanillaModal.addEventListener('click', () => cerrarModal('modalPlanillaBackdrop'));
    }

    const btnVerSqlModal = document.getElementById('btnVerSqlModal');
    if (btnVerSqlModal) {
        btnVerSqlModal.addEventListener('click', () => {
            const sql = generarSqlPreinscripcion();
            document.getElementById('sqlCodeDisplay').textContent = sql;
            abrirModal('modalSqlBackdrop');
        });
    }

    const btnCerrarSqlModal = document.getElementById('btnCerrarSqlModal');
    if (btnCerrarSqlModal) {
        btnCerrarSqlModal.addEventListener('click', () => cerrarModal('modalSqlBackdrop'));
    }

    const btnCopiarSql = document.getElementById('btnCopiarSql');
    if (btnCopiarSql) btnCopiarSql.addEventListener('click', copiarSqlAlPortapapeles);

    const btnDescargarSql = document.getElementById('btnDescargarSql');
    if (btnDescargarSql) btnDescargarSql.addEventListener('click', descargarArchivoSql);

    // Modal Historial
    const btnVerHistorial = document.getElementById('btnVerHistorial');
    if (btnVerHistorial) {
        btnVerHistorial.addEventListener('click', () => {
            renderizarHistorial();
            abrirModal('modalHistorialBackdrop');
        });
    }

    const btnCerrarHistorial = document.getElementById('btnCerrarHistorial');
    const btnCerrarHistorialModal = document.getElementById('btnCerrarHistorialModal');
    if (btnCerrarHistorial) btnCerrarHistorial.addEventListener('click', () => cerrarModal('modalHistorialBackdrop'));
    if (btnCerrarHistorialModal) btnCerrarHistorialModal.addEventListener('click', () => cerrarModal('modalHistorialBackdrop'));

    // Envío del Formulario
    const form = document.getElementById('preinscripcionForm');
    if (form) form.addEventListener('submit', manejarEnvioPreinscripcion);

    // Cierre al pulsar fondo modal
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });
}

/**
 * Autocompleta los campos de instituto de procedencia según la selección en catálogo (Zulia)
 */
function initCatalogoInstitutosZulia() {
    const sel = document.getElementById('selectInstitutoCatalogo');
    if (!sel) return;

    sel.addEventListener('change', (e) => {
        const opt = e.target.selectedOptions[0];
        if (!opt) return;

        if (e.target.value === 'nuevo') {
            document.getElementById('institutoCodigo').value = '';
            document.getElementById('institutoNombre').value = '';
            document.getElementById('institutoCiudad').value = 'San Francisco, Edo. Zulia';
            document.getElementById('institutoTelefono').value = '';
            document.getElementById('institutoNombre').focus();
            return;
        }

        const codigo = opt.getAttribute('data-codigo') || 'DEA-CEI-24J';
        const tipo = opt.getAttribute('data-tipo') || 'PUBLICA';
        const ciudad = opt.getAttribute('data-ciudad') || 'San Francisco, Edo. Zulia';
        const tel = opt.getAttribute('data-tel') || '0261-7612345';
        const nom = opt.getAttribute('data-nom') || opt.text;

        document.getElementById('institutoCodigo').value = codigo;
        document.getElementById('institutoNombre').value = nom;
        document.getElementById('institutoTipo').value = tipo;
        document.getElementById('institutoCiudad').value = ciudad;
        document.getElementById('institutoTelefono').value = tel;
    });
}

/**
 * VALIDACIÓN ESTRICTA POR PASO
 * Para el modo Representante: ignora campos dentro del área administrativa.
 */
function validarPaso(numeroPaso) {
    const seccion = document.getElementById(`stepContent${numeroPaso}`);
    if (!seccion) return true;

    const camposRequeridos = seccion.querySelectorAll('input[required], select[required], textarea[required]');
    let esValido = true;
    let primerCampoInvalido = null;

    camposRequeridos.forEach(campo => {
        // Si el campo está en la sección de auditoría administrativa y estamos en modo Representante, ignorarlo
        if (AppState.rol === 'representante' && campo.closest('#adminAuditoriaSection')) {
            campo.classList.remove('input-invalid');
            return;
        }

        // Si es primer ingreso, ignorar instituto
        const chkPrimerIngreso = document.getElementById('chkPrimerIngreso');
        if (numeroPaso === 3 && chkPrimerIngreso && chkPrimerIngreso.checked && 
            (campo.id === 'institutoNombre' || campo.id === 'institutoTipo')) {
            campo.classList.remove('input-invalid');
            return;
        }

        const valor = campo.value.trim();
        if (!valor) {
            campo.classList.add('input-invalid');
            esValido = false;
            if (!primerCampoInvalido) primerCampoInvalido = campo;
        } else {
            if (campo.type === 'email' && !validarFormatoEmail(valor)) {
                campo.classList.add('input-invalid');
                esValido = false;
                if (!primerCampoInvalido) primerCampoInvalido = campo;
            } else {
                campo.classList.remove('input-invalid');
            }
        }
    });

    if (!esValido) {
        if (primerCampoInvalido) {
            primerCampoInvalido.focus();
            primerCampoInvalido.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        mostrarToast('Campos Incompletos', 'Por favor completa todos los datos obligatorios marcados con (*) antes de continuar.', 'error');
        return false;
    }

    return true;
}

function avanzarPasoConValidacion(pasoDestino) {
    if (validarPaso(AppState.pasoActual)) {
        irAlPaso(pasoDestino);
    }
}

function validarFormularioCompleto() {
    for (let p = 1; p <= 5; p++) {
        if (!validarPaso(p)) {
            irAlPaso(p);
            return false;
        }
    }
    return true;
}

function validarFormatoEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function configurarLimpiezaValidacionEnTiempoReal() {
    document.querySelectorAll('.form-control').forEach(input => {
        input.addEventListener('input', () => {
            if (input.value.trim() !== '') input.classList.remove('input-invalid');
        });
        input.addEventListener('change', () => {
            if (input.value.trim() !== '') input.classList.remove('input-invalid');
        });
    });
}

function irAlPaso(pasoDestino) {
    if (pasoDestino < 1 || pasoDestino > 5) return;

    document.querySelectorAll('.form-step-content').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`stepContent${pasoDestino}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.step-item').forEach(item => {
        const stepNum = parseInt(item.getAttribute('data-step'));
        item.classList.remove('active');
        if (stepNum < pasoDestino) {
            item.classList.add('completed');
        } else if (stepNum === pasoDestino) {
            item.classList.add('active');
            item.classList.remove('completed');
        } else {
            item.classList.remove('completed');
        }
    });

    AppState.pasoActual = pasoDestino;
    window.scrollTo({ top: 220, behavior: 'smooth' });
}

function actualizarResumenGrado() {
    const select = document.getElementById('selectGrado');
    if (!select) return;
    const opt = select.options[select.selectedIndex];
    const nombre = opt ? opt.text : '1er Grado de Educación Primaria';
    const resumen = document.getElementById('resumenNombreGrado');
    if (resumen) resumen.textContent = nombre;
}

/**
 * Carga un aspirante de ejemplo de la comunidad de San Francisco, Zulia
 */
function cargarAspiranteEjemplo() {
    // Alumno
    document.getElementById('alumnoTipoDoc').value = 'CE';
    document.getElementById('alumnoNumDoc').value = '120555666';
    document.getElementById('alumnoNombres').value = 'Jesús David';
    document.getElementById('alumnoApellidos').value = 'Gómez Blanco';
    document.getElementById('alumnoFechaNac').value = '2020-03-12';
    document.getElementById('alumnoGenero').value = 'MASCULINO';
    document.getElementById('alumnoTipoSangre').value = 'O+';
    document.getElementById('alumnoLugarNac').value = 'San Francisco, Edo. Zulia';
    document.getElementById('alumnoViveCon').value = 'AMBOS_PADRES';
    document.getElementById('alumnoDireccion').value = 'Barrio 24 de Julio, Av. 49B entre Calles 176 y 177, San Francisco, Edo. Zulia';
    document.getElementById('alumnoAlergias').value = 'Ninguna conocida / Sin alergias';

    // Representante
    document.getElementById('repreTipoDoc').value = 'V';
    document.getElementById('repreNumDoc').value = '19888777';
    document.getElementById('repreParentesco').value = 'MADRE';
    document.getElementById('repreNombres').value = 'Carmen Elena';
    document.getElementById('repreApellidos').value = 'Blanco de Gómez';
    document.getElementById('repreTelefono').value = '0414-6309876';
    document.getElementById('repreCorreo').value = 'carmen.blanco@correo.com';
    document.getElementById('repreOcupacion').value = 'Comerciante / Emprendedora';
    document.getElementById('repreLugarTrabajo').value = 'Sector San Francisco Centro';
    document.getElementById('repreDireccion').value = 'Barrio 24 de Julio, Av. 49B entre Calles 176 y 177, San Francisco, Edo. Zulia';

    // Instituto (InstAuto - Zulia)
    document.getElementById('chkPrimerIngreso').checked = false;
    const instWrapper = document.getElementById('institutoFieldsWrapper');
    if (instWrapper) {
        instWrapper.style.opacity = '1';
        instWrapper.style.pointerEvents = 'auto';
    }
    document.getElementById('selectInstitutoCatalogo').value = '1';
    document.getElementById('institutoCodigo').value = 'DEA-CEI-24J';
    document.getElementById('institutoNombre').value = 'C.E.I. Barrio 24 de Julio';
    document.getElementById('institutoTipo').value = 'PUBLICA';
    document.getElementById('institutoCiudad').value = 'San Francisco, Edo. Zulia';
    document.getElementById('institutoTelefono').value = '0261-7612345';

    // Grado Primaria 1°
    document.getElementById('selectGrado').value = '1';
    actualizarResumenGrado();

    // Recaudos
    document.getElementById('estadoDoc1').value = 'APROBADO';
    document.getElementById('estadoDoc2').value = 'APROBADO';
    document.getElementById('estadoDoc3').value = 'CONSIGNADO';
    document.getElementById('estadoDoc4').value = 'CONSIGNADO';
    document.getElementById('estadoDoc5').value = 'NO_CONSIGNADO';

    // Auditoría (Si está en modo docente)
    document.getElementById('selectUsuarioAuditor').value = '1';
    document.getElementById('selectEstadoPre').value = 'EN_REVISION';
    document.getElementById('observacionesPre').value = 'Aspirante residente en el Barrio 24 de Julio, comunidad inmediata al plantel.';

    document.querySelectorAll('.input-invalid').forEach(el => el.classList.remove('input-invalid'));
    mostrarToast('Ejemplo Cargado', 'Formulario autocompletado con aspirante para 1er Grado (San Francisco, Edo. Zulia).');
}

/**
 * Pasa los datos del formulario a la planilla oficial imprimible
 */
function sincronizarDatosPlanillaOficial() {
    const fNac = document.getElementById('alumnoFechaNac').value;
    let edad = '6 años';
    if (fNac) {
        const diff = 2026 - new Date(fNac).getFullYear();
        edad = `${diff} años`;
    }

    const codSol = document.getElementById('inputCodigoPre').value;
    const selectG = document.getElementById('selectGrado');
    const nombreGrado = selectG.options[selectG.selectedIndex].text;

    // Metadatos
    document.getElementById('planCodigoSol').textContent = codSol;
    document.getElementById('planFechaReg').textContent = new Date().toLocaleDateString('es-VE');
    document.getElementById('planGradoSol').textContent = nombreGrado;

    // Alumno
    const alNom = `${document.getElementById('alumnoNombres').value} ${document.getElementById('alumnoApellidos').value}`.trim() || 'Jesús David Gómez Blanco';
    const alDoc = `${document.getElementById('alumnoTipoDoc').value}-${document.getElementById('alumnoNumDoc').value}` || 'CE-120555666';
    document.getElementById('planAlumnoNombres').textContent = alNom;
    document.getElementById('planAlumnoDoc').textContent = alDoc;
    document.getElementById('planAlumnoFechaNac').textContent = fNac ? fNac.split('-').reverse().join('/') : '12/03/2020';
    document.getElementById('planAlumnoEdad').textContent = edad;
    document.getElementById('planAlumnoGenero').textContent = document.getElementById('alumnoGenero').value || 'MASCULINO';
    document.getElementById('planAlumnoSangre').textContent = document.getElementById('alumnoTipoSangre').value || 'O+';
    document.getElementById('planAlumnoLugarNac').textContent = document.getElementById('alumnoLugarNac').value || 'San Francisco, Edo. Zulia';
    document.getElementById('planAlumnoViveCon').textContent = document.getElementById('alumnoViveCon').value.replace(/_/g, ' ');
    document.getElementById('planAlumnoDireccion').textContent = document.getElementById('alumnoDireccion').value || 'Barrio 24 de Julio, San Francisco';
    document.getElementById('planAlumnoAlergias').textContent = document.getElementById('alumnoAlergias').value || 'Ninguna conocida';

    // Representante
    const repNom = `${document.getElementById('repreNombres').value} ${document.getElementById('repreApellidos').value}`.trim() || 'Carmen Elena Blanco de Gómez';
    const repDoc = `${document.getElementById('repreTipoDoc').value}-${document.getElementById('repreNumDoc').value}` || 'V-19888777';
    document.getElementById('planRepreNombres').textContent = repNom;
    document.getElementById('planRepreDoc').textContent = repDoc;
    document.getElementById('planRepreParentesco').textContent = document.getElementById('repreParentesco').value;
    document.getElementById('planRepreTelefono').textContent = document.getElementById('repreTelefono').value || '0414-6309876';
    document.getElementById('planRepreCorreo').textContent = document.getElementById('repreCorreo').value || 'carmen.blanco@correo.com';
    document.getElementById('planRepreOcupacion').textContent = document.getElementById('repreOcupacion').value || 'Comerciante';
    document.getElementById('planRepreDireccion').textContent = document.getElementById('repreDireccion').value || 'Misma del estudiante';

    // Firmas
    document.getElementById('sigNombreRepre').textContent = repNom;
    document.getElementById('sigDocRepre').textContent = repDoc;
    document.getElementById('planTimestamp').textContent = new Date().toLocaleString('es-VE');

    // Procedencia
    const chkPI = document.getElementById('chkPrimerIngreso').checked;
    if (chkPI) {
        document.getElementById('planInstNombre').textContent = 'Primer Ingreso (Sin Plantel Anterior)';
        document.getElementById('planInstCodigo').textContent = 'N/A';
        document.getElementById('planInstTipo').textContent = 'N/A';
        document.getElementById('planInstCiudad').textContent = 'San Francisco, Edo. Zulia';
    } else {
        document.getElementById('planInstNombre').textContent = document.getElementById('institutoNombre').value || 'C.E.I. Barrio 24 de Julio';
        document.getElementById('planInstCodigo').textContent = document.getElementById('institutoCodigo').value || 'DEA-CEI-24J';
        document.getElementById('planInstTipo').textContent = document.getElementById('institutoTipo').value;
        document.getElementById('planInstCiudad').textContent = document.getElementById('institutoCiudad').value || 'San Francisco, Edo. Zulia';
    }

    sincronizarRecaudosPlanilla();
}

/**
 * Pasa los datos desde un registro del historial/docente a la planilla oficial imprimible
 */
function sincronizarDatosPlanillaDesdeRegistro(r) {
    document.getElementById('planCodigoSol').textContent = r.codigo;
    document.getElementById('planFechaReg').textContent = r.fecha || '08/10/2026';
    document.getElementById('planGradoSol').textContent = r.grado;

    document.getElementById('planAlumnoNombres').textContent = r.alumno;
    document.getElementById('planAlumnoDoc').textContent = r.alumnoDoc || 'CE-S/N';
    document.getElementById('planAlumnoFechaNac').textContent = r.alumnoFechaNac ? r.alumnoFechaNac.split('-').reverse().join('/') : '12/03/2020';
    document.getElementById('planAlumnoEdad').textContent = '6 años';
    document.getElementById('planAlumnoGenero').textContent = r.alumnoGenero || 'MASCULINO';
    document.getElementById('planAlumnoSangre').textContent = r.alumnoSangre || 'O+';
    document.getElementById('planAlumnoLugarNac').textContent = r.alumnoLugarNac || 'San Francisco, Edo. Zulia';
    document.getElementById('planAlumnoViveCon').textContent = r.alumnoViveCon || 'Ambos Padres';
    document.getElementById('planAlumnoDireccion').textContent = r.alumnoDireccion || 'San Francisco, Edo. Zulia';
    document.getElementById('planAlumnoAlergias').textContent = r.alumnoAlergias || 'Ninguna';

    document.getElementById('planRepreNombres').textContent = r.representante;
    document.getElementById('planRepreDoc').textContent = r.repreDoc || 'V-S/N';
    document.getElementById('planRepreParentesco').textContent = r.repreParentesco || 'MADRE';
    document.getElementById('planRepreTelefono').textContent = r.repreTelefono || '0414-0000000';
    document.getElementById('planRepreCorreo').textContent = r.repreCorreo || 'correo@ejemplo.com';
    document.getElementById('planRepreOcupacion').textContent = r.repreOcupacion || 'Particular';
    document.getElementById('planRepreDireccion').textContent = r.repreDireccion || r.alumnoDireccion || 'San Francisco, Edo. Zulia';

    document.getElementById('sigNombreRepre').textContent = r.representante;
    document.getElementById('sigDocRepre').textContent = r.repreDoc || '';
    document.getElementById('planTimestamp').textContent = new Date().toLocaleString('es-VE');

    document.getElementById('planInstNombre').textContent = r.instituto || 'C.E.I. Barrio 24 de Julio';
    document.getElementById('planInstCodigo').textContent = r.institutoCodigo || 'DEA-CEI-24J';
    document.getElementById('planInstTipo').textContent = r.institutoTipo || 'PUBLICA';
    document.getElementById('planInstCiudad').textContent = r.institutoCiudad || 'San Francisco, Edo. Zulia';

    sincronizarRecaudosPlanilla();
}

function sincronizarRecaudosPlanilla() {
    const tbody = document.getElementById('planDocTableBody');
    if (!tbody) return;

    const lista = [
        { nombre: 'Partida de Nacimiento del Estudiante', idSelect: 'estadoDoc1' },
        { nombre: 'Copia de Cédula de Identidad del Representante Legal', idSelect: 'estadoDoc2' },
        { nombre: 'Boleta o Informe Descriptivo del Grado Anterior', idSelect: 'estadoDoc3' },
        { nombre: '4 Fotografías Tipo Carnet del Estudiante', idSelect: 'estadoDoc4' },
        { nombre: 'Constancia de Residencia de la Comunidad', idSelect: 'estadoDoc5' }
    ];

    let html = '';
    lista.forEach(item => {
        const sel = document.getElementById(item.idSelect);
        const est = sel ? sel.value : 'NO_CONSIGNADO';
        const entregado = est === 'APROBADO' || est === 'CONSIGNADO';
        const check = entregado ? '[ X ]' : '[ &nbsp; ]';
        const color = est === 'APROBADO' ? '#15803d' : (est === 'CONSIGNADO' ? '#0369a1' : '#b91c1c');

        html += `
            <tr>
                <td style="text-align: center; font-family: monospace; font-weight: bold;">${check}</td>
                <td>${item.nombre}</td>
                <td style="color: ${color}; font-weight: bold; font-size: 8pt;">${est}</td>
                <td style="font-size: 8pt; color: #52525b;">${entregado ? 'Consignado en secretaría' : 'Pendiente por entregar'}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

/**
 * Genera el script SQL de MySQL para una preinscripción
 */
function generarSqlPreinscripcion(registroEspecifico = null) {
    let codSol, alTipo, alNum, alNom, alApe, alFNac, alGen, alSang, alDir;
    let repTipo, repNum, repNom, repApe, repPar, repTel, repCor, repDir;
    let esPI, instCod, instNom, instTipo, idGradoPeriodo, idUser, estadoPre, obs;

    if (registroEspecifico) {
        codSol = registroEspecifico.codigo;
        alTipo = 'CE';
        alNum = registroEspecifico.alumnoDoc ? registroEspecifico.alumnoDoc.replace(/\D/g, '') : '120555666';
        alNom = (registroEspecifico.alumno || 'Jesús David').replace(/'/g, "\\'");
        alApe = 'Estudiante';
        alFNac = registroEspecifico.alumnoFechaNac || '2020-03-12';
        alGen = registroEspecifico.alumnoGenero || 'MASCULINO';
        alSang = registroEspecifico.alumnoSangre || 'O+';
        alDir = (registroEspecifico.alumnoDireccion || 'San Francisco, Edo. Zulia').replace(/'/g, "\\'");

        repTipo = 'V';
        repNum = registroEspecifico.repreDoc ? registroEspecifico.repreDoc.replace(/\D/g, '') : '19888777';
        repNom = (registroEspecifico.representante || 'Carmen Elena').replace(/'/g, "\\'");
        repApe = 'Representante';
        repPar = registroEspecifico.repreParentesco || 'MADRE';
        repTel = registroEspecifico.repreTelefono || '0414-6309876';
        repCor = registroEspecifico.repreCorreo || 'repre@correo.com';
        repDir = alDir;

        esPI = false;
        instCod = registroEspecifico.institutoCodigo || 'DEA-CEI-24J';
        instNom = (registroEspecifico.instituto || 'C.E.I. Barrio 24 de Julio').replace(/'/g, "\\'");
        instTipo = registroEspecifico.institutoTipo || 'PUBLICA';

        idGradoPeriodo = registroEspecifico.gradoId || '1';
        idUser = registroEspecifico.idUser || '1';
        estadoPre = registroEspecifico.estado || 'EN_REVISION';
        obs = `Preinscripción para cohorte 2026-2027 (${registroEspecifico.grado}).`;
    } else {
        codSol = document.getElementById('inputCodigoPre').value;
        alTipo = document.getElementById('alumnoTipoDoc').value;
        alNum = document.getElementById('alumnoNumDoc').value || '120555666';
        alNom = (document.getElementById('alumnoNombres').value || 'Jesús David').replace(/'/g, "\\'");
        alApe = (document.getElementById('alumnoApellidos').value || 'Gómez Blanco').replace(/'/g, "\\'");
        alFNac = document.getElementById('alumnoFechaNac').value || '2020-03-12';
        alGen = document.getElementById('alumnoGenero').value || 'MASCULINO';
        alSang = document.getElementById('alumnoTipoSangre').value || 'O+';
        alDir = (document.getElementById('alumnoDireccion').value || 'San Francisco, Edo. Zulia').replace(/'/g, "\\'");

        repTipo = document.getElementById('repreTipoDoc').value;
        repNum = document.getElementById('repreNumDoc').value || '19888777';
        repNom = (document.getElementById('repreNombres').value || 'Carmen Elena').replace(/'/g, "\\'");
        repApe = (document.getElementById('repreApellidos').value || 'Blanco de Gómez').replace(/'/g, "\\'");
        repPar = document.getElementById('repreParentesco').value;
        repTel = document.getElementById('repreTelefono').value || '0414-6309876';
        repCor = document.getElementById('repreCorreo').value || 'carmen.blanco@correo.com';
        repDir = (document.getElementById('repreDireccion').value || alDir).replace(/'/g, "\\'");

        esPI = document.getElementById('chkPrimerIngreso').checked;
        instCod = document.getElementById('institutoCodigo').value || 'DEA-CEI-24J';
        instNom = (document.getElementById('institutoNombre').value || 'C.E.I. Barrio 24 de Julio').replace(/'/g, "\\'");
        instTipo = document.getElementById('institutoTipo').value;

        idGradoPeriodo = document.getElementById('selectGrado').value || '1';
        
        // Si es modo Representante, valores de auditoría por defecto
        if (AppState.rol === 'representante') {
            idUser = '1';
            estadoPre = 'EN_REVISION';
            obs = 'Solicitud de preinscripción registrada por el representante legal a través del portal web.';
        } else {
            idUser = document.getElementById('selectUsuarioAuditor').value || '1';
            estadoPre = document.getElementById('selectEstadoPre').value || 'EN_REVISION';
            obs = (document.getElementById('observacionesPre').value || '').replace(/'/g, "\\'");
        }
    }

    return `-- ==============================================================================
-- SISTEMA DE PREINSCRIPCIÓN - U.E. FE Y ALEGRÍA "NUEVA AMÉRICA"
-- Periodo Escolar: 2026 - 2027 | Nivel: Educación Primaria (1° a 6° Grado)
-- Municipio San Francisco, Estado Zulia
-- Solicitud: ${codSol}
-- ==============================================================================

START TRANSACTION;

-- 1. Insertar o Actualizar Estudiante (Alumno)
INSERT INTO alumnos (tipo_documento, numero_identificacion, nombres, apellidos, fecha_nacimiento, genero, tipo_sangre, direccion_habitacion)
VALUES ('${alTipo}', '${alNum}', '${alNom}', '${alApe}', '${alFNac}', '${alGen}', '${alSang}', '${alDir}')
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @id_alumno = LAST_INSERT_ID();

-- 2. Insertar o Actualizar Representante (Representante)
INSERT INTO representantes (tipo_documento, numero_identificacion, nombres, apellidos, parentesco, telefono_principal, correo, direccion_habitacion)
VALUES ('${repTipo}', '${repNum}', '${repNom}', '${repApe}', '${repPar}', '${repTel}', '${repCor}', '${repDir}')
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @id_repre = LAST_INSERT_ID();

-- 3. Plantel de Procedencia (InstAuto / id_instituto - Zulia)
${esPI ? 'SET @id_instituto = NULL;' : `INSERT INTO institutos (codigo_plantel, nombre, tipo_institucion, ciudad)
VALUES ('${instCod}', '${instNom}', '${instTipo}', 'San Francisco, Edo. Zulia')
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);
SET @id_instituto = LAST_INSERT_ID();`}

-- 4. Registrar la Preinscripción (Pre-Inscripcion)
INSERT INTO preinscripciones (codigo_solicitud, id_repre, id_alumno, id_instituto, id_g_periodo, id_user, estado, observaciones)
VALUES ('${codSol}', @id_repre, @id_alumno, @id_instituto, ${idGradoPeriodo}, ${idUser}, '${estadoPre}', '${obs}');
SET @id_pre = LAST_INSERT_ID();

-- 5. Consignación de Recaudos (R_P_D)
INSERT INTO preinscripcion_documentos (id_pre, id_documento, estado, fecha_entrega)
VALUES 
(@id_pre, 1, '${document.getElementById('estadoDoc1')?.value || 'CONSIGNADO'}', NOW()),
(@id_pre, 2, '${document.getElementById('estadoDoc2')?.value || 'CONSIGNADO'}', NOW()),
(@id_pre, 3, '${document.getElementById('estadoDoc3')?.value || 'CONSIGNADO'}', NOW()),
(@id_pre, 4, '${document.getElementById('estadoDoc4')?.value || 'CONSIGNADO'}', NOW()),
(@id_pre, 5, '${document.getElementById('estadoDoc5')?.value || 'NO_CONSIGNADO'}', NOW());

COMMIT;

-- Consultar registro completo
SELECT * FROM v_preinscripciones_completas WHERE codigo_solicitud = '${codSol}';
`;
}

/**
 * Guarda la preinscripción en la base de datos simulada y actualiza
 */
function manejarEnvioPreinscripcion(e) {
    e.preventDefault();

    if (!validarFormularioCompleto()) {
        return;
    }

    const codSol = document.getElementById('inputCodigoPre').value;
    const alNom = `${document.getElementById('alumnoNombres').value} ${document.getElementById('alumnoApellidos').value}`.trim();
    const repNom = `${document.getElementById('repreNombres').value} ${document.getElementById('repreApellidos').value}`.trim();
    const selectG = document.getElementById('selectGrado');
    const gradoNom = selectG.options[selectG.selectedIndex].text;
    const gradoVal = selectG.value;

    let est = 'EN_REVISION';
    let opNombre = 'Control de Estudios';
    let idUser = '1';

    if (AppState.rol === 'docente') {
        est = document.getElementById('selectEstadoPre').value;
        const selOp = document.getElementById('selectUsuarioAuditor');
        opNombre = selOp ? selOp.options[selOp.selectedIndex].text : 'Control de Estudios (Admin)';
        idUser = selOp ? selOp.value : '1';
    }

    // Contar recaudos consignados
    let recaudosEntregados = 0;
    ['estadoDoc1', 'estadoDoc2', 'estadoDoc3', 'estadoDoc4', 'estadoDoc5'].forEach(id => {
        const el = document.getElementById(id);
        if (el && (el.value === 'APROBADO' || el.value === 'CONSIGNADO')) recaudosEntregados++;
    });

    const registro = {
        codigo: codSol,
        alumno: alNom,
        alumnoDoc: `${document.getElementById('alumnoTipoDoc').value}-${document.getElementById('alumnoNumDoc').value}`,
        alumnoFechaNac: document.getElementById('alumnoFechaNac').value,
        alumnoGenero: document.getElementById('alumnoGenero').value,
        alumnoSangre: document.getElementById('alumnoTipoSangre').value,
        alumnoLugarNac: document.getElementById('alumnoLugarNac').value || 'San Francisco, Edo. Zulia',
        alumnoViveCon: document.getElementById('alumnoViveCon').value,
        alumnoDireccion: document.getElementById('alumnoDireccion').value,
        alumnoAlergias: document.getElementById('alumnoAlergias').value,
        representante: repNom,
        repreDoc: `${document.getElementById('repreTipoDoc').value}-${document.getElementById('repreNumDoc').value}`,
        repreParentesco: document.getElementById('repreParentesco').value,
        repreTelefono: document.getElementById('repreTelefono').value,
        repreCorreo: document.getElementById('repreCorreo').value,
        repreOcupacion: document.getElementById('repreOcupacion').value,
        repreDireccion: document.getElementById('repreDireccion').value,
        instituto: document.getElementById('chkPrimerIngreso').checked ? 'Primer Ingreso' : document.getElementById('institutoNombre').value,
        institutoCodigo: document.getElementById('chkPrimerIngreso').checked ? 'N/A' : document.getElementById('institutoCodigo').value,
        institutoTipo: document.getElementById('institutoTipo').value,
        institutoCiudad: document.getElementById('institutoCiudad').value || 'San Francisco, Edo. Zulia',
        grado: gradoNom,
        gradoId: gradoVal,
        estado: est,
        periodo: '2026-2027',
        operador: opNombre,
        idUser: idUser,
        recaudosCount: `${recaudosEntregados}/5`,
        fecha: new Date().toLocaleDateString('es-VE')
    };

    AppState.registros.unshift(registro);
    localStorage.setItem('fya_preinscripciones_db', JSON.stringify(AppState.registros));

    AppState.contadorCorrelativo++;
    document.getElementById('inputCodigoPre').value = `PRE-2026-${String(AppState.contadorCorrelativo).padStart(4, '0')}`;

    actualizarBadges();
    if (AppState.rol === 'docente') {
        actualizarKpisDocente();
    }

    mostrarToast('Preinscripción Registrada', `La solicitud ${codSol} para ${gradoNom} fue guardada exitosamente.`);

    sincronizarDatosPlanillaOficial();
    setTimeout(() => {
        abrirModal('modalPlanillaBackdrop');
    }, 450);
}

function renderizarHistorial() {
    const tbody = document.getElementById('historialTableBody');
    if (!tbody) return;

    if (AppState.registros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 1.5rem; color: #71717a;">No hay preinscripciones guardadas aún.</td></tr>';
        return;
    }

    let html = '';
    AppState.registros.forEach(r => {
        html += `
            <tr>
                <td><strong>${r.codigo}</strong></td>
                <td>${r.alumno}</td>
                <td>${r.representante}</td>
                <td>${r.grado}</td>
                <td><span style="background: #fef2f2; color: #b91c1c; font-weight: 700; font-size: 0.75rem; padding: 0.2rem 0.5rem; border-radius: 999px;">${r.estado}</span></td>
                <td>
                    <button type="button" class="btn btn-secondary" onclick="verPlanillaRegistro('${r.codigo}')" style="padding: 0.25rem 0.6rem; font-size: 0.8rem;">
                        <i class="fa-solid fa-print"></i> Planilla
                    </button>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

window.reimprimirPlanilla = function(codigo) {
    cerrarModal('modalHistorialBackdrop');
    verPlanillaRegistro(codigo);
};

function actualizarBadges() {
    const b = document.getElementById('totalRegistrosBadge');
    if (b) b.textContent = AppState.registros ? AppState.registros.length : 0;
}

/**
 * Datos iniciales de demostración con unidades educativas de San Francisco y Maracaibo, Edo. Zulia
 */
function cargarRegistroSemillaSiVacio() {
    if (!AppState.registros || AppState.registros.length === 0) {
        AppState.registros = [
            {
                codigo: 'PRE-2026-0001',
                alumno: 'Jesús David Gómez Blanco',
                alumnoDoc: 'CE-120555666',
                alumnoFechaNac: '2020-03-12',
                alumnoGenero: 'MASCULINO',
                alumnoSangre: 'O+',
                alumnoLugarNac: 'San Francisco, Edo. Zulia',
                alumnoViveCon: 'Ambos Padres',
                alumnoDireccion: 'Barrio 24 de Julio, Av. 49B entre Calles 176 y 177, San Francisco, Edo. Zulia',
                alumnoAlergias: 'Ninguna conocida / Sin alergias',
                representante: 'Carmen Elena Blanco de Gómez',
                repreDoc: 'V-19888777',
                repreParentesco: 'MADRE',
                repreTelefono: '0414-6309876',
                repreCorreo: 'carmen.blanco@correo.com',
                repreOcupacion: 'Comerciante / Emprendedora',
                repreDireccion: 'Barrio 24 de Julio, Av. 49B entre Calles 176 y 177, San Francisco, Edo. Zulia',
                instituto: 'C.E.I. Barrio 24 de Julio',
                institutoCodigo: 'DEA-CEI-24J',
                institutoTipo: 'PUBLICA',
                institutoCiudad: 'San Francisco, Edo. Zulia',
                grado: '1er Grado de Educación Primaria',
                gradoId: '1',
                estado: 'EN_REVISION',
                periodo: '2026-2027',
                operador: 'Control de Estudios (Admin)',
                idUser: '1',
                recaudosCount: '4/5',
                fecha: '08/10/2026'
            },
            {
                codigo: 'PRE-2026-0002',
                alumno: 'Sofia Valentina Rincón Morales',
                alumnoDoc: 'CE-121888333',
                alumnoFechaNac: '2019-06-25',
                alumnoGenero: 'FEMENINO',
                alumnoSangre: 'A+',
                alumnoLugarNac: 'San Francisco, Edo. Zulia',
                alumnoViveCon: 'Madre',
                alumnoDireccion: 'Urb. Coromoto, Calle 171, San Francisco, Edo. Zulia',
                alumnoAlergias: 'Ninguna',
                representante: 'Carlos Eduardo Rincón',
                repreDoc: 'V-18456123',
                repreParentesco: 'PADRE',
                repreTelefono: '0424-6123456',
                repreCorreo: 'carlos.rincon@gmail.com',
                repreOcupacion: 'Ingeniero en Computación',
                repreDireccion: 'Urb. Coromoto, Calle 171, San Francisco, Edo. Zulia',
                instituto: 'U.E. Fe y Alegría La Chinita',
                institutoCodigo: 'DEA-FYA-CHINITA',
                institutoTipo: 'SUBVENCIONADA_FE_Y_ALEGRIA',
                institutoCiudad: 'San Francisco, Edo. Zulia',
                grado: '2do Grado de Educación Primaria',
                gradoId: '2',
                estado: 'APROBADA',
                periodo: '2026-2027',
                operador: 'Secretaría Académica',
                idUser: '2',
                recaudosCount: '5/5',
                fecha: '08/10/2026'
            },
            {
                codigo: 'PRE-2026-0003',
                alumno: 'Mathias Alejandro Urdaneta Soto',
                alumnoDoc: 'CE-122999111',
                alumnoFechaNac: '2018-11-04',
                alumnoGenero: 'MASCULINO',
                alumnoSangre: 'O+',
                alumnoLugarNac: 'Maracaibo, Edo. Zulia',
                alumnoViveCon: 'Ambos Padres',
                alumnoDireccion: 'Sector El Manzanillo, Av. 5, Casa 22, San Francisco, Edo. Zulia',
                alumnoAlergias: 'Rinitis alérgica',
                representante: 'Mariángel Soto de Urdaneta',
                repreDoc: 'V-20112345',
                repreParentesco: 'MADRE',
                repreTelefono: '0412-5554321',
                repreCorreo: 'mariangel.soto@hotmail.com',
                repreOcupacion: 'Docente de Preescolar',
                repreDireccion: 'Sector El Manzanillo, Av. 5, Casa 22, San Francisco, Edo. Zulia',
                instituto: 'C.E.I. Simoncito El Manzanillo',
                institutoCodigo: 'DEA-SIM-MANZ',
                institutoTipo: 'PUBLICA',
                institutoCiudad: 'San Francisco, Edo. Zulia',
                grado: '3er Grado de Educación Primaria',
                gradoId: '3',
                estado: 'DOCUMENTOS_INCOMPLETOS',
                periodo: '2026-2027',
                operador: 'Control de Estudios (Admin)',
                idUser: '1',
                recaudosCount: '3/5',
                fecha: '08/10/2026'
            },
            {
                codigo: 'PRE-2026-0004',
                alumno: 'Isabella Coromoto Villalobos Pineda',
                alumnoDoc: 'CE-123444555',
                alumnoFechaNac: '2016-08-19',
                alumnoGenero: 'FEMENINO',
                alumnoSangre: 'B+',
                alumnoLugarNac: 'Maracaibo, Edo. Zulia',
                alumnoViveCon: 'Ambos Padres',
                alumnoDireccion: 'Sector Los Cortijos, San Francisco, Edo. Zulia',
                alumnoAlergias: 'Ninguna',
                representante: 'Roberto José Villalobos',
                repreDoc: 'V-17890123',
                repreParentesco: 'PADRE',
                repreTelefono: '0416-7890123',
                repreCorreo: 'roberto.villalobos@outlook.com',
                repreOcupacion: 'Técnico Electricista',
                repreDireccion: 'Sector Los Cortijos, San Francisco, Edo. Zulia',
                instituto: 'Colegio San Vicente de Paúl',
                institutoCodigo: 'DEA-COL-SVP',
                institutoTipo: 'PRIVADA',
                institutoCiudad: 'Maracaibo, Edo. Zulia',
                grado: '5to Grado de Educación Primaria',
                gradoId: '5',
                estado: 'APROBADA',
                periodo: '2026-2027',
                operador: 'Control de Estudios (Admin)',
                idUser: '1',
                recaudosCount: '5/5',
                fecha: '08/10/2026'
            }
        ];
        localStorage.setItem('fya_preinscripciones_db', JSON.stringify(AppState.registros));
    }
}

function copiarSqlAlPortapapeles() {
    const sql = document.getElementById('sqlCodeDisplay').textContent;
    navigator.clipboard.writeText(sql).then(() => {
        mostrarToast('Copiado', 'Instrucciones SQL copiadas al portapapeles.');
    });
}

function descargarArchivoSql() {
    const sql = document.getElementById('sqlCodeDisplay').textContent;
    const blob = new Blob([sql], { type: 'text/sql;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preinscripcion_${document.getElementById('inputCodigoPre').value}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarToast('Descargado', 'Archivo .sql generado exitosamente.');
}

function abrirModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
}

function cerrarModal(id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
}

function mostrarToast(titulo, mensaje, tipo = 'success') {
    const t = document.getElementById('toastNotification');
    if (!t) return;
    document.getElementById('toastTitle').textContent = titulo;
    document.getElementById('toastMessage').textContent = mensaje;

    const icon = document.getElementById('toastIcon');
    if (tipo === 'error') {
        t.classList.add('error');
        icon.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color: #dc2626;"></i>';
    } else {
        t.classList.remove('error');
        icon.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i>';
    }

    t.classList.add('show');
    setTimeout(() => {
        t.classList.remove('show');
    }, 4500);
}

// Exposición explícita para invocaciones desde el DOM
window.avanzarPasoConValidacion = avanzarPasoConValidacion;
window.irAlPaso = irAlPaso;
window.validarPaso = validarPaso;
window.abrirModal = abrirModal;
window.cerrarModal = cerrarModal;
window.seleccionarRol = seleccionarRol;
window.abrirSelectorRol = abrirSelectorRol;
