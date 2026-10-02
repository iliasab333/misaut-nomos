# 07 — Capa nativa: app Capacitor iOS/Android

Fase de lectura (2026-10-01). Nada se ha modificado, sincronizado ni desplegado.

Fuentes leídas:
- khdemlidaba: estado commiteado `794e657` de `/Users/bigseo/khdemlidaba` (`capacitor.config.ts`, `codemagic.yaml`, `ios/`, `android/`, `src/lib/native.js`, `src/lib/nativeBoot.js`, `src/components/Native*.jsx`, `src/components/PushOptIn.jsx`, `src/lib/theme.js`, `scripts/verify-ios-entitlements.mjs`, `scripts/check-version-sync.mjs`, `scripts/check-native-back.mjs`, `supabase/functions/push-apns/index.ts`, `supabase/migrations/20260923120000_push_apns_trigger.sql`, `public/.well-known/*`, `ios/README.md`, `android/README.md`, `docs/appstore/*`, `docs/playstore/*`, `.github/workflows/quality.yml`) y el proyecto Supabase `eiacoozyubxkbjwhgkml` (solo `select`: `device_tokens`, RPC, trigger, políticas, `internal_config` por nombre de clave, lista de edge functions).
- misautonomos: `/Users/bigseo/Desktop/misaut-nomos` (`capacitor.config.ts`, `codemagic.yaml`, `ios/`, `android/`, `src/lib/native/index.js`, `src/lib/native/auth.js`, `src/lib/deepLinkAuth.ts`, `src/main.jsx`, `src/services/onesignalService.js`, `src/config/onesignal.js`, `src/components/notifications/NotificationPermissionBanner.jsx`, `index.html`, `public/.well-known/*`, `scripts/gen-app-assets.mjs`, nombres de clave de `.env.local`) y el proyecto Supabase `dquxsethatxtptfviiwd` (solo `select`, más el código DESPLEGADO de `send-push` y `notify-new-ticket`, que no está en el repo).
- Máquina local: `xcode-select`, `xcrun simctl`, `java`, `pod`, `security find-identity`, SDK Android, modelo de Mac.

Leyenda: **K** = khdemlidaba (modelo), **M** = misautonomos (destino).

---

## 0. Resumen en cifras

| Qué | khdemlidaba (K) | misautonomos (M) |
|---|---|---|
| Capacitor instalado | 8.5.0 (core/cli/ios/android) | 8.4.0 |
| Paquetes de plugin nativo en `package.json` | **13** | **12** (11 en común con K) |
| Plugins que faltan en M | — | `@capacitor/keyboard`, `@capgo/capacitor-social-login` |
| Plugins que sobran en M | — | `@capacitor/geolocation` (0 llamadores fuera de `src/lib/native/index.js`) |
| Plugins que el proyecto **Android** de M tiene sincronizados | 13 (`capacitor.settings.gradle`) | **4** (`app`, `preferences`, `splash-screen`, `status-bar`) — última `cap sync android` el 15/06 |
| `appId` de `capacitor.config.ts` | `ma.khdemlidaba.app` (mismo en iOS y Android) | iOS `com.base690076ad86e673c796768de5.app` / **Android `es.misautonomos.app`** (distintos) |
| Team ID Apple | `76RVH7PMJG` (en `codemagic.yaml`, AASA, `push-apns`) | **desconocido** (AASA lleva `REPLACE_TEAM_ID`, `pbxproj` sin `DEVELOPMENT_TEAM`) |
| ID de app en App Store Connect | `6800660020` (`src/lib/appStore.js`) | `6759524805` (`codemagic.yaml`) |
| Versión declarada (pkg / pbxproj / gradle) | 1.4.0 / 1.4 ×2 / 1.4.0 — alineadas | **0.0.0 / 1.0.0 ×2 / 1.0** — `check-version-sync.mjs` fallaría hoy |
| `CURRENT_PROJECT_VERSION` iOS / `versionCode` Android | 5 / 10500 + contador Codemagic | 2 / 1 fijo |
| Ficheros Swift | 2 (`AppDelegate.swift` con 2 relés APNs, `SceneDelegate.swift` con `KhBridgeViewController`) | 1 (`AppDelegate.swift` plantilla Capacitor, sin relés) |
| `InfoPlist.strings` localizados | 6 (fr, ar, en, es, de, nl) | 0 |
| Claves de permiso en `Info.plist` | 3 (cámara, fotos, añadir fotos) | 4 (las 3 + `NSLocationWhenInUseUsageDescription`) |
| Entitlements | 3 (`applesignin`, `aps-environment=production`, `associated-domains` ×2) | 2 (`applesignin`, `associated-domains` ×2) — **sin push** |
| Permisos en `AndroidManifest.xml` | 5 + 3 `<queries>` + 2 paquetes WhatsApp + intent-filter App Links (12 `pathPrefix` + 1 `path`) | **1** (`INTERNET`), sin `<queries>`, sin App Links |
| `codemagic.yaml` | 645 líneas, 2 workflows (iOS TestFlight 14 pasos, Android AAB 7 pasos), 5 guards | 108 líneas, 3 workflows (APK debug, AAB, iOS), 0 guards, clave de certificado regenerada en cada build |
| Capa JS nativa | 2.380 líneas en 9 ficheros contados (`native.js` 809, `nativeBoot.js` 295, `NativeShell.jsx` 378, `NativeTabBar.jsx` 309, `NativeAuthCompleteGate.jsx` 206, `NativeAppHeader.jsx` 179, `NativeLangList.jsx` 81, `NativeWelcomeGate.jsx` 62, `NativeLangGate.jsx` 61) + 5 páginas `Native*` + `PushOptIn.jsx`; 15 ficheros importan plugins | 530 líneas en 3 ficheros (`native/index.js` 246, `native/auth.js` 120, `deepLinkAuth.ts` 164); sin shell, sin tab bar, sin gestión del botón atrás, sin overlay offline |
| Líneas de `src/index.css` que mencionan `capacitor-native` | 106 | 0 |
| Push | APNs directo: `device_tokens` (1 fila), RPC `register_device_token`/`unregister_device_token`, trigger `trg_notifications_push` → edge `push-apns` (v2, 23/09/2026) | OneSignal **web** (SDK en `index.html`) + token APNs guardado en `sessionStorage` y nunca enviado; en la base, cadena Expo (`push_tokens.expo_push_token`, 0 filas) → edge `send-push` (muerta) |
| Identidades `auth.identities` | apple 245, email 883, google 702 | **apple 0**, email 18, google 17 |
| Ocurrencias del naranja `#E8590C` en ficheros trackeados (sin `dist/`, `docs/`, `scripts/`, `client-sites/`, `public/site`) | **37 ficheros** (+ 2 en RGB decimal: `SceneDelegate.swift`, `LaunchScreen.storyboard`) | — |
| Ocurrencias de `ma.khdemlidaba.app` | 16 ficheros | — |
| Commits que tocan `ios/`, `android/`, `codemagic.yaml`, `capacitor.config.ts` | 66 (último 23/09/2026) | 5 (último 12/07/2026; Android una sola vez, 15/06) |

---

## 1. Lo que hay hoy, fichero a fichero

### 1.1 `capacitor.config.ts`

| Clave | K (`/Users/bigseo/khdemlidaba/capacitor.config.ts`) | M (`/Users/bigseo/Desktop/misaut-nomos/capacitor.config.ts`) |
|---|---|---|
| `appId` | `ma.khdemlidaba.app` | `com.base690076ad86e673c796768de5.app` |
| `appName` | `KhdemliDaba` | `MisAutónomos` |
| `backgroundColor` | `#E8590C` | `#00255C` |
| `ios.contentInset` | `'never'` (edge-to-edge; todo el CSS nativo de K depende de `env(safe-area-inset-*)`) | `'always'` |
| `ios.scrollEnabled` / `limitsNavigationsToAppBoundDomains` / `allowsBackForwardNavigationGestures` | `true` / `false` / `false` (gesto atrás desactivado a propósito, lo gestiona `useTabSwipe`) | ausentes |
| `ios.backgroundColor` | `#E8590C` | ausente |
| `plugins.SplashScreen` | `launchShowDuration 3000`, **`launchAutoHide: false`** (lo oculta `bootNative` tras 2 `requestAnimationFrame`), `backgroundColor #E8590C`, `showSpinner false`, `androidScaleType CENTER_CROP`, `splashFullScreen`, `splashImmersive` | `launchShowDuration 1200`, `backgroundColor #00255C`, `showSpinner false` |
| `plugins.PushNotifications.presentationOptions` | `['badge','sound','alert']` | ausente |

### 1.2 iOS

| Fichero | K | M |
|---|---|---|
| `ios/App/App/Info.plist` | `CFBundleDevelopmentRegion fr`; `CFBundleLocalizations` 6 idiomas; `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`; `LSApplicationQueriesSchemes` tel/whatsapp/mailto/sms; `CFBundleURLTypes` = scheme inverso del Google iOS Client ID (`com.googleusercontent.apps.331709303550-…`); `UIApplicationSceneManifest` → `SceneDelegate`; `UIRequiredDeviceCapabilities arm64`; solo retrato en iPhone; `ITSAppUsesNonExemptEncryption false` | `CFBundleDevelopmentRegion en`; sin `CFBundleLocalizations`; 4 descripciones de uso (incluida localización); `LSApplicationQueriesSchemes` whatsapp/tel/mailto (sin `sms`); `CFBundleURLTypes` = scheme propio `com.base690076ad86e673c796768de5.app` (vuelta del OAuth); sin escena; `UIRequiredDeviceCapabilities armv7` (obsoleto); retrato + 2 apaisados; `ITSAppUsesNonExemptEncryption false` |
| `ios/App/App/App.entitlements` | `com.apple.developer.applesignin`, `aps-environment = production`, `applinks:khdemlidaba.ma`, `webcredentials:khdemlidaba.ma` | `com.apple.developer.applesignin`, `applinks:misautonomos.es`, `applinks:www.misautonomos.es` — **sin `aps-environment`** |
| `ios/App/App/AppDelegate.swift` | 2 relés `didRegisterForRemoteNotificationsWithDeviceToken` / `didFailToRegister…` → `NotificationCenter` (`.capacitorDidRegisterForRemoteNotifications`); configuración de escena | plantilla Capacitor: `ApplicationDelegateProxy` para `open url` y `continue userActivity`; **sin relés** (el mismo fallo que K sufrió el 23/09: iOS entrega el token y nadie lo escucha) |
| `ios/App/App/SceneDelegate.swift` | `KhBridgeViewController: CAPBridgeViewController` pinta `view`, `webView`, `scrollView` y `underPageBackgroundColor` en `UIColor(232,89,12)`; `SceneDelegateProxy` para URL y `userActivity` | no existe |
| `ios/App/App/PrivacyInfo.xcprivacy` | tracking `false`; 1 API (`UserDefaults` CA92.1); 7 tipos de datos (Name, Email, Phone, Photos, OtherUserContent, UserID, ProductInteraction) | tracking `false`; 4 API (UserDefaults, FileTimestamp, SystemBootTime, DiskSpace); 6 tipos (Email, Name, Phone, Photos, CoarseLocation, UserID) |
| `ios/App/App/Base.lproj/LaunchScreen.storyboard` | fondo sRGB (0.9098, 0.3490, 0.0471) = `#E8590C`, `useSafeAreas="NO"` (cubre barra de estado y zona home) | fondo `systemBackgroundColor` = **blanco** → flash blanco antes del splash |
| `ios/App/App/*.lproj/InfoPlist.strings` | 6 ficheros (fr, ar, en, es, de, nl), 4 claves cada uno | ninguno |
| `ios/App/App.xcodeproj/project.pbxproj` | `MARKETING_VERSION 1.4`, `CURRENT_PROJECT_VERSION 5`, `TARGETED_DEVICE_FAMILY "1"` (solo iPhone), `IPHONEOS_DEPLOYMENT_TARGET 15.0`, `CODE_SIGN_STYLE Automatic`, sin `DEVELOPMENT_TEAM` (lo escribe `xcode-project use-profiles` en Codemagic) | `MARKETING_VERSION 1.0.0`, `CURRENT_PROJECT_VERSION 2`, `TARGETED_DEVICE_FAMILY "1,2"` (**iPhone + iPad**), 15.0, Automatic, sin team |
| `ios/App/CapApp-SPM/Package.swift` | `capacitor-swift-pm` exact `8.5.0` + 13 paquetes | exact `8.4.0` + 12 paquetes (incluye `CapacitorGeolocation`) |
| Assets | `AppIcon-512@2x.png` + 6 PNG de splash (claro/oscuro ×3 escalas) = 7 PNG trackeados | 10 PNG (los mismos 7 + 3 `splash-2732x2732*.png` sobrantes) |
| `ios/.gitignore` | idéntico en los dos (ignora `App/App/public`, `capacitor.config.json`, `config.xml`) | idem |

### 1.3 Android

| Fichero | K | M |
|---|---|---|
| `android/app/build.gradle` | `applicationId`/`namespace` `ma.khdemlidaba.app`; `minSdk` y `targetSdk` desde `variables.gradle` (24 / 36); `versionCode` = 10500 o `-PversionCodeOverride`; `versionName "1.4.0"`; `signingConfigs.release` leído de `android/keystore.properties`; plugin `google-services` si existe `google-services.json` | `applicationId`/`namespace` `es.misautonomos.app`; `versionCode 1`; `versionName "1.0"`; **sin `signingConfigs`** (Codemagic inyecta `-Pandroid.injected.signing.*`); mismo bloque `google-services` |
| `android/variables.gradle`, `android/build.gradle`, `gradle.properties`, `gradle-wrapper.properties` | AGP 8.13.0, google-services 4.4.4, minSdk 24, compile/target 36 | idénticos (mismas versiones) |
| `android/app/src/main/AndroidManifest.xml` | permisos `INTERNET`, `CAMERA`, `POST_NOTIFICATIONS`, `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE` (`maxSdkVersion 32`); `<queries>` DIAL `tel`, VIEW `https`, SEND `text/plain`, paquetes `com.whatsapp` y `com.whatsapp.w4b`; intent-filter `autoVerify` sobre `https://khdemlidaba.ma` con 12 `pathPrefix` (`/professionnel/`, `/metier/`, `/ville/`, `/blog/`, `/avis/`, los 5 en `/ar/…`, `/demandes/`) + `path /auth/callback`; `FileProvider` | solo `INTERNET`; `FileProvider`; nada más |
| `android/app/src/main/java/<pkg>/MainActivity.java` | `ma/khdemlidaba/app/MainActivity.java`, `BridgeActivity` vacío | `es/misautonomos/app/MainActivity.java`, `BridgeActivity` vacío |
| `android/app/src/main/res/values/strings.xml` | `app_name`/`title_activity_main` KhdemliDaba, `package_name`/`custom_url_scheme` `ma.khdemlidaba.app` | MisAutónomos / `es.misautonomos.app` |
| `styles.xml`, `ic_launcher_background.xml` (#FFFFFF), `file_paths.xml`, `mipmap-anydpi-v26/*.xml` | iguales en los dos (generados por `@capacitor/assets`) | iguales; M arrastra además `drawable/ic_launcher_background.xml` y `drawable-v24/ic_launcher_foreground.xml` de la plantilla de Android Studio (no referenciados) |
| Imágenes | 50 PNG (24 `mipmap-*` + 26 `splash` claro/oscuro/retrato/apaisado) | 50 PNG, misma estructura |
| `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle`, `assets/capacitor.plugins.json` | 13 plugins, trackeados | **4 plugins**; `capacitor.plugins.json` y `assets/capacitor.config.json` ignorados por `android/.gitignore`; el `capacitor.config.json` generado todavía dice `appId es.misautonomos.app` |
| Firma | `android/keystore.properties.example`; `.jks` NO está en el disco (solo `android/keystore/keystore-password.txt`, sin trackear); el keystore vive en Codemagic como `khdemlidaba_upload` | `android/app/misautonomos.keystore` (2.772 bytes, 15/06, sin trackear, ignorado por `/.gitignore` línea 35); en Codemagic como base64 en el grupo `keystore_credentials` |
| `public/.well-known/assetlinks.json` | existe pero con `REPLACE_WITH_UPLOAD_KEYSTORE_SHA256` → los App Links de K **nunca se han verificado** | no existe |
| `google-services.json` (FCM) | ausente | ausente |

### 1.4 CI (`codemagic.yaml`)

K (645 líneas), workflow `ios-testflight`: `mac_mini_m2`, node 24, `xcode: latest`, integración `codemagic_asc_api_key`, grupos `khdemlidaba_vite` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_WEB_CLIENT_ID`) y `khdemlidaba_appstore` (`APP_STORE_APPLE_ID`, `APPLE_ID_EMAIL`, `IOS_DISTRIBUTION_PRIVATE_KEY`); 14 pasos: `npm ci` → verificación de las 3 VITE → `npm run build:only` → 5 guards (`verify-tracking`, `verify-ios-entitlements`, `check-hook-order`, `check-native-back`, `check-version-sync`) → grep del bundle buscando `eiacoozyubxkbjwhgkml` y `sb_publishable_` → `cap sync ios` + mismo grep en `ios/App/App/public/assets` → número de build = `max(App Store, TestFlight) + 1` con `app-store-connect get-latest-build-number` + `agvtool` (falla si `APP_STORE_APPLE_ID` falta o si Apple devuelve 0) → `keychain initialize` → registro del bundle id si no existe → clave privada de distribución persistida en `IOS_DISTRIBUTION_PRIVATE_KEY` → `fetch-signing-files` con purga automática de certificados en 409 (`scripts/asc-purge-distribution-certs.mjs`) → `use-profiles` → `xcodebuild archive` directo con `DEVELOPMENT_TEAM=76RVH7PMJG` **en duro** + `build-ipa`; publicación ASC `submit_to_testflight: false`, correo a `benchellal12@gmail.com`. Workflow `android-aab`: `linux_x2`, `android_signing: khdemlidaba_upload`, `cap sync android` + grep, `keystore.properties` escrito desde `CM_*`, `versionCode = 10500 + PROJECT_BUILD_NUMBER`, `bundleRelease`, comprobación de firma en `META-INF`.

M (108 líneas): `android` (APK debug, `mac_mini_m2`, node 22.14.0, JDK 21), `android-release` (AAB, keystore base64 → `-Pandroid.injected.signing.*`), `ios` (`BUNDLE_ID com.base690076ad86e673c796768de5.app`, `APP_STORE_APPLE_ID 6759524805`, `npm install`, `npm run build` completo con prerender, `cap sync ios`, `resolvePackageDependencies`, **`openssl genrsa` nuevo en cada build** → tope de 3 certificados de distribución de Apple, `fetch-signing-files --create`, `use-profiles`, `build-ipa`; sin número de build, sin grupo de variables VITE, sin guards). M no tiene `.github/`; K tiene `.github/workflows/quality.yml` que ejecuta los 5 guards en cada push.

### 1.5 Capa JS nativa

K (`src/lib/native.js`, 809 líneas): `isNative()` con modo preview `?native=1`; `PUSH_LIVE` = solo iOS; `tap()` háptico; `openExternalUrl()` (Browser para http/https, `App.openUrl` para `tel:`/`mailto:`/`sms:`/`whatsapp:`); `share()`; `pickPhoto()`/`pickPhotos()` (plugin Camera, base64 → `File`); `ensurePushRegistered()` (**escucha antes de `register()`**, RPC `register_device_token`, token guardado en Preferences `kh.push.token`), `refreshPushRegistration()`, `unregisterPush()`/`unregisterStoredPush()`; `getNetworkStatus()`; `favorites` sobre Preferences; `nativeSignInWithApple()` (`clientId: 'ma.khdemlidaba.app'`, `redirectURI: 'https://khdemlidaba.ma/auth/callback'`, nonce SHA-256 → `signInWithIdToken`); `nativeSignInWithGoogle()` (`@capgo/capacitor-social-login`, `webClientId` de `VITE_GOOGLE_WEB_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID` en duro, `forcePrompt: true`, nonce condicional); `nativeSignOutSocial()`; `authRedirectBase()` → `https://khdemlidaba.ma`.
`src/lib/nativeBoot.js` (295): clase `capacitor-native` en `<html>`, hidratación de cachés, StatusBar (`overlay`, `Style.Dark`, `setBackgroundColor('#E8590C')`), `Keyboard.setAccessoryBarVisible`, `SplashScreen.hide()` tras 2 RAF + `syncNativeStatusBar`, `App.appUrlOpen` (solo hosts que terminan en `khdemlidaba.ma`, quita el prefijo `/ar`), **un único** listener `backButton` (delegado en `NativeShell`, `minimizeApp` en raíz, nunca `exitApp`), `startAutoRefresh`/`stopAutoRefresh` de Supabase en `appStateChange`, `pushNotificationActionPerformed` → `data.url`.
Componentes: `NativeShell.jsx` (teclado con `--kb-height` y botón «Terminé», intercepción de enlaces externos e internos con `INTERNAL_HOSTS = khdemlidaba.ma / www / khdemlidaba.vercel.app`, overlay offline, cálculo del retorno `kh:back`), `NativeTabBar.jsx`, `NativeAppHeader.jsx`, `NativeAuthCompleteGate.jsx`, `NativeLangGate.jsx`, `NativeLangList.jsx`, `NativeWelcomeGate.jsx`, `PushOptIn.jsx` (`PushOptIn` + `PushSettingsRow`, bloqueo por usuario `kh.push.asked.v2.<uid>`); páginas `NativeAccount`, `NativeFamilies`, `NativeLangPicker`, `NativeRegisterWizard`, `NativeWelcome`. `src/main.jsx`: `installNativePreviewMocks()` + `bootNative()`. `src/lib/theme.js`: `THEME_COLOR = { light: '#FBF6EE', dark: '#15110D' }` sincronizado con la barra de estado. `src/lib/appVersion.js` lee `__APP_VERSION__` (definido en `vite.config.js` desde `package.json`).

M (`src/lib/native/index.js`, 246): `pickPhoto` (DataUrl, etiquetas en español), `getLocation` (Geolocation, **sin llamadores**), `shareUrl`, `haptic`/`hapticSuccess`, `setStatusBarStyle`/`Background`, `kv` sobre Preferences, `getNetworkStatus`/`onNetworkChange`, `initPushNotifications` (**`register()` antes de `addListener`** —el bug que K documenta— y el token acaba en `sessionStorage['apns_token']`, sin salir nunca del dispositivo). `src/lib/native/auth.js` (120): Google por `signInWithOAuth({skipBrowserRedirect})` + `Browser.open` + vuelta por scheme propio `com.base690076ad86e673c796768de5.app://login-callback`; Apple con `@capacitor-community/apple-sign-in` **sin nonce**, `clientId` = bundle id, `redirectURI` = scheme propio; `emailRedirectFor()` → scheme propio. `src/lib/deepLinkAuth.ts` (164): `App.getLaunchUrl` + `appUrlOpen` → `exchangeCodeForSession`/`setSession`; persistencia manual de la sesión en Preferences bajo `sb-misautonomos-auth-token` (duplica el storage de supabase-js). `src/main.jsx` líneas 63-93: `initDeepLinkAuth()`, `setStatusBarStyle('dark')`, `initPushNotifications` a los 800 ms. Llamadores reales: `ProfileOnboarding.jsx` (`kv`, `haptic`, `pickPhoto`), `Autonomo.jsx` (`shareUrl`, `haptic`), `Login.jsx` (`signInWithGoogle`, `signInWithApple`). No hay shell, tab bar, botón atrás, overlay offline, ocultación manual del splash ni CSS `capacitor-native`.

---

## 2. Identidad de misautonomos que se conserva (y lo que no está decidido)

| Elemento | Valor hoy | Qué pasa con el trasplante |
|---|---|---|
| Bundle ID iOS | `com.base690076ad86e673c796768de5.app` (App Store Connect `6759524805`) | **Se conserva**. Se escribe en `capacitor.config.ts`, `pbxproj` (ya está), `codemagic.yaml`, `native.js` (`clientId` de Apple), `push-apns` (`APNS_BUNDLE_ID`), AASA, `verify-ios-entitlements.mjs` no lo lee. |
| Package Android | `es.misautonomos.app` (`build.gradle`, `MainActivity.java`, `strings.xml`) — distinto del iOS | **DECIDIR**: K usa el mismo id en ambos. Mantener `es.misautonomos.app` es gratis (ni `cap sync` ni el código JS lo tocan); unificar al id Base44 obliga a mover `MainActivity.java` de carpeta y, si ya se subió un AAB a Play con `es.misautonomos.app`, lo deja huérfano. Recomendación: mantener los dos tal cual. |
| Team Apple | desconocido en el repo | **Preguntar**. K lo necesita en 3 sitios: `codemagic.yaml` (`DEVELOPMENT_TEAM=` en el paso de archivado), AASA (`<TEAM>.com.base690076ad86e673c796768de5.app`), secreto `APNS_TEAM_ID`. Si M está en la misma cuenta que K (`76RVH7PMJG`, ambos `codemagic.yaml` usan la misma integración `codemagic_asc_api_key`), la clave APNs `.p8` de K sirve también para M (una clave APNs vale para todas las apps del equipo). |
| Nombre | `MisAutónomos` | `capacitor.config.ts appName`, `Info.plist CFBundleDisplayName`, `strings.xml` (`app_name`, `title_activity_main`), los 6 `InfoPlist.strings` que hay que crear, `codemagic.yaml` (`register-bundle-id --name`), `push-apns` (`title` por defecto), `fire_push_apns` (`coalesce(new.title, 'KhdemliDaba')`). |
| Colores | azul `#00255C`, dorado `#F5C13D` | Sustituyen al naranja `#E8590C` en: `capacitor.config.ts` (3), `SceneDelegate.swift` (RGB 232/89/12 → 0/37/92 = 0.0/0.1451/0.3608), `LaunchScreen.storyboard` (RGB), `index.html` (`theme-color` + fondo `html/body`), `nativeBoot.js` (`StatusBar.setBackgroundColor`), `src/index.css` (2), `NativeLangGate.jsx` (1), `NativeLangPicker.jsx` (4), `NativeWelcome.jsx` (1), `android/app/src/main/assets/capacitor.config.json` (3, regenerado). `THEME_COLOR` de `theme.js` (`#FBF6EE` / `#15110D`) es el fondo beige/oscuro de K: lo decide la capa de diseño. |
| Iconos y splash | `assets/icon-only.png`, `icon-foreground.png`, `icon-background.png`, `splash.png`, `splash-dark.png` ya generados por `scripts/gen-app-assets.mjs` (navy + anillo dorado); `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`; 50 PNG Android | **Se conservan**. K no trae fuente de icono en el repo (`resources/` solo tiene `splash.png` y `splash-dark.png`). Hay que regenerar únicamente los 6 PNG de `Splash.imageset` y los 26 `splash*.png` de Android si el splash cambia; `npx capacitor-assets generate` lee `assets/` (M) o `resources/` (K): elegir una carpeta. |
| Dominio | `misautonomos.es` (+ `www`) | Sustituye a `khdemlidaba.ma` en `App.entitlements` (2), `AndroidManifest.xml` (3), `NativeShell.jsx` `INTERNAL_HOSTS` (2), `native.js` (4: `redirectURI`, `authRedirectBase` ×2, comentario), `nativeBoot.js` (2: filtro `appUrlOpen`, base de `internalPathFromUrl`), AASA. |

---

## 3. Qué cambiar para que la capa web de K corra en el shell de M

Orden propuesto: 3.1 → 3.6. Todo lo de 3.2/3.3 es «copiar el fichero de K y sustituir identidad», salvo donde se indica.

### 3.1 `package.json` y `capacitor.config.ts`
1. Subir `@capacitor/{core,cli,ios,android}` a 8.5.0 (K); añadir `@capacitor/keyboard ^8.0.5` y `@capgo/capacitor-social-login ^8.4.0`; quitar `@capacitor/geolocation`. Los otros 10 plugins ya están en M con la misma mayor.
2. `capacitor.config.ts` = el de K con `appId com.base690076ad86e673c796768de5.app`, `appName MisAutónomos`, los 3 `#E8590C` → `#00255C`. Conservar `contentInset: 'never'`, `launchAutoHide: false`, `allowsBackForwardNavigationGestures: false` y el bloque `PushNotifications`: la coquilla de K no funciona con `contentInset: 'always'` (las 10 líneas de `safe-area-inset` de `src/index.css` y los 106 `capacitor-native` esperan edge-to-edge).
3. `npx cap sync ios android` regenera `Package.swift` (exact 8.5.0 + 13 paquetes), `capacitor.settings.gradle`, `capacitor.build.gradle`, `capacitor.plugins.json`. En M el proyecto Android lleva 4 plugins desde el 15/06: tras el sync pasa a 13.
4. `vite.config.js` de K define `__APP_VERSION__` (M no); la versión de `package.json` deja de ser `0.0.0`.

### 3.2 iOS (`ios/App/App/`)
| Fichero | Acción |
|---|---|
| `Info.plist` | Tomar el de K. Cambiar: `CFBundleDevelopmentRegion` → `es`; `CFBundleDisplayName` → `MisAutónomos`; `CFBundleLocalizations` → `es, en, fr, de, nl, ar` (mismos 6, español primero); los 3 textos de permiso en español (los `InfoPlist.strings` mandan); `CFBundleURLTypes` → scheme inverso del **Google iOS Client ID de M** (no existe aún, ver §10). Quitar el scheme propio `com.base690076ad86e673c796768de5.app` de M (K no usa scheme propio: vuelve por Universal Links) y `NSLocationWhenInUseUsageDescription` (Apple 5.1.1 rechaza permisos declarados y no usados; K lo aprendió con la foto). Conservar `UIApplicationSceneManifest`, `arm64`, solo retrato, `ITSAppUsesNonExemptEncryption false`. |
| `App.entitlements` | Tomar el de K: añade `aps-environment = production`; `applinks:misautonomos.es` + `applinks:www.misautonomos.es` + `webcredentials:misautonomos.es`. |
| `AppDelegate.swift` | Tomar el de K (relés APNs + escena). Sin ellos `verify-ios-entitlements.mjs` rechaza la build en cuanto `aps-environment` exista. |
| `SceneDelegate.swift` | Tomar el de K; `khBrandOrange` → `UIColor(red: 0/255, green: 37/255, blue: 92/255, alpha: 1)`. El `pbxproj` de M no referencia `SceneDelegate.swift`: añadirlo al target (K lo tiene en `PBXBuildFile`/`PBXSourcesBuildPhase`, ids `9582B682…`/`9582B683…`). |
| `Base.lproj/LaunchScreen.storyboard` | Tomar el de K (`useSafeAreas="NO"`, color de fondo de marca) con el RGB navy. |
| `{es,en,fr,de,nl,ar}.lproj/InfoPlist.strings` | Crear 6 ficheros como los de K con `CFBundleDisplayName = "MisAutónomos"` y los 3 textos de permiso traducidos (los textos de K hablan de «realizaciones» de pros; los de M hablan de «trabajos» y «logo»). Añadir los 6 directorios al `pbxproj` (K los tiene como `PBXVariantGroup`). |
| `PrivacyInfo.xcprivacy` | Tomar el de K (7 tipos de datos, 1 API) y quitar `CoarseLocation` de M. Conservar la lista alineada con la etiqueta «App Privacy» de ASC y el formulario Data safety de Play. |
| `project.pbxproj` | Mantener el de M (bundle, `CURRENT_PROJECT_VERSION 2`) y aplicar: `MARKETING_VERSION` = la versión decidida (×2, Debug y Release); `TARGETED_DEVICE_FAMILY` «1» como K (**DECIDIR**: la coquilla de K es solo iPhone retrato; si la ficha de ASC ya declara iPad habrá que retirarlo); añadir `SceneDelegate.swift` y los 6 `.lproj`. |
| `Assets.xcassets` | Mantener `AppIcon`; regenerar `Splash.imageset` solo si cambia el splash; borrar los 3 `splash-2732x2732*.png` sueltos. |

### 3.3 Android (`android/`)
| Fichero | Acción |
|---|---|
| `app/build.gradle` | Tomar el de K: `applicationId`/`namespace` **`es.misautonomos.app`** (si se mantiene, §2), `versionName` = la versión decidida, `versionCodeBase` **mayor que cualquier `versionCode` ya subido a Play** (M tiene `1`; K usa 10500 + contador), `signingConfigs.release` desde `keystore.properties`. |
| `app/src/main/AndroidManifest.xml` | Tomar el de K: los 5 permisos, los `<queries>`, los 2 paquetes WhatsApp, y el intent-filter `autoVerify` con `android:host="misautonomos.es"` (y un segundo `<data android:host="www.misautonomos.es"/>`) y los `pathPrefix` de las **rutas españolas** que fije la capa de rutas (en K son `/professionnel/`, `/metier/`, `/ville/`, `/blog/`, `/avis/`, `/demandes/`, `/auth/callback` más los 5 `/ar/…`; M no tiene prefijo de idioma en la URL, así que sobran los `/ar/`). |
| `app/src/main/java/es/misautonomos/app/MainActivity.java` | Se queda (idéntico a K salvo el paquete). |
| `app/src/main/res/values/strings.xml` | Se queda (`MisAutónomos`, `es.misautonomos.app`). |
| `keystore.properties.example`, `android/.gitignore` | Tomar los de K adaptando ruta/alias; fusionar con la regla `android/app/*.keystore` del `.gitignore` raíz de M para que `misautonomos.keystore` siga sin trackearse. Mover el keystore a `android/keystore/` como K o apuntar `storeFile` a `app/misautonomos.keystore`. |
| `app/google-services.json` | Igual que K: ausente. Push Android = sin emisor FCM (ver §5). |
| `res/drawable/ic_launcher_background.xml`, `res/drawable-v24/ic_launcher_foreground.xml` | Borrar (plantilla de Android Studio, no referenciados por `mipmap-anydpi-v26`). |
| `android/README.md`, `ios/README.md` | Tomar los de K y sustituir identidad; son la guía del dueño para el portal de Apple, Firebase, keystore, fichas de tienda. |

### 3.4 Capa JS y CSS
Sustituir en bloque `src/lib/native/index.js`, `src/lib/native/auth.js`, `src/lib/deepLinkAuth.ts` por `src/lib/native.js`, `src/lib/nativeBoot.js`, `src/components/Native*.jsx`, `src/components/PushOptIn.jsx`, `src/components/OfflineOverlay.jsx`, `src/components/CallFeedback.jsx`, `src/lib/theme.js`, `src/lib/appVersion.js`, `src/lib/navSections.js`, `src/lib/langFlag.js`, `src/lib/welcomeFlag.js`, `src/lib/activeMode.js`, `src/lib/resultsCache.js`, las 5 páginas `Native*` y las reglas `capacitor-native` de `src/index.css` (la capa de UI decide cómo). Constantes de identidad que hay que cambiar dentro de la capa JS de K:

| Fichero:línea (K) | Constante | Valor en M |
|---|---|---|
| `src/lib/native.js:86` | `PUSH_LIVE` = solo iOS | igual (Android sin FCM) |
| `src/lib/native.js:498` | `GOOGLE_IOS_CLIENT_ID` | el iOS Client ID que se cree en Google Cloud para `com.base690076ad86e673c796768de5.app` |
| `src/lib/native.js:557-558` | `clientId: 'ma.khdemlidaba.app'`, `redirectURI: 'https://khdemlidaba.ma/auth/callback'` | `com.base690076ad86e673c796768de5.app`, `https://misautonomos.es/auth/callback` |
| `src/lib/native.js:853-854` | `authRedirectBase()` → `https://khdemlidaba.ma` | `https://misautonomos.es` |
| `src/lib/nativeBoot.js:132-134` | `StatusBar.setBackgroundColor('#E8590C')` | `#00255C` |
| `src/lib/nativeBoot.js:185` | `u.hostname.endsWith('khdemlidaba.ma')` | `misautonomos.es` |
| `src/lib/nativeBoot.js:290` | `new URL(target, 'https://khdemlidaba.ma')` | `https://misautonomos.es` |
| `src/lib/nativeBoot.js:55-70` | `internalPathFromUrl` quita el prefijo `/ar` y cambia el idioma | M no tiene prefijo de idioma en la URL: quitar o dejar inerte (`AR_PREFIX` viene de `src/i18n/index.js`) |
| `src/components/NativeShell.jsx:36` | `INTERNAL_HOSTS` | `misautonomos.es`, `www.misautonomos.es`, el host `*.vercel.app` del proyecto |
| `src/lib/appStore.js` | `APP_STORE_ID '6800660020'`, URL `apps.apple.com/ma/app/khdemlidaba/…` | `6759524805`, `apps.apple.com/es/app/misautonomos/id6759524805` (ruta del store a confirmar) |
| `src/components/NativeLangGate.jsx`, `NativeLangPicker.jsx` (4), `NativeWelcome.jsx` | `#E8590C` | `#00255C` / dorado según diseño |
| `index.html:6` y `:74` | `theme-color` y fondo `html/body` `#E8590C` | `#00255C` (M ya tiene `theme-color #00255C` en `index.html:107`) |

Lo que desaparece de M por construcción: `src/lib/native/`, `src/lib/deepLinkAuth.ts` (K no persiste la sesión a mano: supabase-js + `startAutoRefresh` en `appStateChange`), el scheme propio `com.base690076ad86e673c796768de5.app://…` (hay que quitarlo de la allow-list de redirecciones de Supabase y añadir `https://misautonomos.es/auth/callback`), y la pila OneSignal (§5).

### 3.5 Guards y scripts
Copiar `scripts/verify-ios-entitlements.mjs`, `check-version-sync.mjs`, `check-native-back.mjs`, `asc-purge-distribution-certs.mjs`, `appstore-screenshots.mjs`, `check-hook-order.mjs` (M ya tiene una copia), y las entradas de `package.json` (`build`, `check:native-back`, `check:version`, `screenshots:appstore`). Detalle en §6.

### 3.6 `codemagic.yaml`
Tomar el de K (645 líneas) y cambiar 11 cosas: nombres de grupo (`khdemlidaba_vite` → p. ej. `misautonomos_vite` con `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_WEB_CLIENT_ID`; `khdemlidaba_appstore` → `APP_STORE_APPLE_ID=6759524805`, `IOS_DISTRIBUTION_PRIVATE_KEY`), `BUNDLE_ID`, `register-bundle-id --name "MisAutónomos"`, `DEVELOPMENT_TEAM=` del paso de archivado, el grep del bundle (`eiacoozyubxkbjwhgkml` → `dquxsethatxtptfviiwd`; **`sb_publishable_` no vale**: la anon key de M es un JWT legado `eyJ…`, así que o se cambia el grep al prefijo `eyJ` o el dueño pasa el proyecto a una clave publishable), la guarda `LATEST -le 0` (K la endureció porque ya tiene builds; si `6759524805` no tiene ninguno habrá que relajarla una vez), `android_signing` (subir `misautonomos.keystore` a Codemagic → Code signing identities con un nombre, p. ej. `misautonomos_upload`, en lugar del base64 del grupo `keystore_credentials`), la base del `versionCode`, `node: 24` (M hoy 22.14.0; `engines` de K exige 24), el correo de notificación, y el `npm run build:only` (M hoy ejecuta `npm run build` con prerender dentro de la IPA, inútil en el bundle nativo). Añadir `.github/workflows/quality.yml` de K.

---

## 4. Plugins: qué exige cada uno en `Info.plist` / entitlements / `AndroidManifest.xml`

| Plugin | Estado | iOS (ficheros reales de K) | Android (`AndroidManifest.xml` de K) |
|---|---|---|---|
| `@capacitor/app` | común | `LSApplicationQueriesSchemes` (`tel`, `whatsapp`, `mailto`, `sms`) para `App.openUrl`/`canOpenURL`; `appUrlOpen` necesita `associated-domains` (K) o `CFBundleURLTypes`; `SceneDelegateProxy` en `SceneDelegate.swift` | `<queries>` DIAL `tel` + VIEW `https`; intent-filter App Links; `launchMode="singleTask"` |
| `@capacitor/browser` | común | nada | `<queries>` VIEW `https` (Chrome Custom Tabs) |
| `@capacitor/camera` | común | `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, **`NSPhotoLibraryAddUsageDescription`** (el plugin no arranca sin ella aunque solo se lea; comentario en `Info.plist:38-51` de K) | `CAMERA`, `READ_MEDIA_IMAGES`, `READ_EXTERNAL_STORAGE maxSdk 32`, `FileProvider` + `xml/file_paths.xml` |
| `@capacitor/haptics` | común | nada | nada |
| `@capacitor/keyboard` | **añadir** | nada en plist; `Keyboard.setAccessoryBarVisible` y `setResizeMode` desde `nativeBoot.js`/`NativeShell.jsx` | nada (`adjustResize` por defecto) |
| `@capacitor/network` | común | nada | nada (`INTERNET`) |
| `@capacitor/preferences` | común | `PrivacyInfo.xcprivacy` → `NSPrivacyAccessedAPICategoryUserDefaults` CA92.1 (los dos lo tienen) | nada |
| `@capacitor/push-notifications` | común, **inactivo en M** | `aps-environment` en entitlements; capability Push en el App ID; los 2 relés en `AppDelegate.swift`; `plugins.PushNotifications.presentationOptions` en `capacitor.config.ts` | `POST_NOTIFICATIONS`; `google-services.json` + plugin `com.google.gms.google-services` (condicional en `build.gradle`); sin Firebase, `register()` falla: por eso `PUSH_LIVE` solo iOS |
| `@capacitor/share` | común | nada | `<queries>` SEND `text/plain`; `FileProvider` si se comparten ficheros |
| `@capacitor/splash-screen` | común | `UILaunchStoryboardName LaunchScreen` + `Splash.imageset` | `androidx.core:core-splashscreen` (`build.gradle`), `AppTheme.NoActionBarLaunch` (`styles.xml`), `drawable*/splash.png` |
| `@capacitor/status-bar` | común | `UIViewControllerBasedStatusBarAppearance true` (los dos) | nada |
| `@capacitor-community/apple-sign-in` | común | `com.apple.developer.applesignin` (los dos) + capability en el App ID + proveedor Apple en Supabase | se compila (`capacitor.settings.gradle`) pero K no lo usa en Android |
| `@capgo/capacitor-social-login` | **añadir** | `CFBundleURLTypes` con el scheme inverso del iOS Client ID de Google; `SocialLogin.initialize({ google: { webClientId, iOSClientId, iOSServerClientId } })` en `native.js:516-524`; trae GoogleSignIn por SPM | nada en el manifest; `webClientId` en `initialize`; K no pasa `scopes` en Android a propósito (`native.js:716-720`) |
| `@capacitor/geolocation` | **quitar** | hoy exige `NSLocationWhenInUseUsageDescription` y el tipo `CoarseLocation` en `PrivacyInfo`; M nunca declaró `ACCESS_*_LOCATION` en Android | — |

---

## 5. Push: OneSignal (M) frente a APNs directo (K)

### 5.1 Lo que M tiene hoy (tres cadenas, ninguna completa)
1. **OneSignal web**: `index.html:76-103` carga `cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js` diferido con `appId e178adb2-38e8-4397-9239-833be611ed27`; `src/config/onesignal.js`, `src/services/onesignalService.js` (57 líneas: `login`, `addTags`, `requestPermission`, `isSubscribed`, `logout`), `src/components/notifications/NotificationPermissionBanner.jsx` (109), `src/Layout.jsx:28,279-290,322`, `public/OneSignalSDKWorker.js`, cabecera en `public/_headers`, claves `notifications.*` en `src/i18n/locales/{es,en}.json`. Es push de navegador: dentro del WKWebView de Capacitor no hay service worker de push ni permiso `Notification`, así que no hace nada en la app nativa. Los envíos se hacen a mano desde el panel de OneSignal (comentario en `src/config/onesignal.js:14-18`); no hay API REST ni backend.
2. **Token APNs nativo**: `initPushNotifications` lo guarda en `sessionStorage['apns_token']` y nadie lo lee ni lo sube. 0 % funcional.
3. **Base de datos**: tabla `push_tokens` (`expo_push_token`, 0 filas), columnas `users.push_token`/`push_enabled`/`push_last_activated` (0 rellenas), trigger `trg_notify_send_push` sobre `messages` → edge `send-push` (Expo Push API, filtra tokens que empiezan por `Expo`) → nunca envía. Herencia de Base44/Expo.

### 5.2 Lo que K tiene (y funciona desde el 23/09/2026)
App → `ensurePushRegistered()` → RPC `register_device_token(p_token, p_platform, p_device_model, p_app_version)` (SECURITY DEFINER, upsert por `(user_id, token)`) → tabla `public.device_tokens` → cualquier `insert` en `public.notifications` (6 funciones escriben: `admin_broadcast`, `admin_promo_update`, `apply_candidature`, `close_demande`, `create_demande`, `promo_mark_paid`) dispara `trg_notifications_push` → `fire_push_apns()` lee `internal_config.notify_admin_url` y `notify_admin_cron_key`, hace `net.http_post` a `…/functions/v1/push-apns` con `{title, body, url, tokens}` → `push-apns` firma un JWT ES256 con la clave `.p8` y llama a `api.push.apple.com/3/device/<token>` con `apns-topic = APNS_BUNDLE_ID`. En la app, `pushNotificationActionPerformed` navega a `data.url`. Estado real: `device_tokens` tiene **1 fila** (iOS, 23/09), `notifications` 585 filas.

### 5.3 Lo que hay que llevar a `dquxsethatxtptfviiwd`
Objetos de base (ninguno existe en M; **el DDL de `device_tokens` y de las dos RPC no está en las 100 migraciones de K** —solo los `revoke` en `20260821200000_p0_security_hardening.sql:298-299` y `tg_device_tokens_touch` en `20260826200000_p2_security_hardening.sql:116`—, así que hay que escribirlo desde la base viva de K; definición leída):
- `public.device_tokens (id bigint PK, user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, token text NOT NULL, platform text NOT NULL CHECK (platform IN ('ios','android','web')), device_model text, app_version text, created_at timestamptz NOT NULL, updated_at timestamptz NOT NULL, UNIQUE (user_id, token))`, índices `device_tokens_user_idx (user_id)` y `device_tokens_platform_idx (platform)`, RLS activo con `device_tokens_owner_all` (ALL, `user_id = auth.uid()`) y `device_tokens_admin_read` (SELECT, `is_admin()`), trigger `device_tokens_touch` → `tg_device_tokens_touch()`.
- `register_device_token(text,text,text,text)` y `unregister_device_token(text)` tal cual (K las tiene con `grant` a `authenticated` y `revoke` a `anon`).
- `fire_push_apns()` + `trg_notifications_push` (migración `20260923120000_push_apns_trigger.sql`, cambiar `'KhdemliDaba'`).
- La tabla `notifications` en la forma de K (`id, user_id, kind, title, body, url, read_at, created_at` con sus 4 políticas). La de M es la de Base44 (`id text, user_id text, type, title, message, description, link, is_read, metadata, priority, created_by_id, created_date, updated_date`) y tiene **1 fila**: la migración de datos es trivial. Capa de esquema.
- `internal_config` (no existe en M) con `notify_admin_url = https://dquxsethatxtptfviiwd.supabase.co/functions/v1/notify-admin` y `notify_admin_cron_key`; `is_admin()`. Capa de esquema/funciones (ver `02-funciones.md`).
- `pg_net` ya está en M (0.20.0; K 0.20.4).

Edge function `push-apns` desplegada con `verify_jwt = false` (en K no figura en `supabase/config.toml`; añadir `[functions.push-apns] verify_jwt = false` o desplegar con `--no-verify-jwt`). Secretos que necesita (nombres de `push-apns/index.ts:12-19`): `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID = com.base690076ad86e673c796768de5.app`, `APNS_KEY_P8` (contenido del `.p8` con las líneas BEGIN/END), opcional `APNS_HOST` (por defecto `api.push.apple.com`; para builds de desarrollo sería `api.sandbox.push.apple.com`), y `CRON_SECRET` compartido con `notify-admin` (el mismo valor que `internal_config.notify_admin_cron_key`). En K la clave es `7W6VNZ9C38` del equipo `76RVH7PMJG`: si M está en ese mismo equipo, se reutiliza; si no, el dueño crea una clave APNs en developer.apple.com → Keys (se descarga una sola vez).

Lado Apple: activar **Push Notifications** en el App ID `com.base690076ad86e673c796768de5.app` (y Sign In with Apple + Associated Domains si no lo están); Apple invalida los perfiles existentes y `fetch-signing-files` genera otro en el siguiente build (comentario en `App.entitlements:160-173` de K).

### 5.4 Qué hacer con OneSignal
Opción A (la de K): quitar los 8 ficheros/bloques de §5.1 y la app `e178adb2…` deja de recibir suscriptores web; K no tiene push web, solo iOS nativo. Opción B: conservar solo el bloque de `index.html` para la web. Ojo: K ejecuta `scripts/check-csp-inline.mjs` en `npm run build` y sirve una CSP desde `vercel.json`: el script inline de OneSignal y el host `cdn.onesignal.com` tendrían que entrar en esa política. **DECIDIR**; en ambos casos borrar `push_tokens`, las 3 columnas `users.push_*`, `notify_send_push`, `trg_notify_send_push` y la edge `send-push` (capa de esquema/funciones).

### 5.5 Android
Igual que K: sin `google-services.json`, sin FCM, `PUSH_LIVE` apagado en Android. Encenderlo exige un proyecto Firebase con el paquete `es.misautonomos.app`, el JSON en `android/app/`, y un emisor FCM que K tampoco tiene (`android/README.md §2` de K lo deja como pendiente).

---

## 6. `verify-ios-entitlements.mjs` y `check-version-sync.mjs`

### 6.1 `scripts/verify-ios-entitlements.mjs` (K, 75 líneas)
Comprueba: (1) que `ios/App/App/App.entitlements` existe y contiene `<key>com.apple.developer.applesignin</key>`; (2) si `package.json` declara `@capacitor/push-notifications` **y** el entitlements contiene `<key>aps-environment</key>`, que `ios/App/App/AppDelegate.swift` contiene `capacitorDidRegisterForRemoteNotifications` y `capacitorDidFailToRegisterForRemoteNotifications`. No comprueba el bundle id, el team, los dominios asociados ni la capability en el portal de Apple. Se ejecuta en `npm run build`, en los dos workflows de Codemagic y en `quality.yml`.
Simulado contra M hoy: **pasa** (tiene `applesignin`; no tiene `aps-environment`, así que salta la segunda parte). En cuanto se añada `aps-environment` sin cambiar `AppDelegate.swift`: **falla**. Adaptación: ninguna en el script (rutas idénticas). Extensión razonable: comprobar que `associated-domains` lleva `applinks:misautonomos.es` y que AASA no contiene `REPLACE_TEAM_ID`.

### 6.2 `scripts/check-version-sync.mjs` (K, 68 líneas)
Lee `package.json.version`, **todas** las `MARKETING_VERSION = x;` de `ios/App/App.xcodeproj/project.pbxproj` (una por configuración, 2) y `versionName "x"` de `android/app/build.gradle`; normaliza a 3 números (`1.4` == `1.4.0`) y exige un único valor. No compara `CFBundleVersion` ni `versionCode` (los pone la CI).
Simulado contra M hoy: `{ pkg: '0.0.0', pbxproj: ['1.0.0','1.0.0'], gradle: '1.0' }` → **falla** (2 valores distintos). Adaptación: ninguna en el script; hay que decidir el número (§10) y escribirlo en los 3 sitios. Nota: `package.json` de M se llama `base44-app`; `appVersion.js` de K mostrará lo que diga `version`.

### 6.3 `scripts/check-native-back.mjs` (K, 59 líneas)
Recorre `path="…" element={<Comp` de `src/App.jsx` y exige `NativeAppHeader` en `src/pages/<Comp>.jsx` salvo 6 `ROOT_TABS` y 6 `OWN_CHROME`. Depende de los nombres de componente, no de las rutas: sobrevive al cambio de rutas a español siempre que la capa de rutas no renombre las páginas; si lo hace, actualizar los dos `Set`.

---

## 7. Lo que NO se puede verificar desde esta máquina

Máquina: MacBook Pro 13,3 (2016, Intel i7-6700HQ, 16 GB), macOS **12.7.6**. Es el último macOS que admite ese modelo; Xcode 14.3+ exige macOS 13 y Capacitor 8 exige Xcode 16. Conclusión: **en este Mac no se podrá compilar iOS ni abrir un simulador nunca**, con independencia de lo que se instale. `appstore-screenshots.mjs` de K ya lo dice en su cabecera («Xcode n'est pas installé sur cette machine»). Estado comprobado:

| Comprobación | Resultado |
|---|---|
| `xcode-select -p` | `/Library/Developer/CommandLineTools` (solo Command Line Tools) |
| `xcodebuild -version` | error: requiere Xcode |
| `xcrun simctl list devices booted` | error: `simctl` no existe → **ningún simulador disponible** |
| `/Applications/Xcode*`, `mdfind Xcode.app` | nada |
| `security find-identity -p codesigning -v` | **0 identidades** |
| Perfiles de aprovisionamiento (`~/Library/MobileDevice/Provisioning Profiles`, `~/Library/Developer/Xcode/UserData/Provisioning Profiles`) | ningún directorio |
| iPhone/iPad por USB (`system_profiler SPUSBDataType`) | ninguno |
| `java -version`, `keytool` | **sin JRE** (`keytool` falla) → no se puede calcular el SHA-256 del keystore ni firmar |
| `ANDROID_HOME`, `~/Library/Android/sdk`, `adb`, `gradle`, Android Studio | nada instalado |
| `pod --version` | 1.17.0 (irrelevante: los dos proyectos usan SPM) |
| `node` / `npm` | 24.14.1 / 11.11.0 (cumple `engines >=24 <25` de K) |

Por tanto no se puede verificar aquí: la firma iOS (certificado, perfil, team), la subida a TestFlight, la instalación en dispositivo, los permisos reales (cámara, fotos, notificaciones), los Universal Links/App Links, la recepción de un push, el login Apple/Google nativo, el AAB firmado, ni el aspecto del splash/icono en pantalla.

### Cómo lo prueba el dueño
iOS, único camino: Codemagic (como K). `Start new build` del workflow iOS → IPA a App Store Connect → TestFlight interno (sin review) → instalar en un iPhone físico. Lista mínima, adaptada de `ios/README.md §8` y `android/README.md §7` de K:
1. Arranque: splash navy sin flash blanco, barra de estado legible, sin bandas blancas arriba/abajo (`contentInset never` + `SceneDelegate`).
2. Login con email, con Google (debe salir el selector de cuenta cada vez) y con Apple (hoja nativa; si vuelve en < 500 ms con 1001 es que falta la capability en el App ID, `native.js:615-650`).
3. Crear/editar perfil con foto de cámara y de galería: los diálogos deben salir en el idioma del teléfono (`InfoPlist.strings`).
4. Botones Llamar / WhatsApp / correo abren la app del sistema (`LSApplicationQueriesSchemes`).
5. Compartir una ficha (hoja nativa).
6. Activar notificaciones desde el flujo de K → comprobar con un `select count(*) from device_tokens` que aparece la fila → insertar una fila en `notifications` para ese usuario → llega el push → al tocarlo abre `data.url`.
7. Universal Link: abrir `https://misautonomos.es/<ruta de ficha>` desde Notas o WhatsApp → se abre la app (requiere AASA con el Team ID real desplegado **antes** de instalar la build; iOS lo descarga al instalar).
8. Enlace mágico / recuperación de contraseña por correo → abre la app en `/auth/callback`.
9. Retorno: flecha ‹, gesto y (Android) botón físico hacen lo mismo; en raíz no cierra la app.
10. Modo avión → overlay offline → vuelve la red → desaparece.
11. Cerrar sesión → el token desaparece de `device_tokens`.
12. Borrar cuenta desde la app (`delete-account` existe en M, `verify_jwt true`).
Android: workflow `android` (APK debug) o `android-aab` de Codemagic; instalar el APK en un móvil (sideload) o el AAB en Play → prueba interna. Con JDK 21 (`brew install --cask temurin`) y las command-line tools del SDK 36, en este Mac sí cabe un `./gradlew assembleDebug` local; el emulador Intel es posible pero lento.

---

## 8. Simulador iOS

`xcrun simctl list devices booted` → `xcrun: error: unable to find utility "simctl"`. No hay Xcode ni runtimes; no es posible ninguna prueba básica en simulador en esta máquina (ver §7).

---

## 9. Riesgos, de mayor a menor

1. **Push iOS inoperante sin tocar 4 capas a la vez**: `aps-environment` + relés en `AppDelegate.swift` + capability Push en el App ID + tabla/RPC/trigger/edge/secretos en `dquxsethatxtptfviiwd`. Si falta cualquiera, la app promete notificaciones y no llegan (K perdió una build 1.4 por el relé). Mitiga: `verify-ios-entitlements.mjs` y una fila de prueba en `notifications` tras la primera build.
2. **Universal Links rotos de origen**: AASA de M lleva `REPLACE_TEAM_ID` y formato antiguo; K vuelve del OAuth de Apple y de los correos por `https://<dominio>/auth/callback`. Sin AASA correcto desplegado antes de instalar la build, los enlaces abren Safari y el login Apple/enlace mágico no vuelve a la app.
3. **Sign in with Apple en Supabase**: `auth.identities` de M tiene 0 Apple; nada indica que el proveedor esté configurado (client IDs `com.base690076ad86e673c796768de5.app` + Service ID, secreto JWT desde `.p8`). Apple rechaza una app con Google sin Apple (guideline 4.8).
4. **Google nativo**: K usa el SDK nativo (`@capgo/capacitor-social-login`) con un iOS Client ID y `VITE_GOOGLE_WEB_CLIENT_ID`; M no tiene ni el client ID iOS, ni la variable, ni el scheme inverso en `Info.plist`. Sin esto, `nativeSignInWithGoogle` lanza `google_config_missing`.
5. **Proyecto Android desincronizado**: 4 plugins frente a 13, `capacitor.config.json` generado con otro `appId`, 1 solo permiso, sin `<queries>` (los botones Llamar/WhatsApp devuelven `null` en Android 11+), sin App Links.
6. **Números de versión y de build**: `check-version-sync` falla hoy; `CURRENT_PROJECT_VERSION 2` fijo y `versionCode 1` fijo chocan con cualquier subida anterior; K deriva ambos en CI. Hay que fijar la primera versión y saber qué se subió ya a ASC (`6759524805`) y a Play.
7. **Certificados de distribución**: el `codemagic.yaml` de M genera una clave nueva en cada build; tras 3 builds Apple responde 409. K persiste la clave en `IOS_DISTRIBUTION_PRIVATE_KEY` y purga con `asc-purge-distribution-certs.mjs`.
8. **Guard del bundle en Codemagic**: K busca `sb_publishable_`; la anon key de M es un JWT `eyJ…` → el workflow de K falla en M tal cual.
9. **Keystore Android**: `misautonomos.keystore` existe solo en este disco (sin trackear) y en Codemagic (base64); sin Java no se puede comprobar ni extraer el SHA-256 para `assetlinks.json`. Perderlo sin Play App Signing deja la app huérfana (`android/README.md §3` de K).
10. **Permisos sobrantes**: `NSLocationWhenInUseUsageDescription` y `CoarseLocation` sin uso → motivo de rechazo 5.1.1; `TARGETED_DEVICE_FAMILY "1,2"` con una coquilla solo iPhone/retrato → capturas iPad obligatorias en ASC.
11. **Pérdida de push web**: quitar OneSignal borra los suscriptores web actuales (número desconocido, solo visible en el panel de OneSignal).
12. **Idioma por defecto**: `CFBundleDevelopmentRegion` y el primero de `CFBundleLocalizations` deben ser `es`; K pone `fr`.

---

## 10. Decisiones que solo el dueño puede tomar

1. ¿Team ID de Apple de misautonomos? ¿Es la misma cuenta que khdemlidaba (`76RVH7PMJG`)? Determina AASA, `codemagic.yaml` y si se reutiliza la clave APNs `7W6VNZ9C38`.
2. ¿Se mantiene el bundle iOS `com.base690076ad86e673c796768de5.app` (ya en ASC como `6759524805`) y el paquete Android `es.misautonomos.app`, distintos entre sí, o se unifican?
3. ¿Qué builds existen ya en App Store Connect (`6759524805`) y en Play Console para `es.misautonomos.app`? Fija `MARKETING_VERSION`/`versionName`/`package.json` (hoy 1.0.0 / 1.0 / 0.0.0) y la base del `versionCode`.
4. ¿Solo iPhone (como K, `TARGETED_DEVICE_FAMILY "1"`) o iPhone + iPad (como M hoy)?
5. ¿Eliminar OneSignal del todo o conservar el push web junto al APNs nativo (y entonces ajustar CSP y `check-csp-inline.mjs`)?
6. Crear en Google Cloud un OAuth Client ID de tipo iOS para el bundle de M y confirmar el Web Client ID que usa el proveedor Google de Supabase (`VITE_GOOGLE_WEB_CLIENT_ID`).
7. Configurar en Supabase (`dquxsethatxtptfviiwd`) el proveedor Apple (bundle + Service ID + clave `.p8` de Sign in with Apple) y la allow-list de redirecciones (`https://misautonomos.es/auth/callback`; retirar el scheme `com.base690076ad86e673c796768de5.app://`).
8. Clave APNs `.p8`: reutilizar la del equipo o crear una; y poner los 5 secretos de `push-apns` en `dquxsethatxtptfviiwd`.
9. Contraseña del keystore `android/app/misautonomos.keystore` y si Play App Signing está activado (para `assetlinks.json` y para la referencia `android_signing` en Codemagic).
10. ¿Dónde se compila iOS? Este Mac no puede: Codemagic (como K) u otro Mac con macOS 14.5+ y Xcode 16+.
11. ¿Se ponen al día las fichas de App Store / Play con la nueva app (capturas con `appstore-screenshots.mjs`, etiqueta de privacidad igual al `PrivacyInfo.xcprivacy`, URL de borrado de cuenta)?
