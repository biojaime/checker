// Configuración de Firebase para compatibilidad con carga local (sin servidor web)
const firebaseConfig = {
  apiKey: "AIzaSyBYidOhTA5oC2yZbPU9CYdgKR1a4wRO3oc",
  authDomain: "base-de-datos-7a0dc.firebaseapp.com",
  projectId: "base-de-datos-7a0dc",
  storageBucket: "base-de-datos-7a0dc.firebasestorage.app",
  messagingSenderId: "554717298873",
  appId: "1:554717298873:web:83b4624dced4cb257cdb68"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Hacer la base de datos disponible globalmente
window.db = db;
