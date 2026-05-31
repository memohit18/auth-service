function page(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: system-ui, -apple-system, sans-serif;
      background: #0f172a;
      color: #e2e8f0;
    }
    .card {
      width: min(420px, calc(100% - 2rem));
      padding: 2rem;
      border-radius: 16px;
      background: #1e293b;
      text-align: center;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.35);
    }
    .icon {
      width: 56px;
      height: 56px;
      margin: 0 auto 1rem;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 1.75rem;
      font-weight: 700;
    }
    .success .icon { background: #14532d; color: #86efac; }
    .error .icon { background: #7f1d1d; color: #fca5a5; }
    h1 { margin: 0 0 0.75rem; font-size: 1.5rem; }
    p { margin: 0; line-height: 1.6; color: #cbd5e1; }
  </style>
</head>
<body>
  ${body}
</body>
</html>`;
}

export function verifyEmailSuccessPage() {
  return page(
    'Email verified',
    `<main class="card success">
      <div class="icon">✓</div>
      <h1>Email verified</h1>
      <p>Your email has been verified. You can close this page and sign in to your account.</p>
    </main>`,
  );
}

export function verifyEmailErrorPage(message: string) {
  return page(
    'Verification failed',
    `<main class="card error">
      <div class="icon">!</div>
      <h1>Verification failed</h1>
      <p>${message}</p>
    </main>`,
  );
}
