export function publicTherapist(therapist) {
  if (!therapist) return null;
  return {
    id: therapist._id,
    _id: therapist._id,
    name: therapist.name,
    gender: therapist.gender,
    profileImage: therapist.profileImage || therapist.image || '',
    coverImage: therapist.coverImage || therapist.profileImage || therapist.image || '',
    bio: therapist.bio || '',
    experience: therapist.experience ?? 3,
    specialization: therapist.specialization || therapist.skills?.[0] || '',
    skills: therapist.skills || [],
    rating: therapist.rating ?? 4.8,
    isActive: therapist.isActive,
    offersHomeService: therapist.offersHomeService,
    availability: {
      workingDays: therapist.workingDays || [],
      shiftStart: therapist.shiftStart || '09:00',
      shiftEnd: therapist.shiftEnd || '20:00',
    },
    services: therapist.services || [],
  };
}

export function publicService(service) {
  if (!service) return null;
  return {
    id: service._id,
    _id: service._id,
    title: service.title,
    slug: service.slug,
    category: service.category,
    description: service.description,
    durationMinutes: service.durationMinutes,
    spaPrice: service.spaPrice,
    homePrice: service.homePrice,
    image: service.image || '',
    homeServiceAvailable: service.homeServiceAvailable !== false,
    isActive: service.isActive,
  };
}


export function publicExtraService(extraService) {
  if (!extraService) return null;
  return {
    id: extraService._id,
    _id: extraService._id,
    name: extraService.name,
    description: extraService.description || '',
    price: Number(extraService.price || 0),
    image: extraService.image || '',
    isActive: extraService.isActive !== false,
    createdAt: extraService.createdAt,
    updatedAt: extraService.updatedAt,
  };
}
const paymentStatusMap = { pending: 'PENDING', paid: 'PAID', failed: 'FAILED', refunded: 'REFUNDED', partially_refunded: 'PARTIAL', cancelled: 'CANCELLED' };

export function publicBooking(booking) {
  if (!booking) return null;
  const item = booking.toObject ? booking.toObject() : booking;
  const legacyStatus = String(item.paymentStatus || 'PENDING');
  const normalizedStatus = paymentStatusMap[legacyStatus] || legacyStatus.toUpperCase();
  const totalAmount = Number(item.totalAmount ?? item.price ?? 0);
  const paidAmount = item.paidAmount != null ? Number(item.paidAmount) : (normalizedStatus === 'PAID' ? totalAmount : 0);
  const remainingAmount = item.remainingAmount != null ? Number(item.remainingAmount) : Math.max(0, totalAmount - paidAmount);
  return {
    _id: item._id,
    service: publicService(item.service),
    therapist: publicTherapist(item.therapist),
    therapistGender: item.therapistGender,
    bookingType: item.bookingType,
    date: item.date,
    time: item.time,
    durationMinutes: item.durationMinutes,
    spaAddress: item.spaAddress,
    homeAddress: item.homeAddress,
    customerName: item.customerName,
    customerEmail: item.customerEmail,
    customerPhone: item.customerPhone,
    notes: item.notes,
    extraServices: (item.extraServices || []).map((extra) => ({ serviceId: extra.serviceId, name: extra.name, price: Number(extra.price || 0) })),
    subtotal: Number(item.subtotal ?? item.price ?? 0),
    discountAmount: Number(item.discountAmount ?? 0),
    discountPercentage: Number(item.discountPercentage ?? 0),
    totalAmount,
    price: totalAmount,
    paidAmount,
    remainingAmount,
    initialPaymentAmount: Number(item.initialPaymentAmount ?? Math.max(0, totalAmount - remainingAmount)),
    bookingAmount: Number(item.bookingAmount ?? 0),
    paymentType: item.paymentType || 'FULL',
    paymentStatus: normalizedStatus,
    bookingStatus: item.bookingStatus,
    cancellation: item.cancellation,
    razorpayOrderId: item.razorpayOrderId || undefined,
    razorpayPaymentId: item.razorpayPaymentId || undefined,
    rescheduleHistory: item.rescheduleHistory || [],
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
