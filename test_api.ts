
async function test() {
  const res = await fetch('http://localhost:3000/api/agreements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'test-repro', data: 'some data' })
  });
  console.log('Status:', res.status);
  const json = await res.json();
  console.log('Response:', json);
}
test();
