const baseUrl = process.env.DOTNET_API_URL ?? 'http://localhost:5000';

export async function getApiHealth() {
  const response = await fetch(`${baseUrl}/`);
  return response.json();
}
