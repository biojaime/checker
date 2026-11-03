# Planeador IMM · versión HTML estática

Esta carpeta contiene una versión web sin Streamlit ni servidor de aplicación. La página de entrada es `Planner.html` (no `index.html`). Puedes publicarla con la estructura original (`WEBVERSION/`, `assets/` y `vendor/`) o subir los archivos a la raíz de la rama de GitHub Pages. La página detecta el caso aplanado y busca imágenes y bibliotecas junto a `Planner.html`.

Abre `Planner.html` directamente o intégralo en tu sitio con un `iframe` que apunte a esa página. Para separar el espacio local de cada docente, agrega una clave en la URL, por ejemplo `Planner.html?user=docente-01`.

El botón **Planeador** del portal docente abre esta página con `user`, `nombre`, `titulo` y `materias` en la URL. En ese flujo, el nombre se toma del perfil y queda bloqueado; las materias se limitan a las asignadas al docente y este puede elegir su título. Si `materias` está presente pero no hay materias asignadas, el selector queda vacío. La clave `user` vincula la planeación al docente en el almacenamiento local de ese navegador; no crea una cuenta ni sincroniza los datos con Firebase.

## Funciones

- Captura de docente, curso, grado, grupos, modalidad bilingüe, materia y campo formativo.
- Asignación automática del campo formativo y validación del grado según la materia; SmartMind I, II y III quedan fuera de los campos formativos.
- Metodología, fechas, días de clase, ejes articuladores y materias vinculadas.
- Búsqueda y selección de los 573 PDAs oficiales del CSV original, además de PDAs personalizados.
- Editor de texto enriquecido para problemática, objetivos, perfiles, producto y secuencias.
- Secuencia ABPj o sesiones diarias creadas por rango de fechas y días seleccionados.
- Adjuntar, quitar y previsualizar rúbricas PNG/JPG.
- Autoguardado local por clave de sesión, importar y exportar JSON.
- El portal MaderoChecker incluye la configuración de tres momentos; asigna parciales a cada momento, calcula el promedio redondeado según un umbral de 0.5 o 0.6 y conserva las calificaciones reprobatorias por debajo de 6.
- Generar el prompt IA original, incluida la instrucción bilingüe.
- Descargas PDF y Word editables, con los logotipos institucionales incluidos.
- El PDF conserva el formato carta horizontal, márgenes de ½ pulgada y la marca de agua de página completa correspondiente al campo formativo, igual que la salida de Streamlit.

## Persistencia y publicación

El autoguardado usa IndexedDB en el navegador; los datos **no se envían a un servidor ni se sincronizan entre dispositivos**. El campo de sesión es una clave de separación local, no una cuenta ni un mecanismo de autenticación. Para mover una planeación, descarga el JSON y cárgalo en el otro navegador o dispositivo.

Los generadores PDF y Word están incluidos en `vendor/`; las exportaciones no dependen de fetch a CDN ni de imágenes remotas. `brand-assets.js` incorpora los logotipos como datos locales para evitar errores de canvas CORS cuando la página está embebida en otro sitio. Conserva los archivos de licencia del directorio `vendor/`.

Para usar IndexedDB y descargas con normalidad, publícala bajo HTTPS o ábrela desde un servidor local, no como archivo `file://`. El importador acepta JSON del planeador Streamlit. Las rutas de imágenes antiguas que solo existían en el servidor original se conservan como referencia, pero deben volver a adjuntarse; las imágenes subidas en esta versión viajan dentro del respaldo JSON.

Para publicar desde una rama llamada `WEBVERSION` cuyo contenido está en la raíz, configura **Settings → Pages → Deploy from a branch → WEBVERSION → /(root)**. La URL resultante termina en `/Planner.html`, no en `/WEBVERSION/Planner.html`; el botón del portal adapta el enlace para GitHub Pages. Conserva juntos `Planner.html`, `app.js`, `styles.css`, `pda-data.js`, `brand-assets.js`, `planner.ico`, los archivos de imagen, `docx.umd.js` y `html2pdf.bundle.min.js`. Si Pages aún responde 404, verifica la rama/carpeta fuente y espera a que termine el despliegue.
