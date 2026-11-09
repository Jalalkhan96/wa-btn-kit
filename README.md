<div align="center">

# 🔘 wa-btn-kit

**10 types of WhatsApp buttons for Baileys bots — one tiny, zero-dependency package.**

[![npm version](https://img.shields.io/npm/v/wa-btn-kit.svg)](https://www.npmjs.com/package/wa-btn-kit)
[![license](https://img.shields.io/npm/l/wa-btn-kit.svg)](./LICENSE)

Made by **[TEAM ABIX](https://github.com/Jalalkhan96)**

</div>

---

## 📥 Install

```bash
npm install wa-btn-kit
```

Works with `@whiskeysockets/baileys` v6/v7 (listed as an *optional* peer — the
button factories themselves need nothing at all).

## 🚀 Quick start

```javascript
const B = require('wa-btn-kit');

await B.sendButtons(sock, jid, {
  title: 'PP Bot',
  body: 'Choose an option:',
  footer: 'tap a button',
  buttons: [
    B.quickReply('📥 Download', 'dl'),
    B.quickReply('ℹ️ Info', 'info'),
    B.urlBtn('🌐 Website', 'https://example.com'),
  ],
});

// read the tap in messages.upsert:
const tap = B.getButtonTap(m);   // 'dl' | 'info' | null
```

## 🔟 The 10 button types

| # | Factory | Type | What it does |
|---|---------|------|--------------|
| 1 | `quickReply(text, id)` | `quick_reply` | Tap sends `id` back to your bot |
| 2 | `urlBtn(text, url)` | `cta_url` | Opens a link |
| 3 | `callBtn(text, phone)` | `cta_call` | Dials a number |
| 4 | `copyBtn(text, code)` | `cta_copy` | Copies a code/link to clipboard |
| 5 | `listBtn(title, sections)` | `single_select` | Full-screen list picker (sections + rows) |
| 6 | `flowBtn(text, {id, token})` | `flow` | Opens a WhatsApp Flow (forms, booking, checkout) |
| 7 | `remindBtn(text, id)` | `cta_remind` | Reminder opt-in button |
| 8 | `locationBtn(text?)` | `send_location` | Asks the user to share their location |
| 9 | `addressBtn(text?)` | `address_message` | Opens the address form |
| 10 | `offerBtn(text, code)` | `limited_time_offer` | Limited-time offer with copyable code |

```javascript
// List picker — best for long menus (quick replies cap at 3)
B.listBtn('Main Menu', [
  { title: 'Bot', rows: [
    { title: 'Group Menu', description: 'group commands', id: '-groupmenu' },
    { title: 'AI Menu', description: 'ai commands', id: '-aimenu' },
  ]},
]);

// Flow (booking / order form)
B.flowBtn('Book appointment', { id: '1234567890', token: 'FLOW_TOKEN' });
```

## 🛟 Fallbacks built in

Not every WhatsApp client renders native-flow buttons. Ship all three layers:

```javascript
const payload = { body: 'Pick one', buttons: [B.quickReply('A', 'a')] };
await B.sendButtons(sock, jid, payload);                    // rich buttons
await sock.sendMessage(jid, B.legacyButtons({               // older clients
  text: 'Pick one', buttons: [{ id: 'a', text: 'A' }],
}));
await sock.sendMessage(jid, { text: B.textFallback(payload) }); // plain text
```

## 📖 API

- `buildButtonsMessage(opts)` → `{ message, additionalNodes }` for `sock.relayMessage`
- `sendButtons(sock, jid, opts)` → builds + relays in one call
- `getButtonTap(m)` → tapped id from native-flow, list, legacy or template replies (or `null`)
- `bizNode()` → the `biz` additionalNode WhatsApp requires for rendering
- `TYPES` → the 10 native-flow type names

**Limits enforced for you:** more than 3 quick-reply buttons throws with
guidance to use `listBtn` instead — because WhatsApp silently drops the rest.

## License

MIT © TEAM ABIX
