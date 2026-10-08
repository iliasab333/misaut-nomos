# Cambios de seguridad aplicados a la base en producción

Lo que sigue se aplicó directamente sobre el proyecto `dquxsethatxtptfviiwd`
(migraciones con nombre, visibles en el panel). No son cambios del trasplante:
son agujeros que la web tiene **hoy** y que no conviene replicar.

## 2026-10-02 · Los documentos de identidad salían del bucket público

Quince ficheros —DNI por las dos caras y selfie de cinco personas— vivían en
`uploads`, que es público: cualquiera con la dirección los abría. Movidos a un
bucket privado `credentials` con tres reglas: cada persona escribe y lee sólo
su carpeta, y el administrador lee todo. Sin regla de lectura pública.

Migración: `credentials_bucket_policies`.

**Está funcionando**: el 8 de octubre el bucket privado tenía ya 23 ficheros,
o sea ocho documentos nuevos que han entrado por el camino correcto.

**Lo que sigue sin resolverse**: nadie los revisa. Las verificaciones siguen en
«pendiente» porque no existe la pantalla de revisión. La trae el trasplante.

## 2026-10-03 · Los formularios públicos no escribían, y el soporte se leía sin sesión

`tk_insert` exigía `auth.uid() is not null`, así que ningún visitante sin
cuenta podía abrir un ticket — ni desde `/contacto` ni desde `/ayuda`. Y
`ticket_messages`/`ticket_events` tenían `using (true)`: cualquiera con la
clave pública podía listar todo el historial de soporte.

Migraciones: `formulario_publico_escribe_y_soporte_deja_de_leerse`,
`visitante_puede_abrir_ticket_corregido`.

## 2026-10-08 · El bucket público aceptaba cualquier cosa

`uploads` no tenía ni límite de tamaño ni lista de tipos. Es **público**, así
que lo que entra se sirve desde misautonomos.es — y un HTML servido desde tu
propio dominio es una página de phishing con tu nombre en la barra de
direcciones.

Ahora: 10 MB y sólo imágenes y PDF. Comprobado que la restricción se aplica
**incluso con la clave de servicio** (`mime type text/html is not supported`,
`The object exceeded the maximum allowed size`), que es lo que importa, porque
la puerta abierta no es el navegador.

Migración: `uploads_con_limite_y_tipos`.

### La puerta que sigue abierta, y que no puedo cerrar yo

`rehostMedia` y `rehostUrls` siguen **desplegadas sin exigir sesión y con un
token fijo escrito en su propio código**. Se usaron una vez para traer las
imágenes desde Base44 y nadie las retiró. Quien conozca ese token escribe en
el bucket.

El límite de tamaño y la lista de tipos reducen lo que se puede meter por
ahí, pero la puerta sigue estando. **Hay que borrarlas desde el panel de
Supabase** (Edge Functions → eliminar); no se pueden borrar desde aquí. Con
ellas se pueden retirar las otras cuatro huérfanas, que no las llama nadie:
`createCheckoutSession`, `syncStripeSubscription`, `getStripeInvoices` y
`translate`.
