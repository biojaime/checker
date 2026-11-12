let maderoInstallPrompt = null;

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  maderoInstallPrompt = event;
});

document.addEventListener("click", async event => {
  const button = event.target.closest("[data-pwa-install]");
  if (!button) return;
  if (maderoInstallPrompt) {
    maderoInstallPrompt.prompt();
    await maderoInstallPrompt.userChoice;
    maderoInstallPrompt = null;
    return;
  }
  const isAppleMobile = /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  window.alert(isAppleMobile
    ? "Para instalar MaderoChecker, pulsa Compartir y selecciona “Añadir a pantalla de inicio”."
    : "Si tu navegador ofrece la opción, abre su menú y selecciona “Instalar aplicación” o “Agregar a pantalla de inicio”.");
});

document.addEventListener("click", async event => {
  const button = event.target.closest("[data-notification-permission]");
  if (!button) return;
  if (!("Notification" in window)) {
    window.alert("Este navegador no admite notificaciones del sistema. Las solicitudes seguirán apareciendo dentro del portal.");
    return;
  }
  const permission = Notification.permission === "default"
    ? await Notification.requestPermission()
    : Notification.permission;
  if (permission === "granted") {
    button.dataset.notificationsEnabled = "true";
    button.setAttribute("aria-label", "Notificaciones activadas");
    const label = button.querySelector(".sidebar-utility-label");
    if (label) label.textContent = "Notificaciones activadas";
    else button.textContent = "✅ Notificaciones activadas";
  } else {
    window.alert("Las notificaciones están bloqueadas. Puedes habilitarlas desde los permisos del sitio en tu navegador.");
  }
});

window.showMaderoNotification = async (title, options = {}) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const notificationOptions = { icon: "./ICONO%20Madero.png", ...options };
  if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, notificationOptions);
  } else {
    new Notification(title, notificationOptions);
  }
};

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(error => {
      console.error("No se pudo registrar el service worker:", error);
    });
  });
}
