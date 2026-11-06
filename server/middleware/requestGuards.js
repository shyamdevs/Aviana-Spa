/*
 * Small request guards for the customer-care endpoints.
 *
 * CSRF note: auth cookies are SameSite=Lax (or None only on request) and every
 * state-changing customer-care route requires a JSON body. A cross-site page cannot
 * send application/json without a CORS preflight, and app.js's CORS allow-list
 * rejects any request whose Origin header is not an approved frontend origin.
 */
export function requireJsonBody(req, res, next) {
  if (!req.is('application/json')) {
    return res.status(415).json({
      success: false,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Requests must be sent as JSON.',
    });
  }
  return next();
}

/** Responses here can contain private conversation data: never cache them. */
export function noStore(req, res, next) {
  res.set('Cache-Control', 'no-store');
  res.set('Vary', 'Cookie, Authorization');
  next();
}
