# Solicitud de Soporte - Problema de Envío de Emails

**Fecha:** 4 de febrero de 2026
**Cuenta afectada:** abogados@camaraygamero.org
**Dominio:** camaraygamero.org

---

## Resumen del Problema

Los emails enviados desde la cuenta `abogados@camaraygamero.org` **no llegan a los destinatarios**. El sistema indica que el envío es exitoso, pero los emails nunca se reciben (ni en bandeja de entrada ni en spam).

---

## Para IONOS

### Descripción del Problema

1. Tenemos una cuenta de correo en IONOS: `abogados@camaraygamero.org`

2. Al enviar emails (tanto desde webmail como vía SMTP), el sistema muestra "enviado correctamente"

3. **Los emails NO aparecen en la carpeta "Enviados" del webmail de IONOS**

4. Los destinatarios nunca reciben los emails

5. La cuenta estuvo activa hasta 2021 y no ha enviado emails desde entonces

### Pruebas Realizadas

| Prueba | Resultado |
|--------|-----------|
| Conexión SMTP a smtp.ionos.es:587 | ✅ Exitosa |
| Autenticación SMTP | ✅ Exitosa |
| Respuesta del servidor | ✅ "250 Requested mail action okay, completed" |
| Email en carpeta Enviados | ❌ NO aparece |
| Email recibido por destinatario | ❌ NO llega |
| Envío manual desde webmail IONOS | ❌ Tampoco funciona |

### Configuración SMTP Utilizada

```
Servidor: smtp.ionos.es
Puerto: 587
Seguridad: STARTTLS
Usuario: abogados@camaraygamero.org
Contraseña: [configurada correctamente]
Dirección "From": abogados@camaraygamero.org
```

### Preguntas para IONOS

1. ¿La cuenta `abogados@camaraygamero.org` tiene restricciones de envío?

2. ¿La cuenta requiere alguna verificación o reactivación después de estar inactiva desde 2021?

3. ¿Hay algún límite de envío o bloqueo en la cuenta?

4. ¿Pueden verificar en sus logs si los emails están siendo rechazados internamente?

5. ¿Qué pasos necesitamos seguir para reactivar el envío de emails?

### Información Adicional

- El registro SPF del dominio ya incluye IONOS: `v=spf1 include:_spf.basenet.nl include:_spf.perfora.net -all`
- Los emails entrantes funcionan correctamente (gestionados por basenet.nl)
- Solo el envío saliente está fallando

---

## Para Basenet

### Contexto

El dominio `camaraygamero.org` tiene la siguiente configuración:

- **Emails entrantes (MX):** Gestionados por basenet.nl ✅ (funcionando)
- **Emails salientes (SMTP):** Intentamos usar IONOS, pero no funciona

### Preguntas para Basenet

1. ¿Basenet ofrece servicio SMTP para envío de emails?

2. Si es así, ¿cuáles serían los datos de configuración?
   - Servidor SMTP
   - Puerto
   - Tipo de seguridad (STARTTLS/SSL)
   - Credenciales a usar

3. ¿Sería posible configurar el envío de emails a través de basenet en lugar de IONOS?

### Uso Previsto

Necesitamos enviar emails automáticos desde una aplicación de gestión jurídica:
- **Volumen estimado:** 10-50 emails por día
- **Tipo de emails:** Facturas (minutas) y documentos legales en PDF
- **Destinatarios principales:** facturacionsiniestros@arag.es (aseguradora)

---

## Información Técnica de Referencia

### Registros DNS Actuales

```
SPF (TXT):  v=spf1 include:_spf.basenet.nl include:_spf.perfora.net -all
MX:         mx1.basenet.nl (prioridad 10)
            mx1basenet.nl (prioridad 10)
```

### Datos de Contacto para Seguimiento

[Añadir datos de contacto de Sonia/la persona responsable]

---

## Solución Deseada

Necesitamos poder enviar emails desde `abogados@camaraygamero.org` de forma fiable, ya sea:

1. **Opción A:** Reactivar/desbloquear el envío en IONOS
2. **Opción B:** Configurar el envío a través de basenet.nl
3. **Opción C:** Otra solución que nos recomienden

---

*Documento preparado el 4 de febrero de 2026*
