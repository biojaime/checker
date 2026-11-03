(() => {
  "use strict";

  const SUBJECTS = [
    "Matematicas", "Matematicas I", "Matematicas II", "Matematicas III",
    "Español", "Español I", "Español II", "Español III",
    "Educación Civica y Etica", "Educación Civica y Etica I", "Educación Civica y Etica II", "Educación Civica y Etica III",
    "Ingles", "Ingles I", "Ingles II", "Ingles III",
    "Informatica", "Informatica I", "Informatica II", "Informatica III",
    "Historia", "Historia I", "Historia II", "Historia III", "Educación Fisica", "Artes", "Ciencias",
    "Biología", "Fisica", "Quimica", "Geografía", "Tutoría / Educación Socioemocional",
    "SmartMind I", "SmartMind II", "SmartMind III"
  ];
  const METHODOLOGIES = [
    "Seleccione metodología",
    "Aprendizaje Basado en Proyectos (ABPj)",
    "Aprendizaje Basado en Problemas (ABP)",
    "STEAM",
    "Clase invertida (Flipped Classroom)",
    "Aprendizaje Servicio (ApS)",
    "Gamificación",
    "Aprendizaje autodirigido",
    "Aprendizaje situado",
    "Aprendizaje entre pares"
  ];
  const AXES = [
    "Seleccione eje", "Pensamiento Crítico", "Interculturalidad Crítica", "Igualdad de Género",
    "Vida Saludable", "Apropiación de las Culturas a través de la Lectura y la Escritura",
    "Artes y Experiencias Estéticas", "Inclusión"
  ];
  const FIELDS = ["Lenguajes", "Saberes y Pensamiento Científico", "Ética, Naturaleza y Sociedades", "De lo Humano y lo Comunitario"];
  const FIELD_NOT_APPLICABLE = "Sin campo formativo (SmartMind)";
  const COURSE_FIELDS = [...FIELDS, FIELD_NOT_APPLICABLE];
  const PDF_PAGE_LAYOUT = { widthMm: 279.4, heightMm: 215.9, contentMarginMm: 12.7 };
  const PDF_PAGE_WIDTH_PX = Math.round(PDF_PAGE_LAYOUT.widthMm * 96 / 25.4);
  const PDF_WATERMARK_TILE_HEIGHT_PX = Math.round(
    PDF_PAGE_WIDTH_PX
      * PDF_PAGE_LAYOUT.heightMm
      / PDF_PAGE_LAYOUT.widthMm
  );
  const PDF_WATERMARK_ASSETS = {
    "Lenguajes": "lenguajes.png",
    "Saberes y Pensamiento Científico": "pensamiento-cientifico.png",
    "Ética, Naturaleza y Sociedades": "etica.png",
    "De lo Humano y lo Comunitario": "comunitario.png"
  };
  const CURRICULUM = [
    { field: "Lenguajes", subjects: ["Español", "Inglés", "Artes"], grades: [1, 2, 3] },
    { field: "Saberes y Pensamiento Científico", subjects: ["Matemáticas"], grades: [1, 2, 3] },
    { field: "Saberes y Pensamiento Científico", subjects: ["Biología"], grades: [1] },
    { field: "Saberes y Pensamiento Científico", subjects: ["Física"], grades: [2] },
    { field: "Saberes y Pensamiento Científico", subjects: ["Química"], grades: [3] },
    { field: "Ética, Naturaleza y Sociedades", subjects: ["Geografía"], grades: [1] },
    { field: "Ética, Naturaleza y Sociedades", subjects: ["Historia", "Formación Cívica y Ética"], grades: [1, 2, 3] },
    { field: "De lo Humano y lo Comunitario", subjects: ["Tecnología", "Educación Física", "Tutoría / Educación Socioemocional"], grades: [1, 2, 3] }
  ];
  const WEEKDAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
  const ABPJ_FIELDS = [
    ["presentacion", "1. Presentación"],
    ["recoleccion", "2. Recolección"],
    ["formulacion", "3. Formulación del Problema"],
    ["organizacion", "4. Organización del Proyecto"],
    ["experiencia", "5. Vivamos la Experiencia"],
    ["resultados", "6. Resultados y Análisis"],
    ["materiales", "Materiales"],
    ["evaluacion", "Evaluación"]
  ];
  const DAILY_FIELDS = [["inicio", "Inicio"], ["desarrollo", "Desarrollo"], ["cierre", "Cierre"], ["materiales", "Materiales"], ["evaluacion", "Evaluación"]];
  const DB_NAME = "PlaneadorIMM";
  const STORE_NAME = "planeaciones";
  let state;
  let userId;
  let teacherContext = { userId: "", nombre: "", titulo: "", materias: [], materiasRestringidas: false };
  let databasePromise;
  let docxLibraryPromise;
  let html2pdfLibraryPromise;
  let saveTimer;
  let toastTimer;
  let activeTab = "docente";
  let filteredPdas = [];

  function localIsoDate(date = new Date()) {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

  function defaultData() {
    const today = localIsoDate();
    return {
      docente: { titulo: teacherContext.titulo || "Mtro.", nombre: teacherContext.nombre },
      curso: { grado: "1ro", grupos: [], materia: teacherContext.materias[0] || (teacherContext.materiasRestringidas ? "" : "Matematicas"), campo: "Saberes y Pensamiento Científico", bilingue: false },
      planeacion: {
        metodologia: METHODOLOGIES[0],
        fecha_inicio: today,
        fecha_fin: today,
        dias_planeados: [],
        problematica: "",
        pda: "",
        pda_entries: [],
        pda_official_selected: [],
        pda_custom_entries: [],
        pda_custom_active: false,
        pda_selected: "",
        pda_custom: "",
        objetivos: "",
        perfiles: "",
        producto: "",
        eje1: AXES[0],
        eje2: AXES[0],
        eje3: AXES[0],
        disciplina1: "Seleccione materia",
        disciplina2: "Seleccione materia",
        disciplina3: "Seleccione materia",
        secuencia_abpj: {
          presentacion: "", recoleccion: "", formulacion: "", organizacion: "",
          experiencia: "", resultados: "", materiales: "", evaluacion: "", rubrica_paths: []
        },
        secuencia_diaria: []
      }
    };
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[char]);
  }

  function sanitizeRichHtml(value) {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(String(value || ""), "text/html");
    const allowed = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "UL", "OL", "LI"]);
    function clean(node) {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (["SCRIPT", "STYLE", "IFRAME", "OBJECT", "SVG", "IMG"].includes(child.tagName)) {
            child.remove();
          } else if (!allowed.has(child.tagName)) {
            child.replaceWith(...child.childNodes);
          } else {
            [...child.attributes].forEach((attribute) => child.removeAttribute(attribute.name));
            clean(child);
          }
        } else if (child.nodeType !== Node.TEXT_NODE) {
          child.remove();
        }
      }
    }
    clean(parsed.body);
    return parsed.body.innerHTML;
  }

  function plainText(value) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(value || ""), "text/html");
    return (doc.body.textContent || "").replace(/\u00a0/g, " ").trim();
  }

  function normalizeText(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }

  function resolveTeacherSubject(value) {
    const name = String(value || "").replace(/\s*\(\d+°\)\s*$/, "").trim();
    const normalized = normalizeText(name);
    const aliases = {
      "formacion civica y etica": "Educación Civica y Etica",
      tecnologia: "Informatica",
      "educacion fisica": "Educación Fisica"
    };
    const alias = aliases[normalized];
    return SUBJECTS.find(subject => normalizeText(subject) === normalized)
      || SUBJECTS.find(subject => normalizeText(subject) === normalizeText(alias))
      || name;
  }

  function readTeacherContext() {
    const params = new URLSearchParams(location.search);
    const titleOptions = ["Dr.", "Dra.", "Mtro.", "Mtra.", "Prof.", "Pasante."];
    let subjects = [];
    const rawSubjects = params.get("materias");
    if (rawSubjects) {
      const parsed = JSON.parse(rawSubjects);
      if (!Array.isArray(parsed) || parsed.some(subject => typeof subject !== "string")) {
        throw new Error("La lista de materias del docente no tiene un formato válido.");
      }
      subjects = [...new Set(parsed.map(resolveTeacherSubject).filter(Boolean))];
    }
    return {
      userId: cleanUserId(params.get("user") || params.get("user_id") || ""),
      nombre: String(params.get("nombre") || "").trim(),
      titulo: titleOptions.includes(params.get("titulo")) ? params.get("titulo") : "",
      materias: subjects,
      materiasRestringidas: params.has("materias")
    };
  }

  function getCurriculumRule(subject) {
    const normalized = normalizeText(subject);
    const smartMind = normalized.match(/^smartmind\s+(i|ii|iii)$/);
    if (smartMind) {
      const grade = { i: 1, ii: 2, iii: 3 }[smartMind[1]];
      return { field: FIELD_NOT_APPLICABLE, grades: [grade], smartMind: true };
    }

    const baseSubject = normalized.replace(/\s+(i|ii|iii)$/, "");
    if (baseSubject === "ciencias") return { field: "Saberes y Pensamiento Científico", grades: [1, 2, 3] };
    for (const rule of CURRICULUM) {
      if (rule.subjects.some((name) => normalizeText(name) === baseSubject)) {
        return { field: rule.field, grades: rule.grades };
      }
    }
    const legacySubjects = {
      matematicas: "Matemáticas",
      espanol: "Español",
      ingles: "Inglés",
      informatica: "Tecnología",
      "educacion civica y etica": "Formación Cívica y Ética",
      "educacion fisica": "Educación Física",
      fisica: "Física",
      quimica: "Química",
      tutoria: "Tutoría / Educación Socioemocional"
    };
    const legacyName = legacySubjects[baseSubject];
    if (legacyName) {
      const rule = CURRICULUM.find((item) => item.subjects.some((name) => normalizeText(name) === normalizeText(legacyName)));
      const grades = ["Física", "Química"].includes(legacyName)
        ? [legacyName === "Física" ? 2 : 3]
        : legacyName === "Matemáticas" && normalized.endsWith(" ii") ? [2]
          : legacyName === "Matemáticas" && normalized.endsWith(" iii") ? [3]
            : legacyName === "Matemáticas" && normalized.endsWith(" i") ? [1]
              : ["Educación Física"].includes(legacyName) ? [1, 2, 3]
                : rule.grades;
      return { field: rule.field, grades };
    }
    if (baseSubject === "biologia") return { field: "Saberes y Pensamiento Científico", grades: [1] };
    return null;
  }

  function gradeValue(number) {
    return ({ 1: "1ro", 2: "2do", 3: "3ro" })[number];
  }

  function applyCurriculumDefaults(course) {
    const rule = getCurriculumRule(course.materia);
    if (!rule) return false;
    const gradeNumber = Number.parseInt(course.grado, 10);
    const correctedGrade = rule.grades.includes(gradeNumber) ? course.grado : gradeValue(rule.grades[0]);
    const changedGrade = correctedGrade !== course.grado;
    course.grado = correctedGrade;
    course.campo = rule.field;
    if (rule.smartMind && changedGrade) course.materia = `SmartMind ${({ 1: "I", 2: "II", 3: "III" })[Number.parseInt(course.grado, 10)]}`;
    return changedGrade;
  }

  function localDate(value) {
    if (!value) return null;
    const parts = String(value).split("-");
    if (parts.length !== 3) return null;
    const result = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return Number.isNaN(result.getTime()) ? null : result;
  }

  function formatDate(value) {
    const date = localDate(value);
    if (!date) return "";
    return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  }

  function setPath(object, path, value) {
    const parts = path.split(".");
    let target = object;
    for (const part of parts.slice(0, -1)) {
      if (target[part] === undefined || target[part] === null) target[part] = {};
      target = target[part];
    }
    target[parts[parts.length - 1]] = value;
  }

  function getPath(object, path) {
    return path.split(".").reduce((value, part) => value == null ? undefined : value[part], object);
  }

  function cleanUserId(value) {
    return String(value || "").trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
  }

  function getInitialUserId() {
    const params = new URLSearchParams(location.search);
    const queryId = params.get("user") || params.get("user_id") || params.get("client_id");
    if (queryId && cleanUserId(queryId)) return cleanUserId(queryId);
    try {
      const savedId = cleanUserId(localStorage.getItem("planeador-user-id"));
      if (savedId) return savedId;
      const generated = `user_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
      localStorage.setItem("planeador-user-id", generated);
      return generated;
    } catch (error) {
      throw new Error(`No fue posible crear el identificador de sesión local: ${error.message}`);
    }
  }

  function openDatabase() {
    if (databasePromise) return databasePromise;
    databasePromise = new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("Este navegador no permite IndexedDB; no es posible habilitar el autoguardado."));
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "user_id" });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("No se pudo abrir la base local."));
      request.onblocked = () => reject(new Error("El almacenamiento local está bloqueado por otra pestaña. Cierra la pestaña anterior y vuelve a intentar."));
    });
    return databasePromise;
  }

  async function databaseRequest(mode, operation) {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      const request = operation(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Falló una operación de almacenamiento local."));
      transaction.onabort = () => reject(transaction.error || new Error("La operación de almacenamiento local se canceló."));
    });
  }

  function normalizeRubrics(container) {
    const paths = Array.isArray(container?.rubrica_paths) ? container.rubrica_paths : [];
    const names = Array.isArray(container?.rubrica_names) ? container.rubrica_names : [];
    const data = Array.isArray(container?.rubrica_data) ? container.rubrica_data : [];
    const records = [];
    for (const item of data) {
      if (item && validImageData(item.data)) records.push({ name: String(item.name || "Rúbrica"), data: item.data });
    }
    paths.forEach((path, index) => {
      if (typeof path !== "string") return;
      if (validImageData(path) && !records.some((item) => item.data === path)) {
        records.push({ name: String(names[index] || "Rúbrica"), data: path });
      } else if (!validImageData(path) && !records.some((item) => item.path === path)) {
        records.push({ name: String(names[index] || path.split(/[\\/]/).pop() || "Imagen no disponible"), data: "", path });
      }
    });
    return records;
  }

  function validImageData(value) {
    return typeof value === "string" && /^data:image\/(?:png|jpeg|jpg);base64,/i.test(value);
  }

  function normalizeImportedData(input) {
    if (!input || typeof input !== "object" || !input.planeacion || typeof input.planeacion !== "object") {
      throw new Error("El JSON no tiene el formato de una planeación compatible.");
    }
    const base = defaultData();
    const source = input.planeacion;
    const course = input.curso || {};
    const teacher = input.docente || {};
    const result = base;
    result.docente.titulo = String(teacher.titulo || base.docente.titulo);
    result.docente.nombre = String(teacher.nombre || "");
    result.curso.grado = ["1ro", "2do", "3ro"].includes(course.grado) ? course.grado : base.curso.grado;
    result.curso.grupos = Array.isArray(course.grupos) ? course.grupos.map(String).filter((group) => "ABCDEF".includes(group)) : [];
    result.curso.materia = String(course.materia || base.curso.materia);
    result.curso.campo = COURSE_FIELDS.includes(course.campo) ? course.campo : base.curso.campo;
    result.curso.bilingue = Boolean(course.bilingue ?? course.bilingüe ?? course.bilingual);
    applyCurriculumDefaults(result.curso);

    result.planeacion.metodologia = METHODOLOGIES.includes(source.metodologia) ? source.metodologia : base.planeacion.metodologia;
    result.planeacion.fecha_inicio = normalizeDate(source.fecha_inicio, base.planeacion.fecha_inicio);
    result.planeacion.fecha_fin = normalizeDate(source.fecha_fin, result.planeacion.fecha_inicio);
    result.planeacion.dias_planeados = Array.isArray(source.dias_planeados) ? source.dias_planeados.filter((day) => WEEKDAYS.includes(day)) : [];
    result.planeacion.problematica = sanitizeRichHtml(source.problematica || "");
    result.planeacion.objetivos = sanitizeRichHtml(source.objetivos || "");
    result.planeacion.perfiles = sanitizeRichHtml(source.perfiles || "");
    result.planeacion.producto = sanitizeRichHtml(source.producto || "");
    result.planeacion.eje1 = AXES.includes(source.eje1) ? source.eje1 : AXES[0];
    result.planeacion.eje2 = AXES.includes(source.eje2) ? source.eje2 : AXES[0];
    result.planeacion.eje3 = AXES.includes(source.eje3) ? source.eje3 : AXES[0];
    for (const key of ["disciplina1", "disciplina2", "disciplina3"]) {
      result.planeacion[key] = String(source[key] || "Seleccione materia");
    }

    const official = Array.isArray(source.pda_official_selected) ? source.pda_official_selected.map((item) => sanitizeRichHtml(item)) : [];
    const custom = Array.isArray(source.pda_custom_entries) ? source.pda_custom_entries.map((item) => sanitizeRichHtml(item)) : [];
    const unified = Array.isArray(source.pda_entries) ? source.pda_entries : [];
    const legacyCombined = source.pda && !unified.length ? String(source.pda).split(/<br\s*\/?>/i).map((part) => part.replace(/^\s*•\s*/, "")) : [];
    if (!official.length && !custom.length) {
      for (const entry of [...unified, ...legacyCombined]) {
        const value = sanitizeRichHtml(entry);
        if (!plainText(value)) continue;
        if (getPdaRecords(result.curso.materia, result.curso.grado).some((record) => record.pda === plainText(value))) official.push(value);
        else custom.push(value);
      }
    }
    const oldOfficial = String(source.pda_selected || "");
    if (oldOfficial && !official.some((entry) => plainText(entry) === plainText(oldOfficial))) official.push(sanitizeRichHtml(oldOfficial));
    const oldCustom = String(source.pda_custom || "");
    if (oldCustom && !custom.some((entry) => plainText(entry) === plainText(oldCustom))) custom.push(sanitizeRichHtml(oldCustom));
    result.planeacion.pda_official_selected = official;
    result.planeacion.pda_custom_entries = custom;
    result.planeacion.pda_entries = [...official, ...custom];
    result.planeacion.pda_selected = official.length ? plainText(official[0]) : oldOfficial;
    result.planeacion.pda_custom = custom.length ? plainText(custom[0]) : oldCustom;
    result.planeacion.pda_custom_active = Boolean(source.pda_custom_active || (custom.length && !official.length));
    result.planeacion.secuencia_abpj = { ...base.planeacion.secuencia_abpj };
    const sourceAbpj = source.secuencia_abpj || {};
    for (const [key] of ABPJ_FIELDS) result.planeacion.secuencia_abpj[key] = sanitizeRichHtml(sourceAbpj[key] || "");
    result.planeacion.secuencia_abpj.rubrica_paths = normalizeRubrics(sourceAbpj);
    result.planeacion.secuencia_diaria = Array.isArray(source.secuencia_diaria) ? source.secuencia_diaria.map((day) => ({
      dia_nombre: String(day.dia_nombre || ""),
      inicio: sanitizeRichHtml(day.inicio || ""),
      desarrollo: sanitizeRichHtml(day.desarrollo || ""),
      cierre: sanitizeRichHtml(day.cierre || ""),
      materiales: sanitizeRichHtml(day.materiales || ""),
      evaluacion: sanitizeRichHtml(day.evaluacion || ""),
      rubrica_paths: normalizeRubrics(day)
    })).filter((day) => day.dia_nombre) : [];
    return result;
  }

  function normalizeDate(value, fallback) {
    if (!value) return fallback;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return value;
    const dmy = String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : fallback;
  }

  function getPdaRecords(subject, grade) {
    const records = Array.isArray(window.PLANEADOR_PDA) ? window.PLANEADOR_PDA : [];
    const gradoMap = { "1ro": "1º", "2do": "2º", "3ro": "3º" };
    let targetGrade = gradoMap[grade] || "1º";
    let cleanSubject = String(subject || "").trim();
    if (cleanSubject.endsWith(" III")) { cleanSubject = cleanSubject.slice(0, -4).trim(); targetGrade = "3º"; }
    else if (cleanSubject.endsWith(" II")) { cleanSubject = cleanSubject.slice(0, -3).trim(); targetGrade = "2º"; }
    else if (cleanSubject.endsWith(" I")) { cleanSubject = cleanSubject.slice(0, -2).trim(); targetGrade = "1º"; }
    if (cleanSubject === "Ciencias") {
      cleanSubject = ({ "1º": "Biología", "2º": "Física", "3º": "Química" })[targetGrade];
    }
    const mappings = {
      Matematicas: "Matemáticas",
      "Educación Civica y Etica": "Formación Cívica y Ética",
      Ingles: "Inglés",
      Informatica: "Tecnología",
      "Educación Fisica": "Educación Física",
      Fisica: "Física",
      Quimica: "Química"
    };
    cleanSubject = mappings[cleanSubject] || cleanSubject;
    if (cleanSubject === "Biología") targetGrade = "1º";
    if (cleanSubject === "Física") targetGrade = "2º";
    if (cleanSubject === "Química") targetGrade = "3º";
    return records.filter((record) => normalizeText(record.materia) === normalizeText(cleanSubject) && normalizeText(record.grado) === normalizeText(targetGrade));
  }

  function populateSelect(element, values, placeholder) {
    const oldValue = element.value;
    element.replaceChildren();
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      element.append(option);
    });
    if (placeholder && !values.includes(placeholder)) {
      const option = document.createElement("option");
      option.value = placeholder;
      option.textContent = placeholder;
      element.prepend(option);
    }
    if ([...element.options].some((option) => option.value === oldValue)) element.value = oldValue;
  }

  function initializeSelects() {
    const materia = document.getElementById("cursoMateria");
    populateSelect(materia, teacherContext.materiasRestringidas ? teacherContext.materias : SUBJECTS);
    if (teacherContext.materiasRestringidas && !teacherContext.materias.length) {
      const option = new Option("Sin materias asignadas", "");
      option.disabled = true;
      materia.add(option);
    }
    for (const id of ["disciplina1", "disciplina2", "disciplina3"]) populateSelect(document.getElementById(id), SUBJECTS, "Seleccione materia");
    populateSelect(document.getElementById("cursoCampo"), COURSE_FIELDS);
    populateSelect(document.getElementById("planMetodologia"), METHODOLOGIES);
    for (const id of ["eje1", "eje2", "eje3"]) populateSelect(document.getElementById(id), AXES);
  }

  function imageName(item, index) {
    return item.name || `Rúbrica ${index + 1}`;
  }

  function renderRubrics(images, path) {
    if (!images?.length) return "";
    return `<div class="rubric-list">${images.map((image, index) => {
      const name = escapeHtml(imageName(image, index));
      if (image.data && validImageData(image.data)) {
        return `<figure class="rubric-item"><img src="${image.data}" alt="${name}"><figcaption>${name}</figcaption><button class="icon-button" type="button" aria-label="Eliminar ${name}" data-remove-rubric="${escapeHtml(path)}" data-index="${index}">×</button></figure>`;
      }
      return `<div class="rubric-item"><div class="rubric-missing">Imagen no disponible: ${name}</div><button class="icon-button" type="button" aria-label="Quitar ${name}" data-remove-rubric="${escapeHtml(path)}" data-index="${index}">×</button></div>`;
    }).join("")}</div>`;
  }

  function editorToolbar(path, compact = false) {
    const commands = compact ? [["bold", "<b>B</b>"], ["italic", "<i>I</i>"], ["underline", "<u>U</u>"], ["insertUnorderedList", "• Lista"]] :
      [["bold", "<b>B</b>"], ["italic", "<i>I</i>"], ["underline", "<u>U</u>"], ["insertUnorderedList", "• Lista"], ["insertOrderedList", "1. Lista"]];
    return `<div class="editor-toolbar${compact ? " compact" : ""}" role="toolbar" aria-label="Formato de texto">${commands.map(([command, text]) => `<button type="button" data-command="${command}" data-editor="${escapeHtml(path)}" title="${command}">${text}</button>`).join("")}</div>`;
  }

  function richEditor(path, placeholder, content, compact = true) {
    return `<div class="rich-field">${editorToolbar(path, compact)}<div class="rich-editor" contenteditable="true" data-bind="${escapeHtml(path)}" data-placeholder="${escapeHtml(placeholder)}">${sanitizeRichHtml(content || "")}</div></div>`;
  }

  function renderOfficialPdas() {
    const records = getPdaRecords(state.curso.materia, state.curso.grado);
    const selected = state.planeacion.pda_official_selected.map(plainText);
    const query = normalizeText(document.getElementById("pdaSearch").value);
    filteredPdas = records.filter((record) => !query || normalizeText(`${record.pda} ${record.contenido}`).includes(query));
    const list = document.getElementById("officialPdaList");
    if (!records.length) {
      list.innerHTML = `<div class="empty-state">No se encontraron PDAs oficiales para esta materia y grado en el Plan Sintético.</div>`;
    } else if (!filteredPdas.length) {
      list.innerHTML = `<div class="empty-state">No hay resultados para la búsqueda indicada.</div>`;
    } else {
      list.innerHTML = filteredPdas.map((record, index) => {
        const checked = selected.includes(record.pda) ? "checked" : "";
        return `<label class="pda-option"><input type="checkbox" data-pda-index="${records.indexOf(record)}" ${checked}><span><strong>${escapeHtml(record.pda)}</strong><small><b>Contenido:</b> ${escapeHtml(record.contenido)}</small></span></label>`;
      }).join("");
    }
    document.getElementById("pdaCount").textContent = `${selected.length} PDA${selected.length === 1 ? "" : "s"} oficial${selected.length === 1 ? "" : "es"} seleccionado${selected.length === 1 ? "" : "s"} · ${records.length} disponible${records.length === 1 ? "" : "s"}`;
  }

  function renderCustomPdas() {
    const target = document.getElementById("customPdaList");
    if (!state.planeacion.pda_custom_entries.length) {
      target.innerHTML = `<div class="empty-state">Aún no hay PDAs personalizados.</div>`;
      return;
    }
    target.innerHTML = state.planeacion.pda_custom_entries.map((value, index) => {
      const path = `planeacion.pda_custom_entries.${index}`;
      return `<div class="custom-pda-item"><div class="custom-pda-heading"><strong>PDA personalizado ${index + 1}</strong><button class="icon-button" type="button" data-remove-custom-pda="${index}" aria-label="Eliminar PDA personalizado ${index + 1}">×</button></div>${editorToolbar(path, false)}<div class="custom-pda-editor rich-editor" contenteditable="true" data-bind="${path}" data-placeholder="Redactar PDA personalizado">${sanitizeRichHtml(value)}</div></div>`;
    }).join("");
  }

  function activeDailySessions() {
    const start = localDate(state.planeacion.fecha_inicio);
    const end = localDate(state.planeacion.fecha_fin);
    if (!start || !end || start > end) return [];
    const savedByName = new Map(state.planeacion.secuencia_diaria.map((day) => [day.dia_nombre, day]));
    const result = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const weekday = cursor.getDay();
      if (weekday < 1 || weekday > 5) continue;
      const name = WEEKDAYS[weekday - 1];
      if (!state.planeacion.dias_planeados.includes(name)) continue;
      const label = `${name} ${String(cursor.getDate()).padStart(2, "0")}/${String(cursor.getMonth() + 1).padStart(2, "0")}/${cursor.getFullYear()}`;
      const previous = savedByName.get(label);
      result.push(previous ? { ...previous, dia_nombre: label } : {
        dia_nombre: label, inicio: "", desarrollo: "", cierre: "", materiales: "", evaluacion: "", rubrica_paths: []
      });
    }
    return result;
  }

  function renderSequence() {
    const target = document.getElementById("sequenceFields");
    const isProject = state.planeacion.metodologia.includes("ABPj");
    document.getElementById("methodBadge").textContent = isProject ? "Aprendizaje Basado en Proyectos (ABPj)" : state.planeacion.metodologia;
    const notice = document.getElementById("sequenceNotice");
    if (state.planeacion.metodologia === METHODOLOGIES[0]) {
      notice.hidden = false;
      notice.className = "notice notice-info";
      notice.textContent = "Selecciona una metodología en Detalles Generales para desplegar la secuencia didáctica correspondiente.";
      target.innerHTML = "";
      return;
    }
    if (isProject) {
      notice.hidden = true;
      target.innerHTML = `<article class="panel"><div class="panel-heading"><span class="panel-icon">ABPj</span><div><h3>Aprendizaje Basado en Proyectos</h3><p>Completa las fases de trabajo, materiales y evaluación.</p></div></div><div class="form-grid two-columns">${ABPJ_FIELDS.map(([key, label]) => {
        const path = `planeacion.secuencia_abpj.${key}`;
        return `<div class="field"><label>${escapeHtml(label)}</label>${richEditor(path, label, state.planeacion.secuencia_abpj[key])}${key === "evaluacion" ? `<div class="upload-row"><label>＋ Adjuntar rúbrica (PNG, JPG)<input type="file" accept="image/png,image/jpeg" multiple data-upload-rubric="planeacion.secuencia_abpj.rubrica_paths"></label></div>${renderRubrics(state.planeacion.secuencia_abpj.rubrica_paths, "planeacion.secuencia_abpj.rubrica_paths")}` : ""}</div>`;
      }).join("")}</div></article>`;
      return;
    }
    const sessions = activeDailySessions();
    if (!sessions.length) {
      notice.hidden = false;
      notice.className = "notice notice-warning";
      notice.textContent = state.planeacion.fecha_inicio > state.planeacion.fecha_fin
        ? "La fecha de inicio debe ser anterior o igual a la fecha de fin."
        : "No hay días hábiles seleccionados dentro del rango de fechas. Selecciona de lunes a viernes en Detalles Generales.";
      target.innerHTML = "";
      return;
    }
    notice.hidden = true;
    const expanded = target.dataset.rendered === "true" ? "" : "open";
    target.innerHTML = sessions.map((day, index) => {
      const safeName = escapeHtml(day.dia_nombre);
      const fields = DAILY_FIELDS.map(([key, label]) => {
        const path = `planeacion.secuencia_diaria.${index}.${key}`;
        return `<div class="field"><label>${label}</label>${richEditor(path, label, day[key] || "")}${key === "evaluacion" ? `<div class="upload-row"><label>＋ Adjuntar rúbricas (PNG, JPG)<input type="file" accept="image/png,image/jpeg" multiple data-upload-rubric="planeacion.secuencia_diaria.${index}.rubrica_paths"></label></div>${renderRubrics(day.rubrica_paths, `planeacion.secuencia_diaria.${index}.rubrica_paths`)}` : ""}</div>`;
      }).join("");
      return `<details class="day-session" ${expanded}><summary><span class="day-number">${index + 1}</span> Sesión ${index + 1}: ${safeName}</summary><div class="day-session-grid">${fields}</div></details>`;
    }).join("");
    target.dataset.rendered = "true";
    state.planeacion.secuencia_diaria = sessions;
  }

  function hydrateForm() {
    if (teacherContext.nombre) state.docente.nombre = teacherContext.nombre;
    if (teacherContext.materiasRestringidas && teacherContext.materias.length) {
      if (!teacherContext.materias.includes(state.curso.materia)) state.curso.materia = teacherContext.materias[0];
      applyCurriculumDefaults(state.curso);
    } else if (teacherContext.materiasRestringidas) {
      state.curso.materia = "";
    }
    document.querySelectorAll("[data-bind]").forEach((element) => {
      const value = getPath(state, element.dataset.bind);
      if (element.isContentEditable) element.innerHTML = sanitizeRichHtml(value || "");
      else if (element.type === "checkbox") element.checked = Boolean(value);
      else if (value !== undefined && value !== null) element.value = value;
    });
    document.getElementById("docenteNombre").readOnly = Boolean(teacherContext.nombre);
    document.getElementById("userId").readOnly = Boolean(teacherContext.userId);
    document.querySelectorAll("[data-group]").forEach((element) => {
      const values = getPath(state, element.dataset.group);
      element.checked = Array.isArray(values) && values.includes(element.value);
    });
  }

  function renderAll() {
    hydrateForm();
    renderOfficialPdas();
    renderCustomPdas();
    renderSequence();
    updateProgress();
    showTab(activeTab);
  }

  function showTab(tab) {
    activeTab = tab;
    document.querySelectorAll(".page-section").forEach((section) => section.classList.toggle("active", section.dataset.page === tab));
    document.querySelectorAll(".step-button").forEach((button) => button.classList.toggle("active", button.dataset.tab === tab));
    const labels = { docente: "Docente y Curso", detalles: "Detalles Generales", contenido: "Contenido Curricular", secuencia: "Secuencia & Exportar" };
    document.getElementById("currentStepLabel").textContent = `Paso ${Object.keys(labels).indexOf(tab) + 1} de 4 · ${labels[tab]}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateProgress() {
    const p = state.planeacion;
    const checks = [
      Boolean(state.docente.nombre.trim()), Boolean(state.curso.materia), state.curso.grupos.length > 0,
      p.metodologia !== METHODOLOGIES[0], p.fecha_inicio && p.fecha_fin, p.dias_planeados.length > 0,
      Boolean(p.problematica.trim()), p.pda_official_selected.length + p.pda_custom_entries.length > 0,
      Boolean(p.objetivos.trim()), Boolean(p.producto.trim())
    ];
    const percent = Math.round(checks.filter(Boolean).length / checks.length * 100);
    document.getElementById("progressBar").style.width = `${percent}%`;
    document.getElementById("progressLabel").textContent = `${percent}% completado`;
  }

  function currentData() {
    const p = state.planeacion;
    const daily = activeDailySessions();
    const abpj = { ...p.secuencia_abpj };
    const serializeRubrics = (images) => ({
      rubrica_paths: images.map((image) => image.data || image.path || image.name),
      rubrica_names: images.map((image, index) => imageName(image, index)),
      rubrica_data: images.filter((image) => image.data && validImageData(image.data)).map((image) => ({ name: image.name, data: image.data }))
    });
    Object.assign(abpj, serializeRubrics(p.secuencia_abpj.rubrica_paths));
    const dailySequence = daily.map((day) => ({ ...day, ...serializeRubrics(day.rubrica_paths) }));
    return {
      docente: { ...state.docente },
      curso: { ...state.curso, bilingue: Boolean(state.curso.bilingue) },
      planeacion: {
        ...p,
        pda: currentPdaHtml(),
        pda_entries: currentPdaList(),
        pda_official_selected: [...p.pda_official_selected],
        pda_custom_entries: [...p.pda_custom_entries],
        pda_custom_active: p.pda_custom_entries.length > 0 && p.pda_official_selected.length === 0,
        pda_selected: p.pda_official_selected.length ? plainText(p.pda_official_selected[0]) : "",
        pda_custom: p.pda_custom_entries.length ? plainText(p.pda_custom_entries[0]) : "",
        secuencia_abpj: abpj,
        secuencia_diaria: dailySequence
      }
    };
  }

  function currentPdaList() {
    return [...state.planeacion.pda_official_selected, ...state.planeacion.pda_custom_entries].filter((value) => plainText(value));
  }

  function currentPdaHtml() {
    return currentPdaList().map((value) => `• ${plainText(value)}`).join("<br/>");
  }

  function setStatus(message, kind = "normal") {
    const status = document.getElementById("saveStatus");
    status.textContent = message;
    status.dataset.state = kind;
  }

  function showToast(message, kind = "success") {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.dataset.kind = kind;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 4200);
  }

  function autosaveEnabled() {
    return document.getElementById("autosaveToggle").checked;
  }

  function scheduleSave() {
    updateProgress();
    if (!autosaveEnabled()) {
      setStatus("Autoguardado desactivado");
      return;
    }
    setStatus("Cambios pendientes…");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await databaseRequest("readwrite", (store) => store.put({
          user_id: userId,
          updated_at: new Date().toISOString(),
          data: currentData()
        }));
        setStatus(`Guardado local · ${new Date().toLocaleTimeString("es-MX")}`, "saved");
      } catch (error) {
        setStatus(`Error al guardar: ${error.message}`, "error");
        showToast(`No se pudo guardar la planeación: ${error.message}`, "error");
      }
    }, 500);
  }

  async function loadUserData(id) {
    const record = await databaseRequest("readonly", (store) => store.get(id));
    return record?.data ? normalizeImportedData(record.data) : null;
  }

  async function restoreCurrentUser() {
    try {
      const saved = await loadUserData(userId);
      if (saved && autosaveEnabled()) {
        state = saved;
        setStatus("Planeación restaurada desde este dispositivo", "saved");
      } else {
        setStatus("Almacenamiento local listo", "saved");
      }
    } catch (error) {
      setStatus(`Error de almacenamiento: ${error.message}`, "error");
      showToast(`No se pudo abrir el autoguardado: ${error.message}`, "error");
    }
    renderAll();
    updateScheduleSummary();
  }

  function updateUrlUser(id) {
    const url = new URL(location.href);
    url.searchParams.set("user", id);
    history.replaceState(null, "", url);
    try { localStorage.setItem("planeador-user-id", id); }
    catch (error) { showToast(`No se pudo recordar la sesión en este navegador: ${error.message}`, "error"); }
  }

  async function switchUser() {
    const requested = cleanUserId(document.getElementById("userId").value);
    if (!requested) {
      document.getElementById("userId").value = userId;
      showToast("La clave de sesión debe contener letras, números, guion o guion bajo.", "error");
      return;
    }
    if (requested === userId) return;
    if (!window.confirm(`¿Cambiar a la sesión “${requested}”? Se cargarán los datos guardados para esa clave, si existen.`)) {
      document.getElementById("userId").value = userId;
      return;
    }
    if (autosaveEnabled()) {
      try {
        await databaseRequest("readwrite", (store) => store.put({ user_id: userId, updated_at: new Date().toISOString(), data: currentData() }));
      } catch (error) {
        showToast(`No se pudo guardar la sesión actual antes del cambio: ${error.message}`, "error");
        document.getElementById("userId").value = userId;
        return;
      }
    }
    userId = requested;
    updateUrlUser(userId);
    document.getElementById("userId").value = userId;
    try {
      state = (await loadUserData(userId)) || defaultData();
      renderAll();
      setStatus("Sesión cargada en este dispositivo", "saved");
      showToast("Sesión cambiada.");
    } catch (error) {
      setStatus(`Error al cargar sesión: ${error.message}`, "error");
      showToast(`No se pudo cargar la nueva sesión: ${error.message}`, "error");
    }
  }

  async function newPlan() {
    if (!window.confirm("¿Iniciar una planeación nueva? Se reemplazará la planeación guardada para esta clave de sesión.")) return;
    clearTimeout(saveTimer);
    try {
      await databaseRequest("readwrite", (store) => store.delete(userId));
      state = defaultData();
      document.getElementById("promptOutput").value = "";
      document.getElementById("copyPromptButton").disabled = true;
      document.getElementById("sequenceFields").dataset.rendered = "";
      document.getElementById("pdaSearch").value = "";
      renderAll();
      showTab("docente");
      setStatus("Nueva planeación lista", "saved");
      showToast("Se inició una planeación nueva.");
    } catch (error) {
      setStatus(`Error al reiniciar: ${error.message}`, "error");
      showToast(`No se pudo eliminar el autoguardado: ${error.message}`, "error");
    }
  }

  function safeFileName(value) {
    return String(value || "planeacion").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "planeacion";
  }

  function makeFileName(extension) {
    const data = currentData();
    const p = data.planeacion;
    const period = `${formatDate(p.fecha_inicio).replaceAll("/", "-")}_${formatDate(p.fecha_fin).replaceAll("/", "-")}`;
    return `${safeFileName(data.curso.materia)}-${safeFileName(data.curso.grado)}-${safeFileName(data.curso.grupos.join("-") || "grupo")}-${period}-${safeFileName(`${data.docente.titulo} ${data.docente.nombre}`)}.${extension}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(currentData(), null, 2)], { type: "application/json;charset=utf-8" });
    downloadBlob(blob, makeFileName("json"));
    showToast("Respaldo JSON descargado.");
  }

  async function loadJsonFile(file) {
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) {
      showToast("El archivo supera el límite de 200 MB.", "error");
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      const imported = normalizeImportedData(parsed);
      if (!window.confirm("Cargar este archivo reemplazará la planeación actual. ¿Continuar?")) return;
      state = imported;
      document.getElementById("pdaSearch").value = "";
      document.getElementById("sequenceFields").dataset.rendered = "";
      renderAll();
      scheduleSave();
      showToast("Planeación cargada correctamente.");
    } catch (error) {
      showToast(`No se pudo cargar el JSON: ${error.message}`, "error");
    } finally {
      document.getElementById("jsonFile").value = "";
    }
  }

  async function addRubricFiles(input) {
    const path = input.dataset.uploadRubric;
    const list = getPath(state, path);
    const files = [...input.files];
    if (!Array.isArray(list)) {
      showToast("No se encontró el destino de las rúbricas.", "error");
      return;
    }
    for (const file of files) {
      if (!["image/png", "image/jpeg"].includes(file.type)) {
        showToast(`Formato no admitido: ${file.name}. Usa PNG o JPG.`, "error");
        continue;
      }
      if (file.size > 12 * 1024 * 1024) {
        showToast(`${file.name} supera el límite de 12 MB por imagen.`, "error");
        continue;
      }
      try {
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(reader.error || new Error("No se pudo leer la imagen."));
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(file);
        });
        if (!validImageData(data)) throw new Error("El archivo no produjo una imagen PNG o JPEG válida.");
        if (!list.some((item) => item.data === data)) list.push({ name: file.name, data });
      } catch (error) {
        showToast(`Error al procesar ${file.name}: ${error.message}`, "error");
      }
    }
    document.getElementById("sequenceFields").dataset.rendered = "true";
    renderSequence();
    scheduleSave();
    input.value = "";
  }

  function removeRubric(path, index) {
    const images = getPath(state, path);
    if (!Array.isArray(images) || !images[index]) {
      showToast("No se pudo encontrar la rúbrica seleccionada.", "error");
      return;
    }
    images.splice(index, 1);
    document.getElementById("sequenceFields").dataset.rendered = "true";
    renderSequence();
    scheduleSave();
  }

  function renderPrompt() {
    const data = currentData();
    const p = data.planeacion;
    const gradeAge = { "1ro": "11 a 12 años", "2do": "12 a 13 años", "3ro": "13 a 15 años" };
    const axes = [p.eje1, p.eje2, p.eje3].filter((value) => value && !value.includes("Seleccione")).join(", ");
    const linked = [p.disciplina1, p.disciplina2, p.disciplina3].filter((value) => value && !value.includes("Seleccione")).join(", ");
    const prompt = [
      "Actúa como un docente experto de secundaria en México (SEP, Nueva Escuela Mexicana).",
      "",
      `Genera una planeación didáctica para la materia de **${data.curso.materia}**.`,
      `- **Grado:** ${data.curso.grado} (Alumnos de aprox. ${gradeAge[data.curso.grado] || "11 a 15 años"}).`,
      `- **Campo Formativo:** ${data.curso.campo}.`,
      `- **Metodología:** ${p.metodologia}.`,
      `- **Temporalidad:** Del ${p.fecha_inicio} al ${p.fecha_fin}.`,
      `- **Días de clase:** ${p.dias_planeados.join(", ")}.`,
      ...(axes ? [`- **Ejes Articuladores:** ${axes}.`] : []),
      ...(linked ? [`- **Materias vinculadas:** ${linked}.`] : []),
      `- **Problemática Contextual:** ${plainText(p.problematica) || "No definida. Propón una relevante."}`,
      ...(p.pda_official_selected.length
        ? [`- **PDA (Plan Sintético):** ${p.pda_official_selected.map(plainText).filter(Boolean).join("; ")}`]
        : !p.pda_custom_entries.length ? ["- **PDA (Plan Sintético):** Propón el PDA oficial más adecuado."] : []),
      ...(p.pda_custom_entries.length
        ? [`- **PDA redactado como codiseño:** ${p.pda_custom_entries.map(plainText).filter(Boolean).join("; ")}`, ...(p.pda_custom_active ? ["- **Instrucción Especial:** Redacta un PDA que se ajuste a la SEP fase 6."] : [])]
        : []),
      `- **Objetivos:** ${plainText(p.objetivos) || "Propón objetivos de aprendizaje adecuados."}`,
      `- **Perfil de Egreso:** ${plainText(p.perfiles) || "Propón los rasgos del perfil de egreso que se favorecen."}`,
      `- **Producto Final:** ${plainText(p.producto) || "Propón un producto creativo."}`,
      p.metodologia.includes("Proyectos")
        ? "Desarrolla la secuencia didáctica siguiendo las fases de **ABPj** (Presentación, Recolección, Formulación, Organización, Vivamos la experiencia, Resultados)."
        : "Desarrolla la secuencia didáctica como una **Planeación Diaria** (Inicio, Desarrollo, Cierre) para cada día.",
      "En la secuencia didáctica, incluye para cada actividad/fase los **Materiales y Recursos** necesarios, así como una propuesta de **Evaluación** (sugiere Lista de Cotejo o Rúbrica si es necesario)."
    ].join("\n");
    const finalPrompt = data.curso.bilingue
      ? `${prompt}\n\n**INSTRUCCIÓN BILINGÜE:** Genera la planeación didáctica completamente en inglés para la materia de ${data.curso.materia}. Todos los títulos, descripciones, actividades y contenidos deben estar escritos en inglés.`
      : prompt;
    document.getElementById("promptOutput").value = finalPrompt;
    document.getElementById("copyPromptButton").disabled = false;
    document.getElementById("promptOutput").focus();
    showTab("secuencia");
    showToast("Prompt generado. Puedes copiarlo y pegarlo en tu IA favorita.");
  }

  function fieldRow(label, value) {
    return `<tr><th>${escapeHtml(label)}</th><td>${sanitizeRichHtml(value || "")}</td></tr>`;
  }

  function exportRubricImages(images) {
    return (images || []).filter((image) => image.data && validImageData(image.data))
      .map((image) => `<figure class="rubric"><img src="${image.data}" alt="${escapeHtml(image.name || "Rúbrica")}"><figcaption>${escapeHtml(image.name || "Rúbrica")}</figcaption></figure>`).join("");
  }

  function getAppResourceUrl(path) {
    const appScript = [...document.scripts].find((item) => /(?:^|\/)app\.js(?:\?|$)/.test(item.src));
    if (!appScript) throw new Error("No se pudo localizar app.js para resolver los recursos locales.");
    const appDirectory = new URL(".", appScript.src);
    const resourcePath = location.pathname.toLowerCase().includes("/webversion/")
      ? path
      : path.split("/").pop();
    return new URL(resourcePath, appDirectory).href;
  }

  function printHtml(data) {
    const p = data.planeacion;
    const isProject = p.metodologia.includes("ABPj");
    const hasSequence = p.metodologia !== METHODOLOGIES[0];
    const axes = [p.eje1, p.eje2, p.eje3].filter((value) => value && !value.includes("Seleccione")).join(", ");
    const linked = [p.disciplina1, p.disciplina2, p.disciplina3].filter((value) => value && !value.includes("Seleccione")).join(", ");
    const brandAssets = window.PLANEADOR_BRAND_ASSETS || {};
    const watermarkFile = PDF_WATERMARK_ASSETS[data.curso.campo];
    const watermarkUrl = watermarkFile ? getAppResourceUrl(`assets/${watermarkFile}`) : "";
    const watermarkStyle = watermarkUrl
      ? `background-image:url("${watermarkUrl}");background-size:100% ${PDF_WATERMARK_TILE_HEIGHT_PX}px;background-repeat:repeat-y;`
      : "background-color:#fff;";
    const mainRows = [
      ["Materia", data.curso.materia], ["Metodología", p.metodologia], ["Ejes articuladores", axes],
      ["Materias vinculadas", linked], ["Problemática contextual", p.problematica],
      [p.pda_custom_active ? "PDA redactado como codiseño" : "Proceso de Desarrollo de Aprendizaje (PDA)", p.pda || p.pda_selected || p.pda_custom],
      ["Objetivos", p.objetivos], ["Perfiles de egreso", p.perfiles], ["Temporalidad", `Del ${formatDate(p.fecha_inicio)} al ${formatDate(p.fecha_fin)} · Días: ${p.dias_planeados.join(", ")}`],
      ["Producto final", p.producto]
    ];
    const sequence = !hasSequence ? "" : isProject
      ? `<h2>Secuencia Didáctica (ABPj)</h2><table>${ABPJ_FIELDS.map(([key, label]) => fieldRow(label, p.secuencia_abpj[key])).join("")}</table><h3>Rúbricas · Evaluación</h3>${exportRubricImages(normalizeRubrics(p.secuencia_abpj))}`
      : `<h2>Secuencia Didáctica (Diaria)</h2>${p.secuencia_diaria.map((day) => `<h3>${escapeHtml(day.dia_nombre)}</h3><table>${DAILY_FIELDS.map(([key, label]) => fieldRow(label, day[key])).join("")}</table><h4>Rúbricas · Evaluación</h4>${exportRubricImages(normalizeRubrics(day))}`).join("")}`;
    const printStyles = `
      @page{size:landscape letter;margin:0}
      .pdf-export,.pdf-export *{box-sizing:border-box}
      .pdf-export{display:block;width:100%;min-height:180mm;padding:${PDF_PAGE_LAYOUT.contentMarginMm}mm;color:#171717;font-family:Arial,sans-serif;font-size:10pt;line-height:normal;background-color:#fff;${watermarkStyle}}
      .pdf-export .header{display:grid;grid-template-columns:20mm 1fr 24mm;align-items:center;gap:8mm;margin-bottom:8mm;background:#fff}
      .pdf-export .header img{max-width:100%;max-height:17mm;object-fit:contain}
      .pdf-export .header-copy{text-align:center}
      .pdf-export .header-copy p{margin:2px}
      .pdf-export .header-copy h1{margin:4px;font-size:17pt}
      .pdf-export .facts{display:flex;flex-wrap:wrap;gap:5mm;margin:4mm 0}
      .pdf-export .facts span{padding:2mm;border:1px solid #888;background:#fff}
      .pdf-export .rows{width:100%;border-collapse:collapse;table-layout:fixed}
      .pdf-export .rows th,.pdf-export .rows td,.pdf-export table th,.pdf-export table td{padding:2.4mm;border:1px solid #555;vertical-align:top;text-align:left;overflow-wrap:anywhere;background:#fff}
      .pdf-export .rows th{width:24%}
      .pdf-export .rows p,.pdf-export table p{margin:0 0 2mm}
      .pdf-export .rows ul,.pdf-export .rows ol,.pdf-export table ul,.pdf-export table ol{padding-left:5mm}
      .pdf-export .sequence h2{text-align:center}
      .pdf-export .rubric{display:inline-block;width:45%;margin:3mm;vertical-align:top}
      .pdf-export .rubric img{max-width:100%;max-height:65mm;object-fit:contain}
      .pdf-export .signature{margin-top:20mm;text-align:center;background:#fff}
      .pdf-export .signature p{margin:2mm}
      .pdf-export .sequence h3,.pdf-export .sequence h4{margin-bottom:2mm}
      .pdf-export .group-list{margin:0}
    `;
    return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${escapeHtml(makeFileName("pdf"))}</title><style>body{margin:0}</style></head><body><main class="document pdf-export" data-watermark-src="${escapeHtml(watermarkUrl)}"><style>${printStyles}</style>
      <header class="header"><img src="${brandAssets.immLogo || ""}" alt="IMM"><div class="header-copy"><p>Secretaría de Educación Pública</p><p>Dirección de Educación Secundaria</p><strong>Instituto Mexicano Madero</strong><h1>Planeación Docente</h1></div><img src="${brandAssets.sepLogo || ""}" alt="SEP"></header>
      <div class="facts"><span><b>Escuela:</b> Instituto Mexicano Madero</span><span><b>CCT:</b> 21PES0013L</span><span><b>Docente:</b> ${escapeHtml(`${data.docente.titulo} ${data.docente.nombre}`)}</span><span><b>Grado:</b> ${escapeHtml(data.curso.grado)}</span><span><b>Grupo:</b> ${escapeHtml(data.curso.grupos.join(", "))}</span><span><b>Fase:</b> 6</span><span><b>Campo:</b> ${escapeHtml(data.curso.campo)}</span></div>
      <table class="rows">${mainRows.map(([label, value]) => fieldRow(label, value)).join("")}</table>
      <section class="sequence${hasSequence ? " page-break" : ""}">${sequence}</section>
      <footer class="signature"><p>_____________________________________________</p><p>Vo. Bo. Director David Pérez Ordoñez</p></footer>
    </main></body></html>`;
  }

  function loadHtml2PdfLibrary() {
    if (typeof window.html2pdf === "function") return Promise.resolve();
    if (!html2pdfLibraryPromise) {
      html2pdfLibraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        try {
          script.src = getAppResourceUrl("vendor/html2pdf.bundle.min.js");
        } catch (error) {
          reject(error);
          return;
        }
        script.onload = () => typeof window.html2pdf === "function"
          ? resolve()
          : reject(new Error("El archivo local html2pdf.bundle.min.js cargó, pero no expone el generador PDF."));
        script.onerror = () => reject(new Error("No se pudo cargar html2pdf.bundle.min.js; publica el archivo junto a app.js."));
        document.head.append(script);
      });
    }
    return html2pdfLibraryPromise;
  }

  async function exportPdf() {
    await loadHtml2PdfLibrary();
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.style.cssText = `position:fixed;left:0;top:0;width:${PDF_PAGE_WIDTH_PX}px;height:900px;opacity:0;pointer-events:none;z-index:-1;border:0`;
    frame.srcdoc = printHtml(currentData());
    const loaded = new Promise((resolve, reject) => {
      frame.addEventListener("load", resolve, { once: true });
      frame.addEventListener("error", () => reject(new Error("No se pudo preparar la vista de impresión.")), { once: true });
    });
    document.body.append(frame);
    try {
      await loaded;
      const target = frame.contentDocument.querySelector(".document");
      if (!target) throw new Error("No se pudo construir el documento para PDF.");
      const images = [...frame.contentDocument.images];
      await Promise.all(images.map((image) => image.decode()));
      if (target.dataset.watermarkSrc) {
        const watermark = new frame.contentWindow.Image();
        watermark.src = target.dataset.watermarkSrc;
        await watermark.decode();
      }
      await frame.contentDocument.fonts.ready;
      const pageBreak = target.querySelector(".sequence.page-break");
      if (pageBreak) {
        const targetTop = target.getBoundingClientRect().top;
        const sectionTop = pageBreak.getBoundingClientRect().top - targetTop;
        const pageBreakPadding = (PDF_WATERMARK_TILE_HEIGHT_PX - (sectionTop % PDF_WATERMARK_TILE_HEIGHT_PX))
          % PDF_WATERMARK_TILE_HEIGHT_PX;
        if (pageBreakPadding > 0) {
          const pageStart = frame.contentDocument.createElement("div");
          pageStart.setAttribute("aria-hidden", "true");
          pageStart.style.height = `${pageBreakPadding}px`;
          pageBreak.before(pageStart);
        }
      }
      const targetHeight = target.getBoundingClientRect().height;
      const bottomPadding = (PDF_WATERMARK_TILE_HEIGHT_PX - (targetHeight % PDF_WATERMARK_TILE_HEIGHT_PX))
        % PDF_WATERMARK_TILE_HEIGHT_PX;
      if (bottomPadding > 0) {
        const pageFill = frame.contentDocument.createElement("div");
        pageFill.setAttribute("aria-hidden", "true");
        pageFill.style.height = `${bottomPadding}px`;
        target.append(pageFill);
      }
      await window.html2pdf().set({
        margin: 0,
        filename: makeFileName("pdf"),
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: {
          scale: 1.7,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: PDF_PAGE_WIDTH_PX
        },
        jsPDF: { unit: "mm", format: "letter", orientation: "landscape" },
        pagebreak: { mode: [], before: [] }
      }).from(target).save();
      showToast("PDF generado y descargado.");
      return true;
    } finally {
      frame.remove();
    }
  }

  function richDocxParagraphs(html, api) {
    const { Paragraph, TextRun } = api;
    const parsed = new DOMParser().parseFromString(sanitizeRichHtml(html || ""), "text/html");
    const result = [];
    let runs = [];
    let listKind = "";
    const addText = (text, format) => {
      if (text) runs.push(new TextRun({ text, bold: format.bold, italics: format.italics, underline: format.underline ? {} : undefined }));
    };
    const flush = () => {
      if (!runs.length) runs = [new TextRun({ text: "" })];
      const options = { children: runs };
      if (listKind === "ul") options.bullet = { indent: 360 };
      if (listKind === "ol") options.numbering = { reference: "numbered-list", level: 0 };
      result.push(new Paragraph(options));
      runs = [];
    };
    function visit(node, format = { bold: false, italics: false, underline: false }) {
      if (node.nodeType === Node.TEXT_NODE) {
        addText(node.nodeValue, format);
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const next = {
        bold: format.bold || node.tagName === "B" || node.tagName === "STRONG",
        italics: format.italics || node.tagName === "I" || node.tagName === "EM",
        underline: format.underline || node.tagName === "U"
      };
      if (node.tagName === "UL" || node.tagName === "OL") {
        const oldKind = listKind;
        listKind = node.tagName.toLowerCase();
        [...node.childNodes].forEach((child) => visit(child, next));
        if (runs.length) flush();
        listKind = oldKind;
        return;
      }
      if (node.tagName === "P" || node.tagName === "LI" || node.tagName === "BR") {
        if (runs.length) flush();
        if (node.tagName === "BR") return;
        [...node.childNodes].forEach((child) => visit(child, next));
        if (runs.length) flush();
        return;
      }
      [...node.childNodes].forEach((child) => visit(child, next));
    }
    [...parsed.body.childNodes].forEach((node) => visit(node));
    if (runs.length || !result.length) flush();
    return result;
  }

  function textParagraph(value, api, options = {}) {
    return new api.Paragraph({ children: [new api.TextRun({ text: String(value || ""), ...options })] });
  }

  function docxTable(items, api) {
    const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType } = api;
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [2600, 7400],
      rows: items.map(([label, value]) => new TableRow({
        children: [
          new TableCell({ width: { size: 2600, type: WidthType.DXA }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })] }),
          new TableCell({ width: { size: 7400, type: WidthType.DXA }, children: richDocxParagraphs(value, api) })
        ]
      }))
    });
  }

  async function imageRun(image, api, width = 360) {
    if (!image?.data || !validImageData(image.data)) return null;
    const encoded = image.data.slice(image.data.indexOf(",") + 1);
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const type = image.data.startsWith("data:image/png") ? "png" : "jpg";
    return new api.ImageRun({ data: bytes, type, transformation: { width, height: Math.round(width * .6) } });
  }

  function brandImageRun(dataUrl, api, width, height) {
    if (!dataUrl) return null;
    const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new api.ImageRun({ data: bytes, type: "png", transformation: { width, height } });
  }

  async function exportWord() {
    await loadDocxLibrary();
    const api = window.docx;
    if (!api?.Document || !api?.Packer) {
      throw new Error("No se cargó la biblioteca DOCX. Revisa la conexión a Internet o permite el CDN cdn.jsdelivr.net.");
    }
    const data = currentData();
    const p = data.planeacion;
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, PageOrientation, AlignmentType } = api;
    const brandAssets = window.PLANEADOR_BRAND_ASSETS || {};
    const immLogo = brandImageRun(brandAssets.immLogo, api, 90, 45);
    const sepLogo = brandImageRun(brandAssets.sepLogo, api, 110, 50);
    const children = [
      new Paragraph({ alignment: AlignmentType.CENTER, children: [immLogo, new TextRun({ text: "     " }), sepLogo].filter(Boolean) }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Secretaría de Educación Pública", bold: true })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Dirección de Educación Secundaria · Instituto Mexicano Madero", bold: true })] }),
      new Paragraph({ text: "Planeación Docente", heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
      textParagraph(`Escuela: Instituto Mexicano Madero · CCT: 21PES0013L · Docente: ${data.docente.titulo} ${data.docente.nombre}`, api),
      textParagraph(`Materia: ${data.curso.materia} · Grado: ${data.curso.grado} · Grupos: ${data.curso.grupos.join(", ")} · Fase: 6 · Campo: ${data.curso.campo}`, api),
      textParagraph(`Modalidad bilingüe: ${data.curso.bilingue ? "Sí" : "No"}`, api),
      new Paragraph({ text: "Contenido Pedagógico", heading: HeadingLevel.HEADING_2 }),
      docxTable([
        ["Metodología:", p.metodologia],
        ["Temporalidad:", `${formatDate(p.fecha_inicio)} - ${formatDate(p.fecha_fin)}`],
        ["Días de clase:", p.dias_planeados.join(", ")],
        ["Ejes articuladores:", [p.eje1, p.eje2, p.eje3].filter((value) => value && !value.includes("Seleccione")).join(", ")],
        ["Materias vinculadas:", [p.disciplina1, p.disciplina2, p.disciplina3].filter((value) => value && !value.includes("Seleccione")).join(", ")],
        ["Problemática contextual:", p.problematica],
        ["Objetivos:", p.objetivos],
        ["Perfil de egreso:", p.perfiles],
        ["Producto final:", p.producto]
      ], api)
    ];
    const pdaList = currentPdaList().filter((entry) => plainText(entry));
    if (pdaList.length) {
      children.push(new Paragraph({ text: "Proceso de Desarrollo de Aprendizaje (PDA)", heading: HeadingLevel.HEADING_2 }));
      pdaList.forEach((pda) => children.push(...richDocxParagraphs(pda, api)));
    }
    if (p.metodologia.includes("ABPj")) {
      children.push(new Paragraph({ text: "Secuencia Didáctica ABPj", heading: HeadingLevel.HEADING_2 }));
      children.push(docxTable(ABPJ_FIELDS.map(([key, label]) => [`${label}:`, p.secuencia_abpj[key]]), api));
      for (const image of normalizeRubrics(p.secuencia_abpj)) {
        const run = await imageRun(image, api);
        if (run) children.push(new Paragraph({ children: [run] }));
        else if (image.path) children.push(textParagraph(`[Imagen de rúbrica no disponible: ${image.name}]`, api));
      }
    } else if (p.metodologia !== METHODOLOGIES[0]) {
      children.push(new Paragraph({ text: "Secuencia Didáctica", heading: HeadingLevel.HEADING_2 }));
      for (const day of p.secuencia_diaria) {
        children.push(new Paragraph({ text: day.dia_nombre, heading: HeadingLevel.HEADING_3 }));
        children.push(docxTable(DAILY_FIELDS.map(([key, label]) => [`${label}:`, day[key]]), api));
        for (const image of normalizeRubrics(day)) {
          const run = await imageRun(image, api);
          if (run) children.push(new Paragraph({ children: [run] }));
          else if (image.path) children.push(textParagraph(`[Imagen de rúbrica no disponible: ${image.name}]`, api));
        }
      }
    }
    children.push(new Paragraph({ text: "" }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "_____________________________________________" })] }));
    children.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Vo. Bo. Director David Pérez Ordoñez" })] }));
    const document = new Document({
      numbering: { config: [{ reference: "numbered-list", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: "start", style: { paragraph: { indent: { left: 720, hanging: 260 } } } }] }] },
      sections: [{
        properties: { page: { size: { orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
        children
      }]
    });
    const blob = await Packer.toBlob(document);
    downloadBlob(blob, makeFileName("docx"));
    showToast("Documento Word generado y descargado.");
  }

  function loadDocxLibrary() {
    if (window.docx?.Document && window.docx?.Packer) return Promise.resolve();
    if (!docxLibraryPromise) {
      docxLibraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        try {
          script.src = getAppResourceUrl("vendor/docx.umd.js");
        } catch (error) {
          reject(error);
          return;
        }
        script.onload = () => window.docx?.Document && window.docx?.Packer
          ? resolve()
          : reject(new Error("El archivo local docx.umd.js cargó, pero no expone el generador DOCX."));
        script.onerror = () => reject(new Error("No se pudo cargar docx.umd.js; publica el archivo junto a app.js."));
        document.head.append(script);
      });
    }
    return docxLibraryPromise;
  }

  async function generateDownloads() {
    const format = document.getElementById("downloadFormat").value;
    try {
      if (format === "PDF" || format === "PDF + WORD") {
        if (!await exportPdf()) return;
      }
      if (format === "WORD" || format === "PDF + WORD") await exportWord();
    } catch (error) {
      showToast(`Error al generar el documento: ${error.message}`, "error");
    }
  }

  function bindEvents() {
    document.addEventListener("input", (event) => {
      if (event.target.id === "pdaSearch") {
        renderOfficialPdas();
        return;
      }
      const element = event.target.closest("[data-bind]");
      if (!element) return;
      const value = element.isContentEditable ? sanitizeRichHtml(element.innerHTML) : element.type === "checkbox" ? element.checked : element.value;
      setPath(state, element.dataset.bind, value);
      scheduleSave();
    });

    document.addEventListener("change", (event) => {
      const element = event.target;
      if (element.matches("[data-bind]")) {
        const value = element.type === "checkbox" ? element.checked : element.value;
        setPath(state, element.dataset.bind, value);
        if (element.dataset.bind === "curso.materia") {
          const gradeChanged = applyCurriculumDefaults(state.curso);
          hydrateForm();
          if (gradeChanged) showToast(`El grado se ajustó a ${state.curso.grado} porque ${state.curso.materia} solo corresponde a ese grado.`);
          renderOfficialPdas();
        }
        if (element.dataset.bind === "curso.grado") {
          const rule = getCurriculumRule(state.curso.materia);
          if (rule && !rule.grades.includes(Number.parseInt(state.curso.grado, 10))) {
            if (rule.smartMind) state.curso.materia = `SmartMind ${({ 1: "I", 2: "II", 3: "III" })[Number.parseInt(state.curso.grado, 10)]}`;
            else {
              state.curso.grado = gradeValue(rule.grades[0]);
              showToast(`${state.curso.materia} solo está disponible en ${state.curso.grado}.`);
            }
            hydrateForm();
          }
          renderOfficialPdas();
        }
        if (["planeacion.metodologia", "planeacion.fecha_inicio", "planeacion.fecha_fin"].includes(element.dataset.bind)) {
          document.getElementById("sequenceFields").dataset.rendered = "true";
          renderSequence();
          updateScheduleSummary();
        }
        scheduleSave();
      }
      if (element.matches("[data-group]")) {
        const path = element.dataset.group;
        const values = new Set(getPath(state, path) || []);
        if (element.checked) values.add(element.value); else values.delete(element.value);
        setPath(state, path, [...values]);
        if (path === "planeacion.dias_planeados") {
          document.getElementById("sequenceFields").dataset.rendered = "true";
          renderSequence();
          updateScheduleSummary();
        }
        scheduleSave();
      }
      if (element.id === "autosaveToggle") {
        try { localStorage.setItem("planeador-autosave", element.checked ? "true" : "false"); }
        catch (error) { showToast(`No se pudo guardar la preferencia: ${error.message}`, "error"); }
        if (element.checked) scheduleSave(); else setStatus("Autoguardado desactivado");
      }
      if (element.id === "userId") switchUser();
      if (element.id === "jsonFile") loadJsonFile(element.files[0]);
      if (element.matches("[data-upload-rubric]")) addRubricFiles(element);
      if (element.id === "pdaSearch") renderOfficialPdas();
      if (element.matches("[data-pda-index]")) {
        const records = getPdaRecords(state.curso.materia, state.curso.grado);
        const record = records[Number(element.dataset.pdaIndex)];
        if (record) {
          const selected = new Set(state.planeacion.pda_official_selected.map(plainText));
          if (element.checked) selected.add(record.pda); else selected.delete(record.pda);
          state.planeacion.pda_official_selected = [...selected];
          renderOfficialPdas();
          scheduleSave();
        }
      }
    });

    document.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-tab]");
      if (tab) showTab(tab.dataset.tab);
      const next = event.target.closest("[data-next]");
      if (next) showTab(next.dataset.next);
      const previous = event.target.closest("[data-prev]");
      if (previous) showTab(previous.dataset.prev);
      const removeCustom = event.target.closest("[data-remove-custom-pda]");
      if (removeCustom) {
        state.planeacion.pda_custom_entries.splice(Number(removeCustom.dataset.removeCustomPda), 1);
        renderCustomPdas();
        scheduleSave();
      }
      const removeImage = event.target.closest("[data-remove-rubric]");
      if (removeImage) removeRubric(removeImage.dataset.removeRubric, Number(removeImage.dataset.index));
      const commandButton = event.target.closest("[data-command]");
      if (commandButton) {
        event.preventDefault();
        const editorPath = commandButton.dataset.editor;
        const editor = editorPath
          ? document.querySelector(`[data-bind="${CSS.escape(editorPath)}"]`)
          : commandButton.closest("[data-rich-field]")?.querySelector(".rich-editor");
        if (!editor) return;
        editor.focus();
        document.execCommand(commandButton.dataset.command, false);
        editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText" }));
      }
      if (event.target.closest("#newPlanButton")) newPlan();
      if (event.target.closest("#addCustomPda")) {
        state.planeacion.pda_custom_entries.push("");
        renderCustomPdas();
        scheduleSave();
        const editors = document.querySelectorAll("#customPdaList [contenteditable]");
        editors[editors.length - 1]?.focus();
      }
      if (event.target.closest("#saveJsonButton") || event.target.closest("#exportJsonFromSequence")) downloadJson();
      if (event.target.closest("#sidebarPdfButton")) exportPdf().catch((error) => showToast(`Error al generar PDF: ${error.message}`, "error"));
      if (event.target.closest("#sidebarWordButton")) exportWord().catch((error) => showToast(`Error al generar Word: ${error.message}`, "error"));
      if (event.target.closest("#generateDownloadsButton")) generateDownloads();
      if (event.target.closest("[data-generate-prompt]")) renderPrompt();
      if (event.target.closest("#copyPromptButton")) {
        const prompt = document.getElementById("promptOutput").value;
        if (!navigator.clipboard?.writeText) {
          document.getElementById("promptOutput").select();
          showToast("Tu navegador no habilitó el portapapeles. Selecciona el texto y cópialo manualmente.", "error");
        } else {
          navigator.clipboard.writeText(prompt).then(() => showToast("Prompt copiado al portapapeles."))
            .catch(() => {
              document.getElementById("promptOutput").select();
              showToast("Selecciona el texto y cópialo manualmente.", "error");
            });
        }
      }
      if (event.target.closest("#importButton")) document.getElementById("jsonFile").click();
    });

    const dropZone = document.getElementById("dropZone");
    for (const name of ["dragenter", "dragover"]) dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.add("drag-over"); });
    for (const name of ["dragleave", "drop"]) dropZone.addEventListener(name, (event) => { event.preventDefault(); dropZone.classList.remove("drag-over"); });
    dropZone.addEventListener("drop", (event) => loadJsonFile(event.dataTransfer.files[0]));
  }

  function updateScheduleSummary() {
    const count = activeDailySessions().length;
    const message = count ? `${count} sesión${count === 1 ? "" : "es"} generada${count === 1 ? "" : "s"} en el rango seleccionado.` : "Elige un rango y al menos un día para generar sesiones.";
    document.getElementById("scheduleSummary").textContent = message;
  }

  function initialize() {
    try {
      teacherContext = readTeacherContext();
    } catch (error) {
      showToast(`No se pudieron leer los datos vinculados del docente: ${error.message}`, "error");
      teacherContext = { userId: "", nombre: "", titulo: "", materias: [], materiasRestringidas: false };
    }
    initializeSelects();
    if (!Array.isArray(window.PLANEADOR_PDA)) {
      showToast("No se pudo cargar pda-data.js; verifica que todos los archivos de WEBVERSION estén publicados juntos.", "error");
    }
    try {
      userId = getInitialUserId();
      updateUrlUser(userId);
    } catch (error) {
      userId = `user_${Date.now()}`;
      showToast(error.message, "error");
    }
    state = defaultData();
    document.getElementById("userId").value = userId;
    try {
      document.getElementById("autosaveToggle").checked = localStorage.getItem("planeador-autosave") !== "false";
    } catch (error) {
      showToast(`No se pudo leer la preferencia de autoguardado: ${error.message}`, "error");
    }
    bindEvents();
    restoreCurrentUser();
    updateScheduleSummary();
  }

  document.addEventListener("DOMContentLoaded", initialize);
})();
