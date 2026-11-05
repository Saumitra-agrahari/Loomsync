import { authenticate, apiError, apiSuccess } from "@/lib/api/response";
import { store } from "@/lib/db/store";

export async function DELETE(req: Request, { params }: { params: { id: string; linkId: string } }) {
  const authResult = authenticate(req, ["merchandiser"]);
  if ("response" in authResult) return authResult.response;

  const { linkId } = params;
  const revoked = store.revokeBuyerLink(linkId);
  if (!revoked) {
    return apiError("NOT_FOUND", "Buyer link not found", 404);
  }

  store.logAudit(authResult.auth.user.id, "revoke_buyer_link", "buyer_links", linkId);

  return apiSuccess({ success: true });
}
