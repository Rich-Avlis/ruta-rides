# RUTA RIDES — APK de prueba

- **Archivo:** `RUTA-RIDES-debug.apk` (raíz del repo y `~/Downloads`)
- **Paquete:** `com.rutarides.test.debug`
- **Versión:** 0.1.0-debug
- **Firma:** debug (no apta para tienda)
- **Tamaño:** ~11 KB

El APK es un **lanzador**: muestra la URL del servidor, comprueba la conexión y
abre la app en el navegador del teléfono. No usa WebView integrado para evitar
pantallas negras y problemas de renderizado.

---

## 1. Requisitos

En la computadora:

```bash
cd backend && PORT=3101 node server.js
cd frontend && NEXT_PUBLIC_API_URL=http://localhost:3101 npm run dev
```

- Backend: puerto 3101.
- Frontend: puerto 3200.
- El teléfono necesita internet. El túnel público funciona fuera de la red local.
- Frontend público: `https://ruta-rides.vercel.app`.

---

## 2. Instalar

### Por cable

```bash
adb install -r RUTA-RIDES-debug.apk
```

### Sin cable

Copiar el APK al teléfono, permitir “instalar apps desconocidas” y abrirlo.

---

## 3. Configurar

1. Abre **RUTA RIDES**.
2. Toca **Cambiar servidor** y escribe:
   `https://ruta-rides.vercel.app`
3. Toca **Guardar**.
4. Toca **Abrir RUTA RIDES**. El APK prueba la conexión y luego abre Chrome/navegador.

En emulador:

```bash
adb reverse tcp:3200 tcp:3200
adb reverse tcp:3101 tcp:3101
```

Usa `http://localhost:3200` o el botón `10.0.2.2`.

---

## 4. GPS y HTTP

Chrome exige HTTPS para `navigator.geolocation`. Si abres la app por
`https://ruta-rides.vercel.app`, el GPS puede quedar bloqueado. La app tiene fallback:
fija el origen tocando el mapa.

Para GPS real en teléfono usa un túnel HTTPS (Cloudflare Tunnel, ngrok) o el
despliegue de producción con HTTPS.

---

## 5. Limitaciones

- No es una app nativa completa; es un lanzador de prueba.
- No funciona con los servidores apagados.
- No tiene offline ni push nativo.
- Para producción: APK/AAB firmado con Capacitor o TWA sobre HTTPS.

---

## 6. GitHub y despliegue

El repositorio local no tiene remoto ni credenciales de GitHub en esta máquina.
GitHub Pages no puede ejecutar Express, Socket.IO ni SQLite; el APK necesita un
backend persistente.

Opciones:

1. Dar una URL de repositorio y un token/CLI autenticado para subir el código.
2. Desplegar frontend en Vercel y backend en Railway/Render/Fly.io.
3. Mantener el túnel HTTPS temporal para pruebas.

## 7. Compilar

Requisitos: JDK 17, Gradle 8.7, Android SDK 34.

```bash
cd android-app
JAVA_HOME=/ruta/jdk17 ANDROID_HOME=$HOME/Library/Android/sdk \
  gradle assembleDebug
```
