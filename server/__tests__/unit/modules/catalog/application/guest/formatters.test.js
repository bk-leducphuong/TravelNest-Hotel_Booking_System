const {
  formatAmenities,
  formatRatingSummary,
  formatRatingBreakdown,
  formatReviews,
  formatNearbyPlaces,
  formatPolicies,
  formatRooms,
  formatImages,
} = require('@modules/catalog/application/guest/formatters');

describe('catalog/application/guest/formatters', () => {
  it('groups amenities by category', () => {
    const result = formatAmenities([
      { id: 1, category: 'general', code: 'wifi', name: 'WiFi', icon: 'wifi' },
      { id: 2, category: 'general', code: 'pool', name: 'Pool', icon: 'pool' },
      { id: 3, category: 'room', code: 'tv', name: 'TV', icon: 'tv' },
    ]);

    expect(result).toEqual({
      general: [
        { id: 1, code: 'wifi', name: 'WiFi', icon: 'wifi' },
        { id: 2, code: 'pool', name: 'Pool', icon: 'pool' },
      ],
      room: [{ id: 3, code: 'tv', name: 'TV', icon: 'tv' }],
    });
  });

  it('returns null rating summary when none is provided', () => {
    expect(formatRatingSummary(null)).toBeNull();
  });

  it('builds the rating distribution with numeric fallbacks', () => {
    const result = formatRatingSummary({
      overall_rating: '8.4',
      total_reviews: 12,
      rating_10: 5,
      last_review_date: '2030-01-01',
    });

    expect(result).toMatchObject({
      overallRating: 8.4,
      totalReviews: 12,
      lastReviewDate: '2030-01-01',
    });
    expect(result.ratingDistribution.rating_10).toBe(5);
    expect(result.ratingDistribution.rating_1).toBe(0);
  });

  it('formats the criteria breakdown to one decimal place', () => {
    expect(formatRatingBreakdown({ cleanliness: '9.123', location: null, overall: 8 })).toEqual({
      cleanliness: '9.1',
      location: null,
      service: null,
      valueForMoney: null,
      overall: '8.0',
    });
  });

  it('unwraps Sequelize reviews and maps media', () => {
    const model = {
      toJSON: () => ({
        id: 7,
        rating_overall: '9.0',
        title: 'Great',
        user: { id: 1, first_name: 'A', country: 'VN' },
        reply: { comment: 'thanks', created_at: '2030-01-01' },
        media: [{ id: 2, media_type: 'image', media_url: 'x.jpg' }],
      }),
    };

    const [review] = formatReviews([model]);

    expect(review).toMatchObject({
      id: 7,
      ratingOverall: 9,
      title: 'Great',
      user: { id: 1, firstName: 'A', country: 'VN' },
      reply: { comment: 'thanks', createdAt: '2030-01-01' },
      media: [{ id: 2, type: 'image', url: 'x.jpg' }],
    });
  });

  it('parses nearby place numbers', () => {
    const [place] = formatNearbyPlaces([
      { id: 1, name: 'Beach', latitude: '1.5', longitude: '2.5', distance_km: '0.4' },
    ]);

    expect(place).toMatchObject({ latitude: 1.5, longitude: 2.5, distanceKm: 0.4 });
  });

  it('formats policies', () => {
    expect(
      formatPolicies([{ id: 1, policy_type: 'check_in', title: 'Check-in', display_order: 1 }])
    ).toEqual([
      {
        id: 1,
        policyType: 'check_in',
        title: 'Check-in',
        description: undefined,
        displayOrder: 1,
        icon: undefined,
      },
    ]);
  });

  it('computes room total price from nights', () => {
    const [room] = formatRooms(
      [{ id: 'r1', room_name: 'Deluxe', price_per_night: '100.00', available_rooms: 2 }],
      3
    );

    expect(room).toMatchObject({
      roomId: 'r1',
      roomName: 'Deluxe',
      pricePerNight: 100,
      totalPrice: 300,
    });
  });

  it('leaves room total price null without a night count', () => {
    const [room] = formatRooms([{ id: 'r1', price_per_night: '100.00' }]);
    expect(room.totalPrice).toBeNull();
  });

  it('formats images with their variants', () => {
    const [image] = formatImages([
      {
        id: 1,
        object_key: 'a.avif',
        is_primary: true,
        display_order: 0,
        image_variants: [
          { id: 2, variant_type: 'medium', object_key: 'a_medium.webp', width: 10, height: 10 },
        ],
      },
    ]);

    expect(image).toMatchObject({
      id: 1,
      url: 'a.avif',
      isPrimary: true,
      variants: [{ id: 2, variantType: 'medium', url: 'a_medium.webp', width: 10, height: 10 }],
    });
  });
});
