import assert from 'assert';
import { APP_NAME } from 'common/constants';
import { createTransport } from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import { ulid } from 'ulid';
import { SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER } from './serverEnvs';

const transport = createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: { user: SMTP_USER, pass: SMTP_PASS },
});

export const checkSmtpHealth = (): Promise<boolean> => transport.verify().then(() => true);

export const sendMail = async (
  options: { to: Mail.Address; subject: string } & ({ text: string } | { html: string }),
): Promise<void> => {
  await transport.sendMail({
    from: { name: APP_NAME, address: `no-reply@${SMTP_HOST}` },
    ...options,
  });
};

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest;

  test('sendMail', async () => {
    assert(process.env.INBUCKET_URL);

    const { InbucketAPIClient } = await import('inbucket-js-client');
    const inbucketClient = new InbucketAPIClient(process.env.INBUCKET_URL);
    const toAddress = `${ulid()}@example.com`;
    const text = 'aaa';

    await sendMail({ to: { name: 'hoge', address: toAddress }, subject: 'test', text });

    const inbox = await inbucketClient.mailbox(toAddress);
    const message = await inbucketClient.message(toAddress, inbox[0].id);
    await inbucketClient.deleteMessage(toAddress, inbox[0].id);

    expect(inbox.length === 1).toBeTruthy();
    expect(message.body.text).toBe(`${text}\n`);
  });
}
