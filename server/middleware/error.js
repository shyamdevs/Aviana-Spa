export function notFound(req, res) {
  res.status(404).json({ success: false, message: 'The requested resource was not found.' });
}

export function errorHandler(error, req, res, next) {
  console.error(error);
  if (res.headersSent) return next(error);
  if (error?.code === 11000) return res.status(409).json({ success: false, message: 'A record with these details already exists.' });
  if (error?.name === 'ValidationError') return res.status(400).json({ success: false, message: 'Some submitted values are invalid.' });
  if (error?.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid identifier.' });
  if (error?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, message: 'Image must be 5MB or smaller.' });
  if (error?.message?.includes('File type not allowed')) return res.status(400).json({ success: false, message: 'Only JPG, PNG, WEBP or AVIF images are allowed.' });
  const status = Number(error?.status || 500);
  const message = status >= 500 && process.env.NODE_ENV === 'production' ? 'Something went wrong on the server.' : (error.message || 'Internal server error.');
  return res.status(status).json({ success: false, message });
}
