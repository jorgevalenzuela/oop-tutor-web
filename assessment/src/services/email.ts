import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function sendMagicCode(email: string, code: string): Promise<void> {
  const transport = createTransport();
  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your OOP Tutor sign-in code',
    text: `Your verification code is: ${code}\n\nThis code expires in 10 minutes.`,
    html: `
      <p>Your OOP Tutor verification code is:</p>
      <h2 style="letter-spacing: 4px;">${code}</h2>
      <p>This code expires in <strong>10 minutes</strong>.</p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  });
}
