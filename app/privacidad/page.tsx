import Link from "next/link";

export const metadata = { title: "Privacidad · Fit" };

export default function Privacidad() {
  return (
    <main className="prose">
      <p><Link href="/" className="muted">← Volver</Link></p>
      <h1>Privacidad</h1>
      <p>Fit es una herramienta privada para familia y amigos. Esto es lo que guarda y dónde:</p>
      <h2>Qué datos se guardan</h2>
      <ul>
        <li>Tu cuenta: correo y, si entras con Google, tu nombre y foto. Los gestiona Clerk.</li>
        <li>Tus datos: sexo, año de nacimiento, altura, peso, objetivo, lo que comes, tus pasos y tus entrenos. Se guardan en una base de datos Postgres de Neon.</li>
        <li>Si vinculas Hevy o Strava, se guarda cifrada la clave o el acceso que te dan, y se importan tus entrenos (tipo, duración, distancia, calorías).</li>
        <li>Los códigos de barras se consultan a Open Food Facts sin enviar ningún dato tuyo. La web se sirve desde Vercel.</li>
      </ul>
      <h2>Quién puede verlos</h2>
      <p>Sólo tú. No se venden ni se comparten datos, y no hay publicidad ni analítica de terceros.</p>
      <h2>Cómo borrarlos</h2>
      <p>En Ajustes → Eliminar cuenta se borra todo de forma definitiva, incluidos los accesos a Hevy y Strava.</p>
    </main>
  );
}
