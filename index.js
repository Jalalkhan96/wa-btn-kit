'use strict';
/**
 * wa-btn-kit — 10 types of WhatsApp buttons for Baileys bots.
 * Zero dependencies, CommonJS. Every factory returns a native-flow
 * button object; sendButtons() wraps them in an interactiveMessage
 * with the "biz" additionalNode WhatsApp needs in order to render.
 *
 * Button types:
 *  1 quickReply    2 urlBtn      3 callBtn     4 copyBtn
 *  5 listBtn       6 flowBtn     7 remindBtn   8 locationBtn
 *  9 addressBtn   10 offerBtn
 */

// ─── biz node (required for native-flow rendering) ───
function bizNode() {
  return {
    tag: 'biz',
    attrs: {},
    content: [
      {
        tag: 'interactive',
        attrs: { type: 'native_flow', v: '1' },
        content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
      },
    ],
  };
}

const btn = (name, params) => ({ name, buttonParamsJson: JSON.stringify(params) });
const need = (v, label) => {
  if (v === undefined || v === null || String(v).trim() === '') {
    throw new Error(`wa-btn-kit: ${label} is required`);
  }
  return v;
};

// ─── 1. Quick reply — tap sends `id` back to the bot ───
const quickReply = (display_text, id) =>
  btn('quick_reply', { display_text: need(display_text, 'display_text'), id: need(id, 'id') });

// ─── 2. URL button — opens a link ───
const urlBtn = (display_text, url) =>
  btn('cta_url', { display_text: need(display_text, 'display_text'), url: need(url, 'url'), merchant_url: url });

// ─── 3. Call button — dials a number ───
const callBtn = (display_text, phone_number) =>
  btn('cta_call', { display_text: need(display_text, 'display_text'), id: need(phone_number, 'phone_number') });

// ─── 4. Copy button — copies a code/link to clipboard ───
const copyBtn = (display_text, copy_code) =>
  btn('cta_copy', { display_text: need(display_text, 'display_text'), id: 'copy', copy_code: need(copy_code, 'copy_code') });

// ─── 5. List picker — single_select with sections + rows ───
// sections: [{ title, highlight_label?, rows: [{ header?, title, description, id }] }]
const listBtn = (title, sections) => {
  need(title, 'title');
  if (!Array.isArray(sections) || !sections.length) throw new Error('wa-btn-kit: sections must be a non-empty array');
  for (const s of sections) {
    if (!Array.isArray(s.rows) || !s.rows.length) throw new Error('wa-btn-kit: every section needs at least one row');
    for (const r of s.rows) need(r.id, 'row id');
  }
  return btn('single_select', { title, sections });
};

// ─── 6. Flow button — opens a WhatsApp Flow (forms, booking, checkout) ───
// flow: { id?, token?, name? } — token comes from your Flow setup.
const flowBtn = (display_text, flow = {}) =>
  btn('flow', {
    display_text: need(display_text, 'display_text'),
    id: need(flow.id, 'flow.id'),
    flow_token: flow.token || 'unused',
    flow_name: flow.name,
    flow_cta: display_text,
    flow_action: flow.action || 'navigate',
    flow_action_payload: flow.payload || { screen: flow.screen || 'FIRST_ENTRY_POINT' },
  });

// ─── 7. Reminder button — cta_remind ───
const remindBtn = (display_text, id) =>
  btn('cta_remind', { display_text: need(display_text, 'display_text'), id: need(id, 'id') });

// ─── 8. Location request button — asks the user to share location ───
const locationBtn = (display_text = 'Send location') =>
  btn('send_location', { display_text });

// ─── 9. Address button — opens the address form ───
const addressBtn = (display_text = 'Enter address') =>
  btn('address_message', { display_text });

// ─── 10. Limited-time offer button ───
const offerBtn = (display_text, code) =>
  btn('limited_time_offer', {
    display_text: need(display_text, 'display_text'),
    id: need(code, 'offer code'),
    copy_code: code,
  });

// ─── message builder ───
// opts: { title, body, footer, buttons, image?, video?, document? }
// Returns { message, additionalNodes } ready for sock.relayMessage.
function buildButtonsMessage(opts = {}) {
  const { title = '', body = '', footer = '', buttons = [] } = opts;
  if (!Array.isArray(buttons) || !buttons.length) {
    throw new Error('wa-btn-kit: at least one button is required');
  }
  const quick = buttons.filter(b => b.name === 'quick_reply').length;
  if (quick > 3) throw new Error(`wa-btn-kit: WhatsApp renders at most 3 quick-reply buttons (got ${quick}) — use listBtn for longer menus`);
  const interactiveMessage = {
    header: { title, hasMediaAttachment: false },
    body: { text: body },
    footer: { text: footer },
    nativeFlowMessage: { messageParamsJson: '{}', buttons },
  };
  if (opts.image) {
    interactiveMessage.header = { title, hasMediaAttachment: true, imageMessage: opts.image };
  }
  return { message: { interactiveMessage }, additionalNodes: [bizNode()] };
}

async function sendButtons(sock, jid, opts = {}) {
  if (!sock || typeof sock.relayMessage !== 'function') throw new Error('wa-btn-kit: sock.relayMessage is required');
  if (!jid) throw new Error('wa-btn-kit: jid is required');
  const { message, additionalNodes } = buildButtonsMessage(opts);
  return sock.relayMessage(jid, message, { additionalNodes });
}

// ─── legacy fallback: old-style buttonsMessage (renders on more clients) ───
function legacyButtons({ text = '', footer = '', buttons = [] } = {}) {
  return {
    text,
    footer,
    buttons: buttons.map((b, i) => ({
      buttonId: b.id || `btn_${i}`,
      buttonText: { displayText: b.text || b.display_text || `Option ${i + 1}` },
      type: 1,
    })),
    headerType: 1,
  };
}

// Plain-text fallback for clients that render no buttons at all.
function textFallback({ body = '', buttons = [] } = {}) {
  const lines = buttons.map((b, i) => {
    let label = '';
    try { label = JSON.parse(b.buttonParamsJson || '{}').display_text || ''; } catch { /* keep empty */ }
    return `${i + 1}. ${label}`.trim();
  }).filter(l => !l.endsWith('.'));
  return [body, ...lines].filter(Boolean).join('\n');
}

// ─── reading the tap ───
// Returns the tapped button's id (quick_reply / list row / cta), or null.
function getButtonTap(m) {
  const msg = m?.message || m;
  const r = msg?.interactiveResponseMessage?.nativeFlowResponseMessage;
  if (r?.paramsJson) {
    try {
      const p = JSON.parse(r.paramsJson);
      if (p.id) return p.id;
    } catch { /* fall through */ }
  }
  // list replies
  const list = msg?.listResponseMessage?.singleSelectReply?.selectedRowId;
  if (list) return list;
  // legacy button replies
  const legacy = msg?.buttonsResponseMessage?.selectedButtonId;
  if (legacy) return legacy;
  // template button replies
  const tpl = msg?.templateButtonReplyMessage?.selectedId;
  if (tpl) return tpl;
  return null;
}

module.exports = {
  bizNode,
  quickReply,
  urlBtn,
  callBtn,
  copyBtn,
  listBtn,
  flowBtn,
  remindBtn,
  locationBtn,
  addressBtn,
  offerBtn,
  buildButtonsMessage,
  sendButtons,
  legacyButtons,
  textFallback,
  getButtonTap,
  TYPES: ['quick_reply', 'cta_url', 'cta_call', 'cta_copy', 'single_select', 'flow', 'cta_remind', 'send_location', 'address_message', 'limited_time_offer'],
};
