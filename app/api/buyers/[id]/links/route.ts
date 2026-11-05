import crypto from "crypto";
import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import { store } from "@/lib/db/store";
import { hashToken } from "@/lib/auth/session";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const authResult = authenticate(req, ["merchandiser"]);
  if ("response" in authResult) return authResult.response;

  const buyerId = params.id;
  const buyer = store.getBuyerById(buyerId);
  if (!buyer) {
    return apiError("NOT_FOUND", "Buyer not found", 404);
  }

  // Generate 32-byte secure random token
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  // Default expiry: 90 days
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const link = store.createBuyerLink(buyer.id, tokenHash, expiresAt, authResult.auth.user.id);

  store.logAudit(authResult.auth.user.id, "create_buyer_link", "buyer_links", link.id, {
    buyerId: buyer.id,
    expiresAt,
  });

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const accessUrl = `${appUrl}/b?token=${rawToken}`;

  return apiSuccess(
    {
      link: {
        id: link.id,
        buyerId: link.buyerId,
        expiresAt: link.expiresAt,
        accessUrl,
        rawToken, // Only returned once!
      },
    },
    201
  );
}
