const BASE_URL = import.meta.env.VITE_API_URL;

export async function testLogin(  email: string = '',
  password: string): Promise<void> {
  const url = `${BASE_URL}/v1/auth/login`;

  // console.log(`[testConnection] Peticionando: POST ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email:  email,
      password: password,
    }),
  });

  const raw = await response.text();

  console.log(`[testConnection] Status: ${response.status}`);
  console.log(`[testConnection] Respuesta raw:`, raw);

  if (!response.ok) {
    console.error(`[testConnection] Error ${response.status}:`, raw);
    return;
  }

  try {
    const json = JSON.parse(raw);
    console.log(`[testConnection] JSON parseado:`, json);
  } catch {
    console.warn(`[testConnection] La respuesta no es JSON válido`);
  }
}
