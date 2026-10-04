/**
 * Pure response formatters for hotel detail/search reads.
 *
 * These were previously inline inside a 260-line `getHotelDetails` method; they
 * are side-effect free and independently testable.
 */

function formatImages(images = []) {
  return (images || []).map((img) => ({
    id: img.id,
    url: img.object_key,
    filename: img.original_filename,
    width: img.width,
    height: img.height,
    isPrimary: img.is_primary,
    displayOrder: img.display_order,
    variants: (img.image_variants || []).map((variant) => ({
      id: variant.id,
      variantType: variant.variant_type,
      url: variant.object_key,
      width: variant.width,
      height: variant.height,
    })),
  }));
}

function formatAmenities(amenities = []) {
  const byCategory = {};

  (amenities || []).forEach((amenity) => {
    if (!byCategory[amenity.category]) {
      byCategory[amenity.category] = [];
    }
    byCategory[amenity.category].push({
      id: amenity.id,
      code: amenity.code,
      name: amenity.name,
      icon: amenity.icon,
    });
  });

  return byCategory;
}

function formatRatingSummary(ratingSummary) {
  if (!ratingSummary) return null;

  return {
    overallRating: parseFloat(ratingSummary.overall_rating || 0),
    totalReviews: ratingSummary.total_reviews || 0,
    ratingDistribution: {
      rating_10: ratingSummary.rating_10 || 0,
      rating_9: ratingSummary.rating_9 || 0,
      rating_8: ratingSummary.rating_8 || 0,
      rating_7: ratingSummary.rating_7 || 0,
      rating_6: ratingSummary.rating_6 || 0,
      rating_5: ratingSummary.rating_5 || 0,
      rating_4: ratingSummary.rating_4 || 0,
      rating_3: ratingSummary.rating_3 || 0,
      rating_2: ratingSummary.rating_2 || 0,
      rating_1: ratingSummary.rating_1 || 0,
    },
    lastReviewDate: ratingSummary.last_review_date,
  };
}

function formatRatingBreakdown(reviewCriteria) {
  const criteria = reviewCriteria || {};

  return {
    cleanliness: criteria.cleanliness ? parseFloat(criteria.cleanliness).toFixed(1) : null,
    location: criteria.location ? parseFloat(criteria.location).toFixed(1) : null,
    service: criteria.service ? parseFloat(criteria.service).toFixed(1) : null,
    valueForMoney: criteria.value_for_money
      ? parseFloat(criteria.value_for_money).toFixed(1)
      : null,
    overall: criteria.overall ? parseFloat(criteria.overall).toFixed(1) : null,
  };
}

function formatReviews(rows = []) {
  return (rows || []).map((review) => {
    const reviewData = review.toJSON ? review.toJSON() : review;

    return {
      id: reviewData.id,
      ratingOverall: parseFloat(reviewData.rating_overall),
      ratingCleanliness: reviewData.rating_cleanliness
        ? parseFloat(reviewData.rating_cleanliness)
        : null,
      ratingLocation: reviewData.rating_location ? parseFloat(reviewData.rating_location) : null,
      ratingService: reviewData.rating_service ? parseFloat(reviewData.rating_service) : null,
      ratingValue: reviewData.rating_value ? parseFloat(reviewData.rating_value) : null,
      title: reviewData.title,
      comment: reviewData.comment,
      isVerified: reviewData.is_verified,
      helpfulCount: reviewData.helpful_count,
      createdAt: reviewData.created_at,
      user: reviewData.user
        ? {
            id: reviewData.user.id,
            firstName: reviewData.user.first_name,
            country: reviewData.user.country,
          }
        : null,
      reply: reviewData.reply
        ? {
            comment: reviewData.reply.comment,
            createdAt: reviewData.reply.created_at,
          }
        : null,
      media: (reviewData.media || []).map((media) => ({
        id: media.id,
        type: media.media_type,
        url: media.media_url,
      })),
    };
  });
}

function formatNearbyPlaces(places = []) {
  return (places || []).map((place) => {
    const placeData = place.toJSON ? place.toJSON() : place;

    return {
      id: placeData.id,
      name: placeData.name,
      category: placeData.category,
      description: placeData.description,
      address: placeData.address,
      latitude: parseFloat(placeData.latitude),
      longitude: parseFloat(placeData.longitude),
      distanceKm: parseFloat(placeData.distance_km),
      travelTimeMinutes: placeData.travel_time_minutes,
      travelMode: placeData.travel_mode,
      rating: placeData.rating ? parseFloat(placeData.rating) : null,
      websiteUrl: placeData.website_url,
      phoneNumber: placeData.phone_number,
      openingHours: placeData.opening_hours,
      priceLevel: placeData.price_level,
      icon: placeData.icon,
    };
  });
}

function formatPolicies(policies = []) {
  return (policies || []).map((policy) => {
    const policyData = policy.toJSON ? policy.toJSON() : policy;

    return {
      id: policyData.id,
      policyType: policyData.policy_type,
      title: policyData.title,
      description: policyData.description,
      displayOrder: policyData.display_order,
      icon: policyData.icon,
    };
  });
}

function formatRooms(rooms = [], numberOfNights) {
  return (rooms || []).map((room) => ({
    roomId: room.id || room.room_id,
    roomName: room.room_name,
    maxGuests: room.max_guests,
    roomImageUrls: room.room_image_urls,
    roomAmenities: room.room_amenities,
    pricePerNight: parseFloat(room.price_per_night) || 0,
    availableRooms: room.available_rooms || 0,
    totalPrice:
      numberOfNights && room.price_per_night
        ? parseFloat((parseFloat(room.price_per_night) * numberOfNights).toFixed(2))
        : null,
  }));
}

module.exports = {
  formatImages,
  formatAmenities,
  formatRatingSummary,
  formatRatingBreakdown,
  formatReviews,
  formatNearbyPlaces,
  formatPolicies,
  formatRooms,
};
