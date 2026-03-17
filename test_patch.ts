
async function test() {
  const res = await fetch('http://localhost:3000/api/agreements/test-123', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ updatedViaPatch: true })
  });
  console.log('Status:', res.status);
  const json = await res.json();
  console.log('Response:', json);
}
test();
