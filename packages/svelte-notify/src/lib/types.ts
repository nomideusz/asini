export interface BookingNotificationData {
  guestName: string;
  guestEmail: string;
  tourName: string;
  slotStartTime: Date;
  participants: number;
  totalAmount: number;   // in cents
  currency: string;      // ISO 4217, e.g. 'PLN'
  bookingReference: string;
  guideName?: string;
  guideEmail?: string;
}

export interface CancellationNotificationData extends BookingNotificationData {
  cancelledBy: 'guest' | 'guide' | 'system';
  refundAmount: number;  // in cents, 0 = no refund
}

export interface EmailTemplate {
  subject: string;
  html: string;
}
