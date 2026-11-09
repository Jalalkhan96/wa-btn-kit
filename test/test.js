'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const B = require('../index');

const params = b => JSON.parse(b.buttonParamsJson);

test('10 button types exist with correct native-flow names', () => {
  assert.strictEqual(B.TYPES.length, 10);
  assert.strictEqual(B.quickReply('A', 'a').name, 'quick_reply');
  assert.strictEqual(B.urlBtn('A', 'https://x.dev').name, 'cta_url');
  assert.strictEqual(B.callBtn('A', '+92123').name, 'cta_call');
  assert.strictEqual(B.copyBtn('A', 'CODE').name, 'cta_copy');
  assert.strictEqual(B.listBtn('Pick', [{ title: 'S', rows: [{ title: 'R', id: 'r1' }] }]).name, 'single_select');
  assert.strictEqual(B.flowBtn('Open', { id: '123' }).name, 'flow');
  assert.strictEqual(B.remindBtn('Remind', 'r').name, 'cta_remind');
  assert.strictEqual(B.locationBtn().name, 'send_location');
  assert.strictEqual(B.addressBtn().name, 'address_message');
  assert.strictEqual(B.offerBtn('Sale', 'SALE50').name, 'limited_time_offer');
});

test('button params carry the right fields', () => {
  assert.deepStrictEqual(params(B.quickReply('Yes', 'yes_id')), { display_text: 'Yes', id: 'yes_id' });
  assert.strictEqual(params(B.urlBtn('Open', 'https://x.dev')).url, 'https://x.dev');
  assert.strictEqual(params(B.callBtn('Call', '+923001234567')).id, '+923001234567');
  assert.strictEqual(params(B.copyBtn('Copy', 'ABC')).copy_code, 'ABC');
  const lp = params(B.listBtn('Menu', [{ title: 'Main', rows: [{ title: 'One', description: 'd', id: 'one' }] }]));
  assert.strictEqual(lp.sections[0].rows[0].id, 'one');
  const fp = params(B.flowBtn('Book', { id: '99', token: 'tok' }));
  assert.strictEqual(fp.id, '99');
  assert.strictEqual(fp.flow_token, 'tok');
});

test('factories reject missing required values', () => {
  assert.throws(() => B.quickReply('', 'x'), /required/);
  assert.throws(() => B.urlBtn('A', ''), /required/);
  assert.throws(() => B.listBtn('T', []), /non-empty/);
  assert.throws(() => B.listBtn('T', [{ title: 'S', rows: [{ title: 'R' }] }]), /row id/);
});

test('buildButtonsMessage wraps buttons with biz node', () => {
  const { message, additionalNodes } = B.buildButtonsMessage({
    title: 'T', body: 'Pick one', footer: 'F',
    buttons: [B.quickReply('A', 'a'), B.quickReply('B', 'b')],
  });
  const im = message.interactiveMessage;
  assert.strictEqual(im.body.text, 'Pick one');
  assert.strictEqual(im.nativeFlowMessage.buttons.length, 2);
  assert.strictEqual(additionalNodes[0].tag, 'biz');
});

test('more than 3 quick replies is rejected with guidance', () => {
  assert.throws(() => B.buildButtonsMessage({
    buttons: [1, 2, 3, 4].map(i => B.quickReply('B' + i, 'b' + i)),
  }), /at most 3/);
});

test('sendButtons relays through a fake sock', async () => {
  let sent = null;
  const sock = { relayMessage: async (jid, msg, opts) => { sent = { jid, msg, opts }; return { ok: true }; } };
  await B.sendButtons(sock, '123@s.whatsapp.net', { body: 'Hi', buttons: [B.quickReply('OK', 'ok')] });
  assert.strictEqual(sent.jid, '123@s.whatsapp.net');
  assert.ok(sent.msg.interactiveMessage);
  assert.strictEqual(sent.opts.additionalNodes[0].tag, 'biz');
});

test('getButtonTap reads native-flow, list, legacy and template taps', () => {
  const nf = { message: { interactiveResponseMessage: { nativeFlowResponseMessage: { paramsJson: JSON.stringify({ id: 'yes_id' }) } } } };
  assert.strictEqual(B.getButtonTap(nf), 'yes_id');
  const list = { message: { listResponseMessage: { singleSelectReply: { selectedRowId: 'row_9' } } } };
  assert.strictEqual(B.getButtonTap(list), 'row_9');
  const legacy = { message: { buttonsResponseMessage: { selectedButtonId: 'old_1' } } };
  assert.strictEqual(B.getButtonTap(legacy), 'old_1');
  assert.strictEqual(B.getButtonTap({ message: { conversation: 'hi' } }), null);
  assert.strictEqual(B.getButtonTap(null), null);
});

test('legacyButtons + textFallback degrade gracefully', () => {
  const legacy = B.legacyButtons({ text: 'Pick', buttons: [{ id: 'a', text: 'Alpha' }] });
  assert.strictEqual(legacy.buttons[0].buttonId, 'a');
  const text = B.textFallback({ body: 'Pick one', buttons: [B.quickReply('Alpha', 'a'), B.quickReply('Beta', 'b')] });
  assert.match(text, /Pick one/);
  assert.match(text, /1\. Alpha/);
  assert.match(text, /2\. Beta/);
});
