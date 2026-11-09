export interface WaButton { name: string; buttonParamsJson: string }
export interface ListRow { header?: string; title: string; description?: string; id: string }
export interface ListSection { title: string; highlight_label?: string; rows: ListRow[] }
export interface ButtonsOptions {
  title?: string; body?: string; footer?: string;
  buttons: WaButton[]; image?: unknown;
}

export function bizNode(): object;
export function quickReply(display_text: string, id: string): WaButton;
export function urlBtn(display_text: string, url: string): WaButton;
export function callBtn(display_text: string, phone_number: string): WaButton;
export function copyBtn(display_text: string, copy_code: string): WaButton;
export function listBtn(title: string, sections: ListSection[]): WaButton;
export function flowBtn(display_text: string, flow: { id: string; token?: string; name?: string; action?: string; screen?: string; payload?: object }): WaButton;
export function remindBtn(display_text: string, id: string): WaButton;
export function locationBtn(display_text?: string): WaButton;
export function addressBtn(display_text?: string): WaButton;
export function offerBtn(display_text: string, code: string): WaButton;
export function buildButtonsMessage(opts: ButtonsOptions): { message: object; additionalNodes: object[] };
export function sendButtons(sock: any, jid: string, opts: ButtonsOptions): Promise<any>;
export function legacyButtons(opts: { text?: string; footer?: string; buttons: { id?: string; text?: string }[] }): object;
export function textFallback(opts: { body?: string; buttons: WaButton[] }): string;
export function getButtonTap(m: any): string | null;
export const TYPES: string[];
