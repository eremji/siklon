// Types de la partie de web-push 4 dont Siklon se sert (le paquet n'en fournit pas, et
// @types/web-push décrit la version 3). Source : node_modules/web-push/src/web-push-lib.js.
declare module "web-push" {
  export interface ClesVapidWebPush {
    subject: string;
    publicKey: string;
    privateKey: string;
  }

  export interface DetailsRequete {
    method: "POST";
    endpoint: string;
    headers: Record<string, string | number>;
    body: Buffer | null;
  }

  export function generateRequestDetails(
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    payload: string,
    options: {
      vapidDetails: ClesVapidWebPush;
      TTL?: number;
      urgency?: "very-low" | "low" | "normal" | "high";
      topic?: string;
    },
  ): DetailsRequete;

  export function generateVAPIDKeys(): { publicKey: string; privateKey: string };
}
