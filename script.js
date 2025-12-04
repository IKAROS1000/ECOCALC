//throw new Error("cerrado");

// FACTORES Y CONSTANTES 
const FACTORES = {
    ELECTRICIDAD_KWH: 0.200, // kg CO2e/kWh (Factor de emisión promedio Perú - 2023)
    GAS_NATURAL_M3: 2.05,
    GAS_LP_10KG: 30.0,
    AGUA_DUCHA_LITRO_MIN: 10, // Litros por minuto de ducha
    AGUA_M3: 0.0005, // 0.5 kg CO2e/m³ de huella de carbono del tratamiento
    GASOLINA_LITRO: 2.30, 
    DIESEL_LITRO: 2.70,
    TRANSPORTE_PUBLICO_BUS_KM: 0.15,
    TRANSPORTE_PUBLICO_TREN_KM: 0.05,
    MOTO_LINEAL_KM_KG: 0.05, 
    RESIDUOS_NO_RECICLADOS_KG: 0.15,
    RESIDUOS_BASE_KG_PER_CAPITA: 30, // Consumo base de residuos por persona/día
    CARNE_ROJA_FACTOR_DIA: 0.8, // Factor de impacto alto
    CARNE_POLLO_FACTOR_DIA: 0.2,
    CARNE_CERDO_FACTOR_DIA: 0.3,
    CARNE_PESCADO_FACTOR_DIA: 0.1,
    OTROS_ELECTRODOMESTICOS_KWH_HORA: 0.05, // 50W promedio por hora
    LAVADO_ROPAS_VECES_SEMANA_FACTOR_KG: 0.1, // Factor por vez que se lava ropa (no usado en cálculo final, se usa m3 de agua)
};

const TARIFAS_KWH_SOLES = {
    ELECTRICIDAD_KWH: 0.65, 
    GAS_NATURAL_M3: 1.50,  
    AGUA_M3: 4.0,       
    GLP_BALON_SOLES: 45.0, // Costo de un balón de 10kg
};

const COMPARATIVA_PERU_TON = 2.5; // Valor de referencia promedio en Perú (tCO2e/año/persona)

const FACTOR_RECICLAJE = { 'casi_no': 1.0, 'algo': 0.7, 'todo': 0.3 };
const MESES_ANIO = 12;
const KG_TO_TON = 0.001; 
const SEMANAS_ANIO = 52; 
const DIAS_ANIO = 365;

// Factores de Reducción para Compromisos (ej: kg CO2e evitados/año)
const REDUCCION_COMPROMISOS = {
    DUCHA_CORTA: 50, CERRAR_CAÑO: 20, REPARAR_FUGAS: 40, AHORRAR_LAVADORA: 30,
    DESCONECTAR_APARATOS: 100, USAR_BICICLETA: 120, COMPRAR_LOCAL: 50,
    REDUCIR_ENVASES: 40, COMPOSTAJE: 80, 
};

// ======================================================================
// ESTADO GLOBAL Y FLUJO DE PASOS
// ======================================================================
let huellaPieChart; 
let userName = "Invitado";
let currentStep = 1; 
let huellaCalculada = {};
let huellaFinalTon = 0;
let initialLevel = 'intermedio';
let selectedGasType = 'glp';
let selectedAuto = 'no';

const redondear = (valor) => parseFloat(valor.toFixed(3));


// ======================================================================
// GESTIÓN DE SECUENCIAS
// ======================================================================

function updateView(step) {
    document.querySelectorAll('main > section').forEach(section => section.classList.add('hidden'));

    let targetSection = '';
    
    // Pasos de la encuesta (1 a 6)
    if (step >= 1 && step <= 6) {
        targetSection = 'calculadora-section';
        document.querySelectorAll('#apartados-form .tab-pane').forEach(tab => tab.classList.add('hidden'));
        const currentTabElement = document.querySelector(`#apartados-form [data-step="${step}"]`);
        if (currentTabElement) {
            currentTabElement.classList.remove('hidden');
        }
        // Actualizar el título de la sección de Medición
        document.getElementById('calculadora-section-title').textContent = `Tu Medición (Paso ${step}/6)`;
    } else if (step === 7) {
        targetSection = 'resultados-section';
    } else if (step === 8) {
        targetSection = 'compromisos-section';
        calculateFootprintAndDisplayResults(); // Recalcular con compromisos para la barra
    } else if (step === 9) {
        targetSection = 'resumen-section';
        calculateFootprintAndDisplayResults(); // Recálculo final
    }
    
    if (targetSection) {
        document.getElementById(targetSection).classList.remove('hidden');
        document.getElementById('page-content-wrapper').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    currentStep = step;
}

function startSurvey() { 
    const inputName = document.getElementById('userName').value.trim();
    const selectedLevel = document.querySelector('input[name="initial_level"]:checked')?.value;

    if (!inputName || !selectedLevel) {
        alert("Por favor, ingresa tu nombre y selecciona un nivel de estimación.");
        return;
    }

    userName = inputName.split(' ')[0]; 
    initialLevel = selectedLevel; // Guardar el nivel para la comparación

    // Asegurarse de que el modal de bienvenida existe y está siendo manejado
    const welcomeModalElement = document.getElementById('welcomeModal');
    const welcomeModal = bootstrap.Modal.getInstance(welcomeModalElement) || new bootstrap.Modal(welcomeModalElement);
    if (welcomeModal) welcomeModal.hide(); 

    document.getElementById('wrapper').classList.remove('hidden');
    document.getElementById('navUserName').textContent = userName;
    
    // Asignar nombre al resumen
    const resultadoUserName = document.getElementById('resultadoUserName');
    if(resultadoUserName) resultadoUserName.textContent = userName;
    const resumenUserName = document.getElementById('resumenUserName');
    if(resumenUserName) resumenUserName.textContent = userName;

    updateView(1); 
}

/**
 * Lógica de navegación entre pasos.
 */
function navigateStep(direction) {
    const nextStep = currentStep + direction;
    
    // --- Lógica para avanzar (direction > 0) ---
    if (direction > 0) {
        
        // Si estamos en un paso de encuesta (1 a 6)
        if (currentStep >= 1 && currentStep <= 6) {
            // Validar el paso actual y bloquear si falla
            if (!validateCurrentStep(currentStep)) {
                return; 
            }
            
            if (nextStep >= 1 && nextStep <= 6) {
                // Mover a la siguiente categoría de encuesta
                updateView(nextStep);
                return;
            }
            
            if (nextStep === 7) {
                // Si llegamos aquí, el paso 6 ya fue validado.
                
                // CÁLCULO Y VISUALIZACIÓN DE RESULTADOS
                huellaCalculada = calcularHuella();
                calculateFootprintAndDisplayResults();
                updateView(7); // Ir a Resultados
                return;
            }
        }
        
        // Si estamos en Resultados o Compromisos
        if (currentStep === 7 && nextStep === 8) { // Resultados -> Compromisos
            
            // Inicializa el valor de reducción de carne
            const initialCarneValue = document.getElementById('carne_roja_dias')?.value;
            if (initialCarneValue) {
                document.getElementById('reducir_carne_roja_dias').value = initialCarneValue;
                document.getElementById('carne_compromiso_text').textContent = `${initialCarneValue} días/semana`;
            }

            updateView(8);
        } else if (currentStep === 8 && nextStep === 9) { // Compromisos -> Resumen
            updateView(9);
        }
    } 
    
    // --- Lógica para retroceder (direction < 0) ---
    else if (direction < 0) { 
        if (currentStep === 7 && nextStep === 6) { // Resultados -> Residuos
            updateView(6);
        } else if (currentStep === 8 && nextStep === 7) { // Compromisos -> Resultados
             updateView(7);
        } else if (currentStep === 9 && nextStep === 8) { // Resumen -> Compromisos
             updateView(8);
        } else if (nextStep >= 1 && nextStep <= 6) {
            updateView(nextStep);
        }
    }
}

// Función: VALIDACIÓN OBLIGATORIA (CORREGIDA PARA RADIO BUTTONS)
function validateCurrentStep(step) {
    const currentTabElement = document.querySelector(`#apartados-form [data-step="${step}"]`);
    if (!currentTabElement) return true; 

    const inputs = currentTabElement.querySelectorAll('input[required], select[required]');
    let allValid = true;
    let radioGroups = {};

    // 1. Limpiar estilos de error y recolectar grupos de radio
    currentTabElement.querySelectorAll('.is-invalid-group').forEach(el => el.classList.remove('is-invalid-group'));
    currentTabElement.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));


    inputs.forEach(input => {
        
        if (input.type === 'number') {
             // Validar que no esté vacío y que sea mayor o igual a 0
             if (input.required && (input.value === '' || isNaN(parseFloat(input.value)) || parseFloat(input.value) < 0)) {
                allValid = false;
                input.classList.add('is-invalid');
             } 
        } else if (input.type === 'radio') {
            const name = input.name;
            if (input.required) {
                
                // Determina el contenedor visual que debe marcarse como inválido
                let groupContainer = input.closest('.card-select-reciclaje, .card-select-lavadora');
                if (!groupContainer) {
                    // Para otros grupos (ej. Alimentación, Energía), usamos un contenedor más genérico
                    groupContainer = input.closest('.form-check, .mb-4') || currentTabElement;
                }
                
                if (!radioGroups[name]) radioGroups[name] = { checked: false, elements: [], groupContainer: groupContainer };
                
                radioGroups[name].elements.push(input);
                if (input.checked) {
                    radioGroups[name].checked = true;
                }
            }
        } else if (input.type === 'text' || input.tagName === 'SELECT') {
             if (input.required && input.value.trim() === '') {
                allValid = false;
                input.classList.add('is-invalid');
             }
        }
    });
    
    // 2. Segunda pasada para validar grupos de radio buttons
    for (const name in radioGroups) {
        if (!radioGroups[name].checked) {
            allValid = false;
            
            // Marcar el contenedor visual como inválido
            radioGroups[name].elements.forEach(radio => {
                const container = radio.closest('.card-select-lavadora, .card-select-reciclaje');
                const formCheck = radio.closest('.form-check');

                if (container) {
                    container.classList.add('is-invalid-group'); // Caso: Lavadora/Residuos
                } else if (formCheck) {
                     formCheck.classList.add('is-invalid-group'); // Caso: Alimentación (usando form-check)
                } else {
                     radioGroups[name].groupContainer.classList.add('is-invalid-group');
                }
            });
        }
    }
    
    if (!allValid) {
        alert("Por favor, completa todos los campos obligatorios con un valor válido (ingresa 0 si no aplica).");
        const firstInvalid = currentTabElement.querySelector('.is-invalid, .is-invalid-group');
        if (firstInvalid) {
             // Intenta enfocarse en un input dentro del grupo inválido
             const radioInput = firstInvalid.querySelector('input[type="radio"]');
             if(radioInput) radioInput.focus();
             else firstInvalid.focus();
        }
        return false;
    }
    return true;
}

// ======================================================================
// LÓGICA DE CONVERSIÓN SOLES A UNIDAD (Visualización en tiempo real)
// ESTO ES LO SOLICITADO
// ======================================================================

const updateSolesConversions = () => {
    // Helper para obtener valores numéricos, tratando nulos o vacíos como 0
    const getFloatValue = (id) => parseFloat(document.getElementById(id)?.value) || 0;

    // 1. AGUA (Soles a m³)
    const aguaSoles = getFloatValue('agua_soles');
    const m3Agua = aguaSoles > 0 ? aguaSoles / TARIFAS_KWH_SOLES.AGUA_M3 : 0;
    const aguaAproximado = document.getElementById('m3_agua_aproximado'); 
    if (aguaAproximado) {
        aguaAproximado.textContent = `Aproximado: ${m3Agua.toFixed(2)} m³/mes`;
    }

    // 2. ELECTRICIDAD (Soles a kWh)
    const elecSoles = getFloatValue('electricidad_soles');
    const kwhElect = elecSoles > 0 ? elecSoles / TARIFAS_KWH_SOLES.ELECTRICIDAD_KWH : 0;
    const elecAproximado = document.getElementById('kwh_electricidad_aproximado'); 
    if (elecAproximado) {
        elecAproximado.textContent = `Aproximado: ${kwhElect.toFixed(2)} kWh/mes`;
    }

    // 3. GAS GLP (Soles a Balones 10kg)
    const glpSoles = getFloatValue('gas_glp_soles');
    const balonesGLP = glpSoles > 0 ? glpSoles / TARIFAS_KWH_SOLES.GLP_BALON_SOLES : 0;
    const glpAproximado = document.getElementById('balones_glp_aproximado'); 
    if (glpAproximado) {
        glpAproximado.textContent = `Aproximado: ${balonesGLP.toFixed(2)} balón(es) 10kg/mes`;
    }
    
    
    // 4. GAS NATURAL (GNV) - Soles a m³
    const gnvSoles = getFloatValue('gas_gnv_soles');
    const m3GNV = gnvSoles > 0 ? gnvSoles / TARIFAS_KWH_SOLES.GAS_NATURAL_M3 : 0;
    const gnvAproximado = document.getElementById('m3_gnv_aproximado');
    if (gnvAproximado) {
        gnvAproximado.textContent = `Aproximado: ${m3GNV.toFixed(2)} m³/mes`;
    }
    
        // Mostrar también el valor anual aproximado de agua
    const aguaAnual = m3Agua * MESES_ANIO;
    const aguaAproximadoAnual = document.getElementById('m3_agua_aproximado_anual');
    if (aguaAproximadoAnual) {
        aguaAproximadoAnual.textContent = `(≈ ${aguaAnual.toFixed(2)} m³/año)`;
    }
};

// ======================================================================
// LÓGICA DE CÁLCULO
// ======================================================================

function calcularHuella() {
    // 1. OBTENER VALORES DEL FORMULARIO
    const numPersonas = parseFloat(document.getElementById('personas').value) || 1;
    
    // Agua
    const vecesDuchaSemana = parseFloat(document.getElementById('veces_ducha_semana').value) || 0;
    const minutosDucha = parseFloat(document.getElementById('minutos_ducha').value) || 0;
    const vecesLavaRopaSemana = parseFloat(document.getElementById('veces_lava_ropa_semana').value) || 0;
    const solesAgua = parseFloat(document.getElementById('agua_soles').value) || 0;
    
    // Energía
    const horasElectrodomesticosDia = parseFloat(document.getElementById('horas_electrodomesticos_dia').value) || 0;
    const apagaLuces = document.querySelector('input[name="apaga_luces"]:checked')?.value === 'si';
    const solesElectricidad = parseFloat(document.getElementById('electricidad_soles').value) || 0;
    const solesGLP = (selectedGasType === 'glp') ? (parseFloat(document.getElementById('gas_glp_soles').value) || 0) : 0;
    const solesGNV = (selectedGasType === 'gnv') ? (parseFloat(document.getElementById('gas_gnv_soles').value) || 0) : 0;
    const selectedLavadoraKg = document.querySelector('input[name="lavadora_kg"]:checked')?.value || '7kg';
    const lavadoraFactor = { '5kg': 1.0, '7kg': 1.2, '12kg': 1.5, 'no_uso': 0.0 }[selectedLavadoraKg];
    
    // Transporte
    const litrosMes = (selectedAuto === 'gasolina' || selectedAuto === 'diesel') ? (parseFloat(document.getElementById('litros_mes').value) || 0) : 0;
    const busKmSemana = parseFloat(document.getElementById('bus_km_semana').value) || 0;
    const trenKmSemana = parseFloat(document.getElementById('tren_km_semana').value) || 0;
    const ferryKmSemana = parseFloat(document.getElementById('ferry_km_semana').value) || 0;
    const motoKmSemana = parseFloat(document.getElementById('moto_km_semana').value) || 0;
    
    // Alimentación
    const carneRojaDias = parseFloat(document.getElementById('carne_roja_dias').value) || 0;
    const polloDias = parseFloat(document.getElementById('pollo_dias').value) || 0;
    const cerdoDias = parseFloat(document.getElementById('cerdo_dias').value) || 0;
    const pescadoDias = parseFloat(document.getElementById('pescado_dias').value) || 0;
    const tipoCompra = document.querySelector('input[name="empaque_alimentos"]:checked')?.value || 'super'; 
    
    // Residuos
    const nivelReciclaje = document.querySelector('input[name="nivel_reciclaje"]:checked')?.value || 'casi_no';
    
    // 2. CÁLCULOS DE EMISIONES (kg CO2e/año)

    // Huella de Agua
    // Nota: Se prioriza el pago de agua (m3) para la huella de carbono de tratamiento, y solo se usa la ducha/lavado para una estimación de consumo de agua (litros), que no está en el cálculo de CO2e final.
    const aguaM3Anual = ((solesAgua / TARIFAS_KWH_SOLES.AGUA_M3) * MESES_ANIO) || 0;
    let huellaAguaKg = (aguaM3Anual * FACTORES.AGUA_M3 * 1000) / numPersonas; 

    // Huella de Energía
    const electricidadKWhAnual = (solesElectricidad / TARIFAS_KWH_SOLES.ELECTRICIDAD_KWH) * MESES_ANIO;
    const extraElectrodomesticosKWhAnual = horasElectrodomesticosDia * FACTORES.OTROS_ELECTRODOMESTICOS_KWH_HORA * DIAS_ANIO;
    let huellaElectricidadKg = (electricidadKWhAnual + extraElectrodomesticosKWhAnual) * FACTORES.ELECTRICIDAD_KWH;
    if (apagaLuces) huellaElectricidadKg *= 0.95; // Reducción por apagado
    
    // Cálculo de Gas (GLP vs GNV)
    let huellaGLPKg = 0;
    if (selectedGasType === 'glp') {
        const glpBalonesAnual = (solesGLP / TARIFAS_KWH_SOLES.GLP_BALON_SOLES) * MESES_ANIO;
        huellaGLPKg = glpBalonesAnual * FACTORES.GAS_LP_10KG; // Factor GLP es por balón de 10kg
    } else if (selectedGasType === 'gnv') {
        huellaGLPKg = (solesGNV / TARIFAS_KWH_SOLES.GAS_NATURAL_M3) * MESES_ANIO * FACTORES.GAS_NATURAL_M3;
    }

    let huellaEnergiaKg = huellaElectricidadKg + huellaGLPKg;
    huellaEnergiaKg /= numPersonas; // Huella per cápita

    // Huella de Transporte
    const litrosGasolinaAnual = (selectedAuto === 'gasolina') ? (litrosMes * MESES_ANIO) : 0;
    const litrosDieselAnual = (selectedAuto === 'diesel') ? (litrosMes * MESES_ANIO) : 0;

    let huellaAutoKg = (litrosGasolinaAnual * FACTORES.GASOLINA_LITRO) + (litrosDieselAnual * FACTORES.DIESEL_LITRO);
    const huellaBusKg = busKmSemana * SEMANAS_ANIO * FACTORES.TRANSPORTE_PUBLICO_BUS_KM;
    const huellaTrenKg = trenKmSemana * SEMANAS_ANIO * FACTORES.TRANSPORTE_PUBLICO_TREN_KM;
    const huellaFerryKg = ferryKmSemana * SEMANAS_ANIO * FACTORES.TRANSPORTE_PUBLICO_BUS_KM * 0.5; // Aproximación
    const huellaMotoKg = motoKmSemana * SEMANAS_ANIO * FACTORES.MOTO_LINEAL_KM_KG;

    let huellaTransporteKg = (huellaAutoKg + huellaBusKg + huellaTrenKg + huellaFerryKg + huellaMotoKg) / numPersonas; 

    // Huella de Alimentación
    const totalCarneFactor = (carneRojaDias * FACTORES.CARNE_ROJA_FACTOR_DIA) +
                             (polloDias * FACTORES.CARNE_POLLO_FACTOR_DIA) +
                             (cerdoDias * FACTORES.CARNE_CERDO_FACTOR_DIA) +
                             (pescadoDias * FACTORES.CARNE_PESCADO_FACTOR_DIA);

    // Base de huella de alimentos por persona: 1200 kg CO2e/año (promedio)
    let huellaAlimentacionKg = (DIAS_ANIO * totalCarneFactor) + 500; // Base de 500 kg/año más factor cárnico
    const factorEmpaque = { 'super': 1.0, 'mercado': 0.8, 'local': 0.6 }[tipoCompra];
    huellaAlimentacionKg *= factorEmpaque;

    // Huella de Residuos
    const factorReciclaje = FACTOR_RECICLAJE[nivelReciclaje];
    const residuosBaseKg = FACTORES.RESIDUOS_BASE_KG_PER_CAPITA * DIAS_ANIO; 
    let huellaResiduosKg = (residuosBaseKg * factorReciclaje * FACTORES.RESIDUOS_NO_RECICLADOS_KG) / numPersonas; 

    // 3. RESULTADO FINAL (en Toneladas CO2e/año)
    const huellaTotalKg = huellaAguaKg + huellaEnergiaKg + huellaTransporteKg + huellaAlimentacionKg + huellaResiduosKg;
    huellaFinalTon = redondear(huellaTotalKg * KG_TO_TON);

    return {
        total: huellaFinalTon,
        agua: redondear(huellaAguaKg * KG_TO_TON),
        energia: redondear(huellaEnergiaKg * KG_TO_TON),
        transporte: redondear(huellaTransporteKg * KG_TO_TON),
        alimentacion: redondear(huellaAlimentacionKg * KG_TO_TON),
        residuos: redondear(huellaResiduosKg * KG_TO_TON),
    };
}

/**
 * Aplica los compromisos seleccionados para calcular la Huella de Compromiso.
 */
function calcularHuellaCompromiso(huellaBase) {
    let huellaCompromiso = { ...huellaBase }; // Copia la huella base
    let totalReduccionKg = 0;
    
    // Compromisos de Agua
    if (document.getElementById('compromiso_ducha_corta')?.checked) {
        totalReduccionKg += REDUCCION_COMPROMISOS.DUCHA_CORTA;
    }
    if (document.getElementById('compromiso_reparar_fugas')?.checked) {
        totalReduccionKg += REDUCCION_COMPROMISOS.REPARAR_FUGAS;
    }
    
    // Compromisos de Energía
    if (document.getElementById('compromiso_desconectar_aparatos')?.checked) {
        totalReduccionKg += REDUCCION_COMPROMISOS.DESCONECTAR_APARATOS;
    }
    
    // Compromisos de Transporte
    if (document.getElementById('compromiso_usar_bicicleta')?.checked) {
        totalReduccionKg += REDUCCION_COMPROMISOS.USAR_BICICLETA;
    }
    
    // Compromisos de Alimentación (Slider de reducción de carne roja)
    const carneRojaDiasBase = parseFloat(document.getElementById('carne_roja_dias')?.value) || 0;
    const carneRojaDiasCompromiso = parseFloat(document.getElementById('reducir_carne_roja_dias')?.value) || carneRojaDiasBase;

    // Calcular la reducción específica por carne (kg CO2e/año)
    const reduccionCarneKg = (carneRojaDiasBase - carneRojaDiasCompromiso) * FACTORES.CARNE_ROJA_FACTOR_DIA * DIAS_ANIO;
    if (reduccionCarneKg > 0) {
        totalReduccionKg += reduccionCarneKg;
    }

    // Compromisos de Residuos
    if (document.getElementById('compromiso_compostaje')?.checked) {
        totalReduccionKg += REDUCCION_COMPROMISOS.COMPOSTAJE;
    }
    
    // Aplicar reducción total al resultado base
    const totalReduccionTon = redondear(totalReduccionKg * KG_TO_TON);
    const huellaCompromisoTon = Math.max(0, huellaBase.total - totalReduccionTon); 

    huellaCompromiso.total = redondear(huellaCompromisoTon);
    huellaCompromiso.reduccion = totalReduccionTon; // Almacenar la reducción total
    
    return huellaCompromiso;
}


/**
 * Calcula la huella, muestra los resultados y actualiza la barra.
 */
function calculateFootprintAndDisplayResults() {
    huellaCalculada.base = calcularHuella();
    huellaCalculada.compromiso = calcularHuellaCompromiso(huellaCalculada.base);
    
    // ======================================================================
    // 1. ACTUALIZACIÓN DE RESULTADOS (Sección 7 y 9)
    // ======================================================================
    
    // Huella Base (Sección 7: Resultados)
    document.getElementById('huellaTotalTon').textContent = huellaCalculada.base.total.toFixed(3); 
    document.getElementById('aguaTon').textContent = huellaCalculada.base.agua.toFixed(3);
    document.getElementById('energiaTon').textContent = huellaCalculada.base.energia.toFixed(3);
    document.getElementById('transporteTon').textContent = huellaCalculada.base.transporte.toFixed(3);
    document.getElementById('alimentacionTon').textContent = huellaCalculada.base.alimentacion.toFixed(3);
    document.getElementById('residuosTon').textContent = huellaCalculada.base.residuos.toFixed(3);
    
    // Resumen Final (Sección 9: Resumen)
    const reduccionPorcentaje = redondear((huellaCalculada.compromiso.reduccion / huellaCalculada.base.total) * 100);

    document.getElementById('resumenToneladas').textContent = huellaCalculada.compromiso.reduccion.toFixed(3);
    document.getElementById('resumenPorcentaje').textContent = isNaN(reduccionPorcentaje) ? '0.00' : reduccionPorcentaje.toFixed(2);
    document.getElementById('huellaFinalCompromiso').textContent = huellaCalculada.compromiso.total.toFixed(3);

    // ======================================================================
    // EQUIVALENCIA DINÁMICA DE REDUCCIÓN (ÁRBOLES Y KILÓMETROS)
    // ======================================================================
    const equivalenciaEl = document.getElementById('equivalenciaReduccion');
    if (equivalenciaEl && huellaCalculada.compromiso.reduccion > 0) {
        const reduccionKg = huellaCalculada.compromiso.reduccion * 1000; // ton → kg
        const arboles = reduccionKg / 21; // 21 kg CO₂ por árbol/año
        const kmAuto = reduccionKg / 0.12; // 0.12 kg CO₂ por km

        equivalenciaEl.innerHTML = `
            Esta reducción equivale aproximadamente a <strong>${arboles.toFixed(1)}</strong> árboles plantados al año
            o a evitar recorrer <strong>${kmAuto.toFixed(0)} km</strong> en automóvil.
        `;
    }
    
    
    // ======================================================================
    // 2. ACTUALIZACIÓN DE GRÁFICOS Y BARRAS
    // ======================================================================

    // Rango máximo para la barra (Comparativa Perú + un margen)
    const maxRange = Math.max(COMPARATIVA_PERU_TON, huellaCalculada.base.total) * 1.2;

    drawHuellaBar(huellaCalculada.base.total, huellaCalculada.compromiso.total, maxRange, COMPARATIVA_PERU_TON);
    drawHuellaPie(huellaCalculada.base);
    // === COMPARATIVAS EDUCATIVAS ===
    calcularComparativas(huellaCalculada);


    // Ajuste de texto de comparación
    const diff = huellaCalculada.base.total - COMPARATIVA_PERU_TON;
    const comparacionEl = document.getElementById('comparacionPromedio');
    if (diff > 0.1) {
        if (diff > 0.1) {
    comparacionEl.innerHTML = '<i class="fas fa-exclamation-triangle me-2 text-secondary-vivid"></i> '
        + '<span>Tu huella es <strong>' + Math.abs(diff).toFixed(2) + ' ton/año</strong> más alta que el promedio peruano '
        + '(<strong>' + COMPARATIVA_PERU_TON + ' ton/año</strong>).</span>';
} else if (diff < -0.1) {
    comparacionEl.innerHTML = '<i class="fas fa-check-circle me-2 text-success-vivid"></i> '
        + '<span>Tu huella es <strong>' + Math.abs(diff).toFixed(2) + ' ton/año</strong> más baja que el promedio peruano '
        + '(<strong>' + COMPARATIVA_PERU_TON + ' ton/año</strong>).</span>';
} else {
    comparacionEl.innerHTML = '<i class="fas fa-info-circle me-2 text-info-vivid"></i> '
        + '<span>Tu huella está cerca del promedio peruano (<strong>' + COMPARATIVA_PERU_TON + ' ton/año</strong>).</span>';
}

    } else if (diff < -0.1) {
         if (diff > 0.1) {
    comparacionEl.innerHTML = '<i class="fas fa-exclamation-triangle me-2 text-secondary-vivid"></i> '
        + '<span>Tu huella es <strong>' + Math.abs(diff).toFixed(2) + ' ton/año</strong> más alta que el promedio peruano '
        + '(<strong>' + COMPARATIVA_PERU_TON + ' ton/año</strong>).</span>';
} else if (diff < -0.1) {
    comparacionEl.innerHTML = '<i class="fas fa-check-circle me-2 text-success-vivid"></i> '
        + '<span>Tu huella es <strong>' + Math.abs(diff).toFixed(2) + ' ton/año</strong> más baja que el promedio peruano '
        + '(<strong>' + COMPARATIVA_PERU_TON + ' ton/año</strong>).</span>';
} else {
    comparacionEl.innerHTML = '<i class="fas fa-info-circle me-2 text-info-vivid"></i> '
        + '<span>Tu huella está cerca del promedio peruano (<strong>' + COMPARATIVA_PERU_TON + ' ton/año</strong>).</span>';
}

    } else {
        if (diff > 0.1) {
    comparacionEl.innerHTML = '<i class="fas fa-exclamation-triangle me-2 text-secondary-vivid"></i> '
        + '<span>Tu huella es <strong>' + Math.abs(diff).toFixed(2) + ' ton/año</strong> más alta que el promedio peruano '
        + '(<strong>' + COMPARATIVA_PERU_TON + ' ton/año</strong>).</span>';
} else if (diff < -0.1) {
    comparacionEl.innerHTML = '<i class="fas fa-check-circle me-2 text-success-vivid"></i> '
        + '<span>Tu huella es <strong>' + Math.abs(diff).toFixed(2) + ' ton/año</strong> más baja que el promedio peruano '
        + '(<strong>' + COMPARATIVA_PERU_TON + ' ton/año</strong>).</span>';
} else {
    comparacionEl.innerHTML = '<i class="fas fa-info-circle me-2 text-info-vivid"></i> '
        + '<span>Tu huella está cerca del promedio peruano (<strong>' + COMPARATIVA_PERU_TON + ' ton/año</strong>).</span>';
}

    }
}

/**
 * Dibuja/Actualiza el gráfico de pastel de huella por categoría.
 */
function drawHuellaPie(huellaData) {
    const ctx = document.getElementById('huellaPieChart');
    if (!ctx) return; 

    const labels = ['Agua', 'Energía', 'Transporte', 'Alimentación', 'Residuos'];
    const dataValues = [
        huellaData.agua, 
        huellaData.energia, 
        huellaData.transporte, 
        huellaData.alimentacion, 
        huellaData.residuos
    ];
    
    const backgroundColors = [
        '#4682b4', // info-vivid (Agua)
        '#ffd700', // warning-vivid (Energía)
        '#ff6347', // secondary-vivid (Transporte)
        '#3cb371', // success-vivid (Alimentación)
        '#8a2be2'  // Azul Violeta (Residuos)
    ];

    const data = {
        labels: labels,
        datasets: [{
            data: dataValues,
            backgroundColor: backgroundColors,
            hoverOffset: 4
        }]
    };
    
    const config = {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed.toFixed(3) + ' ton CO₂e';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    };

    if (huellaPieChart) {
        huellaPieChart.data.datasets = data.datasets;
        huellaPieChart.update();
    } else {
        // Se asume que la librería Chart.js ya está cargada
        huellaPieChart = new Chart(ctx, config);
    }
}


/**
 * Dibuja/Actualiza la barra de comparación de huella.
 */
function drawHuellaBar(huellaBaseTon, huellaCompromisoTon, maxRange, promedioTon) {
    const huellaBar = document.getElementById('huellaValue');
    const huellaArrow = document.getElementById('huellaArrow');
    const promedioBar = document.getElementById('huellaPromedio');
    const promedioText = document.getElementById('huellaPromedioText');
    const compromisoArrow = document.getElementById('huellaCompromisoArrow');
    
    if (!huellaBar || !huellaArrow || !promedioBar) return;
    
    // Calcular porcentajes
    const basePercent = Math.min(100, (huellaBaseTon / maxRange) * 100);
    const compromisoPercent = Math.min(100, (huellaCompromisoTon / maxRange) * 100);
    const promedioPercent = Math.min(100, (promedioTon / maxRange) * 100);
    
    // 1. Actualizar barra de Huella Base
    huellaBar.style.width = basePercent + '%';
    
    // 2. Actualizar flecha de Huella Base
    huellaArrow.style.left = basePercent + '%';
    huellaArrow.innerHTML = `<i class="fas fa-caret-up"></i> <span class="d-block">Tu Huella: ${huellaBaseTon.toFixed(3)} t</span>`;
    
    // 3. Actualizar barra/texto de promedio
    promedioBar.style.left = promedioPercent + '%';
    promedioText.style.left = promedioPercent + '%';
    promedioText.style.transform = `translateX(-${promedioPercent}%)`; 
    promedioText.innerHTML = `Promedio Perú: ${promedioTon} t`;

    // 4. Actualizar flecha de Compromiso (solo si hay reducción)
    if (huellaCompromisoTon < huellaBaseTon) {
        compromisoArrow.classList.remove('hidden');
        compromisoArrow.style.left = compromisoPercent + '%';
        compromisoArrow.innerHTML = `<span class="d-block">Tu Meta: ${huellaCompromisoTon.toFixed(3)} t</span> <i class="fas fa-caret-down"></i>`;
    } else {
        compromisoArrow.classList.add('hidden');
    }
}


// ======================================================================
// EVENT LISTENERS Y CONFIGURACIÓN INICIAL
// ======================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mostrar el modal de bienvenida al cargar la página
    const welcomeModalElement = document.getElementById('welcomeModal');
    if (welcomeModalElement) {
        const welcomeModal = new bootstrap.Modal(welcomeModalElement);
        welcomeModal.show();
    }
    
    // 2. Evento para iniciar la encuesta
    document.getElementById('startBtn')?.addEventListener('click', startSurvey);

    // 3. Eventos para cambiar entre GLP y GNV (paso 3)
    document.querySelectorAll('.gas-type-select').forEach(button => {
        button.addEventListener('click', () => {
            selectedGasType = button.getAttribute('data-gas-type');
            document.querySelectorAll('.gas-type-select').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            
            // Ocultar/Mostrar inputs
            document.getElementById('glp-input').classList.toggle('hidden', selectedGasType !== 'glp');
            document.getElementById('gnv-input').classList.toggle('hidden', selectedGasType !== 'gnv');
        });
    });
    
    // 4. Eventos para seleccionar tipo de auto (paso 4)
    document.querySelectorAll('.auto-type-select').forEach(button => {
        button.addEventListener('click', () => {
            selectedAuto = button.getAttribute('data-auto');
            document.querySelectorAll('.auto-type-select').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            
            // Ocultar/Mostrar inputs de litros
            const litrosInput = document.getElementById('litros-input-group');
            litrosInput.classList.toggle('hidden', selectedAuto === 'no');
            
            // Si selecciona 'no', limpiar el valor de litros
            if (selectedAuto === 'no') {
                document.getElementById('litros_mes').value = 0;
            }
        });
    });

    // 5. Eventos para el select de lavadora y reciclaje (Activar estilos)
    document.querySelectorAll('.card-select-lavadora input, .card-select-reciclaje input').forEach(input => {
        input.addEventListener('change', (e) => {
            const container = e.target.closest('.card-select-lavadora, .card-select-reciclaje');
            // Desactivar todos en el grupo
            e.target.closest('.row').querySelectorAll('.card-select-lavadora, .card-select-reciclaje').forEach(el => el.classList.remove('active'));
            // Activar el seleccionado
            container.classList.add('active');
            container.classList.remove('is-invalid-group'); // Limpiar error al seleccionar
        });
    });
    
    // ======================================================================
    //  CAMBIO SOLICITADO: Listeners para los campos de Soles
    // ======================================================================
    document.getElementById('agua_soles')?.addEventListener('input', updateSolesConversions);
    document.getElementById('electricidad_soles')?.addEventListener('input', updateSolesConversions);
    document.getElementById('gas_glp_soles')?.addEventListener('input', updateSolesConversions);
    document.getElementById('gas_gnv_soles')?.addEventListener('input', updateSolesConversions);
    
    // Ejecutar una vez al inicio para que muestre 0.00 en los textos de aproximación
    updateSolesConversions(); 
    // ======================================================================


    // 6. Listener para el slider de compromiso de carne roja
    const sliderCarneCompromiso = document.getElementById('reducir_carne_roja_dias');
    const textCarneCompromiso = document.getElementById('carne_compromiso_text');
    if (sliderCarneCompromiso && textCarneCompromiso) {
         sliderCarneCompromiso.addEventListener('input', (e) => {
            const days = e.target.value;
            textCarneCompromiso.textContent = `${days} días/semana`;
            calculateFootprintAndDisplayResults(); // Recalcular barra de compromiso
        });
    }

    // 7. Eventos que requieren recálculo constante (para barra de compromiso)
    document.querySelectorAll('#compromisos-section input').forEach(input => {
        input.addEventListener('change', calculateFootprintAndDisplayResults);
        input.addEventListener('input', calculateFootprintAndDisplayResults);
    });

    // Estado por defecto
    document.querySelector('[data-gas-type="glp"]')?.click(); 
    document.querySelector('[data-auto="no"]')?.click();
    
    // Inicializa el valor de reducción de carne (asumiendo que carne_roja_dias existe en el HTML)
    const initialCarneValue = document.getElementById('carne_roja_dias')?.value;
    if (initialCarneValue) {
        document.getElementById('reducir_carne_roja_dias').value = initialCarneValue;
        document.getElementById('carne_compromiso_text').textContent = `${initialCarneValue} días/semana`;
    }

    
    // LISTENERS ASIGNADOS PARA BOTONES DE RESUMEN
    document.getElementById('sumarContribucionBtn')?.addEventListener('click', () => {
        alert(`¡Gracias, ${userName}! Tu compromiso de evitar ${document.getElementById('resumenToneladas').textContent} toneladas de CO₂ ha sido sumado. (Funcionalidad Simulada)`);
    });

    document.getElementById('compartirRedesLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        alert(`Compartiendo tu compromiso de reducir el ${document.getElementById('resumenPorcentaje').textContent}% en redes sociales. (Funcionalidad Simulada)`);
    });

    document.getElementById('conocerMasOpcionesBtn')?.addEventListener('click', () => {
        alert("¡Conoce más opciones! (Funcionalidad simulada para dirigir a una página de consejos extendidos)");
    });
    // --- Mostrar equivalencia de reducción ---
function actualizarEquivalenciaReduccion(reduccionTon) {
  let equivalenciaTexto = "";

  if (reduccionTon > 1) {
    equivalenciaTexto = `Esta cantidad equivale a plantar aproximadamente ${Math.round(
      reduccionTon * 10
    )} árboles al año o a evitar ${Math.round(reduccionTon * 5000)} km de viaje en auto.`;
  } else if (reduccionTon > 0.1) {
    equivalenciaTexto = `Equivale a plantar cerca de ${Math.round(
      reduccionTon * 10
    )} árboles o evitar ${Math.round(reduccionTon * 500)} km de auto.`;
  } else {
    equivalenciaTexto =
      "Tu compromiso ya marca la diferencia. ¡Sigue sumando acciones para un planeta más limpio!";
  }

  const eq = document.getElementById("equivalenciaReduccion");
  if (eq) eq.textContent = equivalenciaTexto;
}

// Llamar automáticamente cuando se calcula el compromiso
if (typeof reduccionTon !== "undefined") {
  actualizarEquivalenciaReduccion(reduccionTon);
}
// ======================================================================
// FUNCIÓN DE COMPARATIVAS EDUCATIVAS
// ======================================================================

});
// ======================================================================
// FUNCIÓN DE COMPARATIVAS EDUCATIVAS
// ======================================================================
function calcularComparativas(huellaCalculada) {
  const PISCINA_OLIMPICA_M3 = 2500;
  const KWH_HOGAR_MES = 150;
  const KG_CO2_POR_ARBOL = 21;
  const KG_CO2_POR_KM_AUTO = 0.12;

  const aguaTon = huellaCalculada.base.agua || 0;
  const energiaTon = huellaCalculada.base.energia || 0;
  const transporteTon = huellaCalculada.base.transporte || 0;
  const totalTon = huellaCalculada.base.total || 0;

  // Cálculos equivalentes
  const aguaM3Anual = aguaTon / 0.0005; // 0.5 kg CO₂/m³ = 0.0005 ton/m³
  const piscinas = aguaM3Anual / PISCINA_OLIMPICA_M3;

  const kWhAnual = energiaTon * 1000 / 0.2;
  const hogares = kWhAnual / (KWH_HOGAR_MES * 12);

  const kmAuto = (transporteTon * 1000) / KG_CO2_POR_KM_AUTO;
  const arboles = (totalTon * 1000) / KG_CO2_POR_ARBOL;

  // Actualizar textos dinámicos
  const setText = (id, texto) => {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
  };

  setText("comparativa_agua_text", `${piscinas.toFixed(2)} piscinas olímpicas (~${aguaM3Anual.toFixed(0)} m³/año)`);
  setText("comparativa_energia_text", `${hogares.toFixed(1)} hogares promedio (~${kWhAnual.toFixed(0)} kWh/año)`);
  setText("comparativa_transporte_text", `${kmAuto.toFixed(0)} km en automóvil`);
  setText("comparativa_arboles_text", `${arboles.toFixed(0)} árboles necesarios para compensar`);

  // Mostrar el bloque de comparativas
  const comparativaDiv = document.getElementById("comparativaImpacto");
  if (comparativaDiv) {
    comparativaDiv.classList.remove("hidden");
    comparativaDiv.style.opacity = 0;
    comparativaDiv.style.transition = "opacity 0.8s ease";
    setTimeout(() => comparativaDiv.style.opacity = 1, 50);
  }
}






