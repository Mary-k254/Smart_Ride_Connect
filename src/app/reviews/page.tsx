"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Star, MessageSquare, Flag, User } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Review {
  id: number;
  passengerId: number;
  driverId: number;
  rating: number;
  comment: string | null;
  isReported: boolean;
  createdAt: string;
  passengerName: string | null;
}

interface Driver {
  id: number;
  name: string;
}

// Defined outside component to avoid "component created during render" lint error
function StarRating({
  rating,
  interactive = false,
  onChange,
}: {
  rating: number;
  interactive?: boolean;
  onChange?: (r: number) => void;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type={interactive ? "button" : undefined}
          onClick={interactive && onChange ? () => onChange(star) : undefined}
          className={interactive ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            className={`h-5 w-5 ${
              star <= rating
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    driverId: 0,
    rating: 5,
    comment: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const [reviewRes, vehicleRes] = await Promise.all([
        fetch("/api/reviews"),
        fetch("/api/vehicles"),
      ]);
      const reviewData = await reviewRes.json();
      const vehicleData = await vehicleRes.json();

      setReviews(reviewData.reviews || []);

      const uniqueDrivers = new Map<number, Driver>();
      (vehicleData.vehicles || []).forEach(
        (v: { driverId: number; driverName: string }) => {
          if (v.driverId && v.driverName) {
            uniqueDrivers.set(v.driverId, { id: v.driverId, name: v.driverName });
          }
        }
      );
      setDrivers(Array.from(uniqueDrivers.values()));
      setLoading(false);
    };

    fetchData().catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const data = await res.json();
      setReviews([{ ...data.review, passengerName: user?.name || "You" }, ...reviews]);
      setShowForm(false);
      setForm({ driverId: 0, rating: 5, comment: "" });
    }
    setSubmitting(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Driver Reviews</h1>
          <p className="text-gray-500">Rate your experience and help improve service quality</p>
        </div>
        {user?.role === "passenger" && (
          <Button onClick={() => setShowForm(!showForm)}>
            <MessageSquare className="h-4 w-4 mr-2" />
            Write Review
          </Button>
        )}
      </div>

      {/* Review Form */}
      {showForm && user?.role === "passenger" && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Leave a Review</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Select Driver
              </label>
              <select
                value={form.driverId}
                onChange={(e) => setForm({ ...form, driverId: parseInt(e.target.value) })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                required
              >
                <option value={0}>Choose a driver...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Rating
              </label>
              <StarRating
                rating={form.rating}
                interactive
                onChange={(r) => setForm({ ...form, rating: r })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Comment (optional)
              </label>
              <textarea
                value={form.comment}
                onChange={(e) => setForm({ ...form, comment: e.target.value })}
                placeholder="Share your experience..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={!form.driverId}
                className="flex-1"
              >
                Submit Review
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Star className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium">No reviews yet</p>
          <p className="text-sm">Be the first to review a driver!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 rounded-full p-2">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {review.passengerName || "Anonymous"}
                    </div>
                    <div className="text-xs text-gray-400">
                      {formatDate(review.createdAt)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StarRating rating={review.rating} />
                  {review.isReported && (
                    <Flag className="h-4 w-4 text-red-400" />
                  )}
                </div>
              </div>

              {review.comment && (
                <p className="text-gray-600 text-sm leading-relaxed">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
