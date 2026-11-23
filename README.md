# Fit

Contador de calorías sin límites. Tu objetivo diario parte de tu gasto sedentario y sube con los pasos de Apple Salud y los entrenos (manuales, Hevy o Strava). Los alimentos se registran escaneando el código de barras (Open Food Facts).

Next.js 15 + Clerk (cuentas) + Neon Postgres, desplegado en Vercel. Misma estructura que `smarchan/cartera`.

## Cómo calcula el objetivo

```
objetivo = base + ajuste de objetivo + pasos + % de entrenos
```

- **Base**: metabolismo basal (Mifflin–St Jeor) × 1,2, o tu propia cifra de un día sedentario.
- **Pasos**: sólo los que pasan de 2.500 (ya incluidos en la base), a 0,00037 kcal por paso y kg. Los pasos de los entrenos de correr y caminar se descuentan para no contarlos dos veces.
- **Entrenos**: kcal netas (sin el gasto en reposo, que ya va en la base). Por MET según tipo e intensidad, por distancia en carrera y marcha (1 y 0,5 kcal/kg/km) o las del reloj si vienen de Strava. Sólo se suma el % que elijas (75 % por defecto).

Todo está en `lib/energy.ts`, con tests en `tests/`.

## Variables de entorno (Vercel)

| Variable | De dónde sale |
|---|---|
| `DATABASE_URL` | Integración Neon del Marketplace de Vercel (automática) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Integración Clerk del Marketplace (automática) |
| `APP_SECRET` | Cadena aleatoria larga. Cifra las claves de Hevy y Strava |
| `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` | strava.com/settings/api. *Authorization Callback Domain* = tu dominio de Vercel |

Las tablas se crean solas en la primera petición.

## Pasos de Apple Salud

Una web no puede leer Apple Salud. La app expone `POST /api/ingest/steps` con un token personal (Ajustes → Apple Salud) y un Atajo de iOS manda la suma de pasos del día:

- Buscar muestras de salud (Pasos, hoy) → Calcular estadísticas (Suma) → Obtener contenido de URL (POST, `Authorization: Bearer <token>`, JSON `{"steps": <suma>}`).
- Automatizaciones de tipo «Hora del día» con «Ejecutar inmediatamente».

## Desarrollo local

```bash
npm install
DEV_FAKE_AUTH=1 npm run dev   # sin Clerk ni Neon: usuario de prueba y Postgres en memoria (PGlite)
npm test
```

## Límites

- Strava: una app nueva sólo admite 1 atleta. Desde el panel de la API se puede subir a 10 sin revisión (requiere suscripción a Strava); más, pidiendo revisión.
- Hevy: la API requiere Hevy Pro. Hevy no da calorías: se estiman como gimnasio moderado sobre la duración de la sesión.
- La sincronización con Hevy y Strava se hace al abrir la app (como mucho cada 10 min) o con el botón de Ajustes.
