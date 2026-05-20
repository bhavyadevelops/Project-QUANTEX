import React from "react";
import { useListReviews } from "@workspace/api-client-react";
import { Star, Loader2, Quote } from "lucide-react";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`w-4 h-4 ${i <= rating ? "text-primary fill-primary" : "text-muted"}`} />
      ))}
    </div>
  );
}

const STATS = [
  { value: "4.8★", label: "Average Rating" },
  { value: "500+", label: "Reviews" },
  { value: "98%", label: "Satisfaction" },
  { value: "24/7", label: "Support" },
];

export default function Reviews() {
  const { data: reviews, isLoading } = useListReviews();

  return (
    <div className="min-h-screen bg-background">
      <section className="py-20 border-b border-border bg-card">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary font-mono text-sm uppercase tracking-widest mb-4">Community Feedback</p>
          <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter mb-4">
            Operator <span className="text-primary">Reviews</span>
          </h1>
          <p className="text-muted-foreground font-mono max-w-xl mx-auto">
            Real feedback from real customers. Unfiltered, verified, and ranked.
          </p>
        </div>
      </section>

      <section className="py-10 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-3xl font-bold text-primary font-mono">{s.value}</p>
                <p className="text-xs text-muted-foreground uppercase font-mono mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : reviews && reviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.map((review) => (
                <div key={review.id} className="border border-border bg-card p-6 rounded-lg hover:border-primary/40 transition-colors relative">
                  <Quote className="absolute top-4 right-4 w-6 h-6 text-primary/20" />
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold font-mono">
                        {review.customerName?.charAt(0) ?? "C"}
                      </span>
                    </div>
                    <div>
                      <p className="font-bold text-sm uppercase">{review.customerName ?? "Customer"}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}
                      </p>
                    </div>
                  </div>

                  <StarRating rating={review.rating ?? 5} />

                  <p className="text-sm text-muted-foreground mt-3 leading-relaxed font-mono">
                    "{review.comment}"
                  </p>

                  {review.technicianName && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <p className="text-xs text-primary font-mono">↳ {review.technicianName}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground font-mono">No reviews yet. Be the first!</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
