// Calculate distance between two coordinates using Haversine formula
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Calculate fare based on distance
export function calculateFare(distanceKm: number, ratePerKm: number = 10): number {
  const baseFare = 50; // Minimum fare in KES
  const calculatedFare = distanceKm * ratePerKm;
  return Math.max(baseFare, Math.round(calculatedFare));
}

// Format currency in KES
export function formatCurrency(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// Format date
export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Generate transaction ID
export function generateTransactionId(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `MTT${timestamp}${random}`;
}

// Get status color
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: "text-green-600 bg-green-100",
    inactive: "text-gray-600 bg-gray-100",
    pending: "text-yellow-600 bg-yellow-100",
    confirmed: "text-blue-600 bg-blue-100",
    picked_up: "text-purple-600 bg-purple-100",
    completed: "text-green-600 bg-green-100",
    cancelled: "text-red-600 bg-red-100",
    paid: "text-green-600 bg-green-100",
    unpaid: "text-red-600 bg-red-100",
    ongoing: "text-blue-600 bg-blue-100",
    en_route: "text-purple-600 bg-purple-100",
    maintenance: "text-orange-600 bg-orange-100",
  };
  return colors[status] || "text-gray-600 bg-gray-100";
}

// Estimate arrival time
export function estimateArrival(distanceKm: number, speedKmh: number = 60): string {
  const minutes = Math.round((distanceKm / speedKmh) * 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  return remainingMin > 0 ? `${hours}h ${remainingMin}min` : `${hours}h`;
}

// Validate Kenyan phone number
export function validateKenyanPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s+/g, "").replace(/-/g, "");
  return /^(\+254|0)[17]\d{8}$/.test(cleaned);
}

// Format phone number to international format
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\s+/g, "").replace(/-/g, "");
  if (cleaned.startsWith("0")) {
    return "+254" + cleaned.substring(1);
  }
  return cleaned;
}
