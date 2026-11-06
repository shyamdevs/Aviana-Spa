import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { env } from '../config/env.js';
import Service from '../models/Service.js';
import Therapist from '../models/Therapist.js';
import Setting from '../models/Setting.js';

const services = [
  ['Swedish Massage', 'swedish-massage', 'Massage Therapy', 'A flowing full-body massage focused on circulation, relaxation and quiet release.', 60, 1899, 2399, '/uploads/services-seed/swedish-massage.webp'],
  ['Deep Tissue Massage', 'deep-tissue-massage', 'Massage Therapy', 'Targeted pressure for persistent muscular tension, with a slower therapeutic rhythm.', 60, 2099, 2599, '/uploads/services-seed/deep-tissue.webp'],
  ['Aromatherapy Massage', 'aromatherapy-massage', 'Aromatherapy', 'A restorative massage paired with an essential-oil blend selected for your mood.', 60, 1999, 2499, '/uploads/services-seed/aromatherapy.webp'],
  ['Hot Stone Massage', 'hot-stone-massage', 'Heat & Stillness', 'Heated basalt stones soften tension while long, grounding strokes settle the body.', 75, 2399, 2899, '/uploads/services-seed/hot-stone.webp'],
  ['Couples Massage', 'couples-massage', 'Massage Therapy', 'A shared ritual for two, with synchronized treatments in a private setting.', 75, 3499, 3999, '/uploads/services-seed/couples.webp'],
  ['Sports Recovery Massage', 'sports-recovery-massage', 'Therapeutic', 'Recovery-focused bodywork for active clients and overworked muscles.', 60, 2299, 2799, '/uploads/services-seed/sports-recovery.webp'],
  ['Head & Shoulder Massage', 'head-shoulder-massage', 'Relaxation', 'A focused upper-body treatment to ease screen fatigue, neck tension and mental noise.', 45, 1499, 1999, '/uploads/services-seed/head-shoulder.webp'],
  ['Body Reset Ritual', 'body-reset-ritual', 'Wellness Rituals', 'A layered body ritual combining exfoliation, massage and botanical hydration.', 90, 2999, 3499, '/uploads/services-seed/body-reset.webp'],
];

const seedTherapists = [
  { name: 'Aanya Sharma', gender: 'female', profileImage: '/uploads/therapists-seed/aanya-sharma.webp', specialization: 'Swedish & restorative massage', experience: 5, rating: 4.9, bio: 'A gentle, detail-oriented therapist known for flowing Swedish work and calming restorative rituals.', skills: ['Swedish Massage', 'Aromatherapy'], services: ['swedish-massage', 'aromatherapy-massage', 'head-shoulder-massage'] },
  { name: 'Mira Kapoor', gender: 'female', profileImage: '/uploads/therapists-seed/mira-kapoor.webp', specialization: 'Aromatherapy & relaxation', experience: 6, rating: 4.8, bio: 'Mira blends aromatic oils with unhurried bodywork to create deeply restful sessions.', skills: ['Aromatherapy', 'Relaxation'], services: ['aromatherapy-massage', 'swedish-massage', 'body-reset-ritual'] },
  { name: 'Naina Mehta', gender: 'female', profileImage: '/uploads/therapists-seed/naina-mehta.webp', specialization: 'Deep tissue & sports recovery', experience: 4, rating: 4.7, bio: 'Naina combines precise pressure with mobility-focused techniques for tired, active bodies.', skills: ['Deep Tissue', 'Sports Recovery'], services: ['deep-tissue-massage', 'sports-recovery-massage', 'head-shoulder-massage'] },
  { name: 'Rhea Malhotra', gender: 'female', profileImage: '/uploads/therapists-seed/rhea-malhotra.webp', specialization: 'Hot stone & therapeutic touch', experience: 5, rating: 4.8, bio: 'Rhea is known for warm, grounding hot-stone sessions that encourage total stillness.', skills: ['Hot Stone', 'Therapeutic Massage'], services: ['hot-stone-massage', 'swedish-massage', 'body-reset-ritual'] },
  { name: 'Arjun Singh', gender: 'male', profileImage: '/uploads/therapists-seed/arjun-singh.webp', specialization: 'Sports massage & deep tissue', experience: 6, rating: 4.9, bio: 'Arjun specializes in focused deep-tissue and recovery sessions with thoughtful pressure control.', skills: ['Sports Massage', 'Deep Tissue'], services: ['sports-recovery-massage', 'deep-tissue-massage', 'head-shoulder-massage'] },
  { name: 'Kabir Mehta', gender: 'male', profileImage: '/uploads/therapists-seed/kabir-mehta.webp', specialization: 'Deep tissue & therapeutic recovery', experience: 5, rating: 4.8, bio: 'Kabir works slowly and intentionally, especially with clients carrying long-held muscular tension.', skills: ['Deep Tissue', 'Recovery'], services: ['deep-tissue-massage', 'sports-recovery-massage', 'swedish-massage'] },
  { name: 'Aarav Kapoor', gender: 'male', profileImage: '/uploads/therapists-seed/aarav-kapoor.webp', specialization: 'Swedish & relaxation massage', experience: 4, rating: 4.7, bio: 'Aarav creates balanced, calming Swedish sessions with a quiet, attentive approach.', skills: ['Swedish Massage', 'Relaxation'], services: ['swedish-massage', 'aromatherapy-massage', 'couples-massage'] },
  { name: 'Vihaan Sharma', gender: 'male', profileImage: '/uploads/therapists-seed/vihaan-sharma.webp', specialization: 'Aromatherapy & restorative rituals', experience: 5, rating: 4.8, bio: 'Vihaan pairs restorative touch with aromatic rituals for clients who want to fully switch off.', skills: ['Aromatherapy', 'Restorative Rituals'], services: ['aromatherapy-massage', 'body-reset-ritual', 'couples-massage'] },
];

// Catalogue seeding only. This script NEVER creates an administrator (see scripts/provisionAdmin.js)
// and refuses to run against production unless explicitly confirmed.
if (env.isProduction && process.env.ALLOW_PRODUCTION_SEED !== 'yes') {
  console.error('Refusing to seed in production. Set ALLOW_PRODUCTION_SEED=yes only if you really mean it.');
  process.exit(1);
}
await connectDB();
await Setting.findOneAndUpdate({ key: 'global' }, { $set: { spaAddress: 'Aviana Wellness, Jaipur', openingTime: '00:00', closingTime: '24:00', slotIntervalMinutes: 15, homeVisitFee: env.homeVisitFee, cancellationWindowHours: env.cancellationWindowHours, rescheduleWindowHours: env.rescheduleWindowHours, refundPercent: env.refundPercent } }, { upsert: true, new: true });

const serviceDocs = new Map();
for (const [title, slug, category, description, durationMinutes, spaPrice, homePrice, image] of services) {
  const item = await Service.findOneAndUpdate({ slug }, { title, slug, category, description, durationMinutes, spaPrice, homePrice, image, homeServiceAvailable: true, isActive: true }, { upsert: true, new: true });
  serviceDocs.set(slug, item._id);
}
for (const seed of seedTherapists) {
  const serviceIds = seed.services.map((slug) => serviceDocs.get(slug)).filter(Boolean);
  await Therapist.findOneAndUpdate({ name: seed.name }, {
    ...seed, image: seed.profileImage, services: serviceIds, workingDays: [0, 1, 2, 3, 4, 5, 6], shiftStart: '00:00', shiftEnd: '24:00', offersHomeService: true, isActive: true,
  }, { upsert: true, new: true });
}
await mongoose.disconnect();
console.log('Aviana seed complete.');
