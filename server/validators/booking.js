export function assertBookingInput(body) {
  const required = ['serviceId', 'bookingType', 'date', 'time', 'customerName', 'customerEmail', 'customerPhone'];
  for (const key of required) if (!body[key]) { const error = new Error(`${key} is required.`); error.status = 400; throw error; }
  if (!['spa', 'home'].includes(body.bookingType)) { const error = new Error('Invalid booking type.'); error.status = 400; throw error; }
  if (!['FULL', 'BOOKING'].includes(String(body.paymentType || '').toUpperCase())) { const error = new Error('Choose a valid payment option.'); error.status = 400; throw error; }
}
