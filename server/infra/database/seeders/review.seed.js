/**
 * Review Seed File
 *
 * Generates fake review data using Faker.js and seeds the database.
 * Requires existing hotels and users (customers) in the database.
 *
 * Usage:
 *   - Run directly: node seed/review.seed.js
 *   - Import and use: const { seedReviews } = require('./seed/review.seed');
 *
 * Options:
 *   - reviewsPerHotel: Number of reviews to generate per hotel (default: 10-30 random)
 *   - clearExisting: Whether to clear existing reviews before seeding (default: false)
 *   - useBookings: Whether to use existing bookings for reviews (default: false)
 *
 * Note: This seed file requires hotels and users (customers) to exist in the database first.
 */

require('dotenv').config({
  path:
    process.env.NODE_ENV === 'development'
      ? '.env.development'
      : '.env.production',
});
const { faker } = require('@faker-js/faker');
const db = require('../models');
const sequelize = require('../config/database.config');
const { reviews, review_criterias, hotels, users, bookings } = db;

// Common review criteria names
const REVIEW_CRITERIA_NAMES = [
  'Cleanliness',
  'Staff',
  'Facilities',
  'Comfort',
  'Location',
  'Value for money',
  'Service',
  'Amenities',
  'Breakfast',
  'WiFi',
  'Room Quality',
  'Check-in Experience',
];

// Review comment templates based on rating
const REVIEW_COMMENTS = {
  5: [
    'Excellent hotel with outstanding service!',
    'Perfect stay, highly recommend!',
    'Amazing experience, will definitely come back!',
    'Outstanding facilities and friendly staff.',
    'Best hotel I have ever stayed at!',
    'Exceptional service and beautiful rooms.',
    'Absolutely fantastic! Everything was perfect.',
    'Wonderful experience from check-in to check-out.',
    'Top-notch service and amenities.',
    'Exceeded all expectations!',
  ],
  4: [
    'Great hotel with good service.',
    'Very nice stay, enjoyed it.',
    'Good value for money.',
    'Comfortable rooms and helpful staff.',
    'Nice location and clean facilities.',
    'Pleasant experience overall.',
    'Good hotel with minor improvements needed.',
    'Satisfactory stay with good amenities.',
    'Enjoyed my time here.',
    'Decent hotel, would stay again.',
  ],
  3: [
    'Average hotel, nothing special.',
    'Okay stay, but could be better.',
    'Room was fine but service was slow.',
    'Decent but expected more.',
    'Acceptable but not exceptional.',
    'Some good points but also some issues.',
    'Average experience overall.',
    'Could use some improvements.',
    'Not bad but not great either.',
    'Mediocre stay.',
  ],
  2: [
    'Disappointing experience.',
    'Not what I expected.',
    'Several issues during my stay.',
    'Poor service and facilities.',
    'Would not recommend.',
    'Many things could be improved.',
    'Below average hotel.',
    'Had some problems.',
    'Not satisfied with the stay.',
    'Needs significant improvements.',
  ],
  1: [
    'Terrible experience, very disappointed.',
    'Worst hotel stay ever.',
    'Multiple issues, very poor service.',
    'Would never stay here again.',
    'Completely unacceptable.',
    'Many problems, avoid this hotel.',
    'Very poor quality.',
    'Extremely disappointed.',
    'Awful experience.',
    'Not recommended at all.',
  ],
};

/**
 * Generate a review comment based on rating
 * @param {number} rating - Rating (1-5)
 * @returns {string} Review comment
 */
function generateReviewComment(rating) {
  const comments = REVIEW_COMMENTS[rating] || REVIEW_COMMENTS[3];
  const baseComment = faker.helpers.arrayElement(comments);

  // Sometimes add more detail
  if (faker.datatype.boolean()) {
    const details = [
      ' The staff was very helpful.',
      ' The location was convenient.',
      ' The room was spacious and clean.',
      ' Breakfast was delicious.',
      ' The facilities were modern.',
      ' Great value for money.',
      ' The view was amazing.',
      ' Very comfortable beds.',
      ' Excellent WiFi connection.',
      ' Parking was easy.',
    ];

    return baseComment + faker.helpers.arrayElement(details);
  }

  return baseComment;
}

/**
 * Generate review criteria for a review
 * @param {number} reviewId - Review ID
 * @param {number} overallRating - Overall rating (affects criteria scores)
 * @returns {Array} Array of review criteria objects
 */
function generateReviewCriteria(reviewId, overallRating) {
  // Select 4-6 criteria randomly
  const numCriteria = faker.number.int({ min: 4, max: 6 });
  const selectedCriteria = faker.helpers.arrayElements(
    REVIEW_CRITERIA_NAMES,
    numCriteria
  );

  return selectedCriteria.map((criteriaName) => {
    // Criteria score should be close to overall rating, with some variation
    let score;
    if (overallRating === 5) {
      score = faker.helpers.arrayElement([4, 5]);
    } else if (overallRating === 4) {
      score = faker.helpers.arrayElement([3, 4, 5]);
    } else if (overallRating === 3) {
      score = faker.helpers.arrayElement([2, 3, 4]);
    } else if (overallRating === 2) {
      score = faker.helpers.arrayElement([1, 2, 3]);
    } else {
      score = faker.helpers.arrayElement([1, 2]);
    }

    return {
      review_id: reviewId,
      criteria_name: criteriaName,
      score: score,
    };
  });
}

/**
 * Generate fake review data
 * @param {number} userId - User ID
 * @param {number} hotelId - Hotel ID
 * @param {Object} options - Options
 * @param {number} options.bookingId - Optional booking ID
 * @param {string} options.bookingCode - Optional booking code
 * @returns {Object} Review data object
 */
function generateReview(userId, hotelId, options = {}) {
  const { bookingId = null, bookingCode = null } = options;

  // Generate rating (weighted towards positive reviews)
  const ratingDistribution = faker.number.int({ min: 1, max: 100 });
  let rating;
  if (ratingDistribution <= 40) {
    // 40% chance of 5 stars
    rating = 5;
  } else if (ratingDistribution <= 65) {
    // 25% chance of 4 stars
    rating = 4;
  } else if (ratingDistribution <= 85) {
    // 20% chance of 3 stars
    rating = 3;
  } else if (ratingDistribution <= 95) {
    // 10% chance of 2 stars
    rating = 2;
  } else {
    // 5% chance of 1 star
    rating = 1;
  }

  const review = {
    user_id: userId,
    hotel_id: hotelId,
    rating: parseFloat(rating.toFixed(1)),
    comment: generateReviewComment(rating),
    booking_id: bookingId,
    booking_code: bookingCode || null,
    reply: null, // Can be populated later
    number_of_likes: faker.number.int({ min: 0, max: 50 }),
    number_of_dislikes: faker.number.int({ min: 0, max: 10 }),
    created_at: faker.date.past({ years: 1 }),
  };

  return review;
}

/**
 * Seed reviews into the database
 * @param {Object} options - Seeding options
 * @param {number|Object} options.reviewsPerHotel - Number of reviews per hotel (default: random 10-30)
 *   Can be a number or object with min/max: { min: 10, max: 30 }
 * @param {boolean} options.clearExisting - Whether to clear existing reviews (default: false)
 * @param {boolean} options.useBookings - Whether to use existing bookings (default: false)
 * @param {Array<number>} options.hotelIds - Specific hotel IDs to seed (optional, seeds all if not provided)
 */
async function seedReviews(options = {}) {
  const {
    reviewsPerHotel = { min: 10, max: 30 },
    clearExisting = false,
    useBookings = false,
    hotelIds = null,
  } = options;

  try {
    console.log('🌱 Starting review seeding...');

    // Get all hotels or specific hotels
    let hotelQuery = {};
    if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
      hotelQuery = { id: hotelIds };
    }

    const existingHotels = await hotels.findAll({
      where: hotelQuery,
      attributes: ['id'],
    });

    if (existingHotels.length === 0) {
      console.log('❌ No hotels found in database. Please seed hotels first.');
      return;
    }

    // Get all customers (users with role 'customer')
    const existingCustomers = await users.findAll({
      where: { user_role: 'customer' },
      attributes: ['id'],
    });

    if (existingCustomers.length === 0) {
      console.log(
        '❌ No customers found in database. Please seed users first.'
      );
      return;
    }

    console.log(`🏨 Found ${existingHotels.length} hotel(s)`);
    console.log(`👥 Found ${existingCustomers.length} customer(s)`);

    // Get bookings if useBookings is true
    let existingBookings = [];
    if (useBookings) {
      existingBookings = await bookings.findAll({
        attributes: ['id', 'booking_code', 'buyer_id', 'hotel_id'],
        where: {
          status: ['completed', 'checked in'],
        },
      });
      console.log(`📋 Found ${existingBookings.length} completed booking(s)`);
    }

    // Clear existing reviews if requested
    if (clearExisting) {
      console.log('🗑️  Clearing existing reviews...');
      if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
        await reviews.destroy({ where: { hotel_id: hotelIds } });
      } else {
        await reviews.destroy({ where: {}, truncate: true });
        await review_criterias.destroy({ where: {}, truncate: true });
      }
      console.log('✅ Existing reviews cleared');
    }

    let totalReviewsCreated = 0;
    const reviewsToCreate = [];
    const criteriaToCreate = [];

    // Generate reviews for each hotel
    for (const hotel of existingHotels) {
      const hotelId = hotel.id || hotel.get?.('id');

      // Determine number of reviews for this hotel
      let numReviews;
      if (typeof reviewsPerHotel === 'number') {
        numReviews = reviewsPerHotel;
      } else {
        numReviews = faker.number.int({
          min: reviewsPerHotel.min || 10,
          max: reviewsPerHotel.max || 30,
        });
      }

      // Get bookings for this hotel if using bookings
      const hotelBookings = useBookings
        ? existingBookings.filter(
            (b) =>
              (b.hotel_id || b.get?.('hotel_id')) === hotelId &&
              (b.buyer_id || b.get?.('buyer_id'))
          )
        : [];

      // Generate reviews
      for (let i = 0; i < numReviews; i++) {
        // Select a random customer
        const randomCustomer =
          existingCustomers[
            faker.number.int({ min: 0, max: existingCustomers.length - 1 })
          ];
        const userId =
          randomCustomer.id || randomCustomer.get?.('id');

        // Try to use a booking if available and useBookings is true
        let bookingId = null;
        let bookingCode = null;
        if (hotelBookings.length > 0 && faker.datatype.boolean()) {
          const randomBooking =
            hotelBookings[
              faker.number.int({ min: 0, max: hotelBookings.length - 1 })
            ];
          bookingId =
            randomBooking.booking_id || randomBooking.get?.('booking_id');
          bookingCode =
            randomBooking.booking_code || randomBooking.get?.('booking_code');
        }

        const review = generateReview(userId, hotelId, {
          bookingId,
          bookingCode,
        });
        reviewsToCreate.push(review);
      }

      console.log(
        `   ⭐ Generated ${numReviews} review(s) for hotel ID ${hotelId}`
      );
    }

    // Bulk create all reviews
    if (reviewsToCreate.length > 0) {
      console.log(
        `\n💾 Creating ${reviewsToCreate.length} review(s) in database...`
      );
      const createdReviews = await reviews.bulkCreate(reviewsToCreate, {
        validate: true,
        returning: true,
      });

      // Generate and create review criteria for each review
      console.log('💾 Creating review criteria...');
      for (const review of createdReviews) {
        const reviewId = review.review_id || review.get?.('review_id');
        const rating = review.rating || review.get?.('rating');
        const criteria = generateReviewCriteria(reviewId, Math.round(rating));

        criteriaToCreate.push(...criteria);
      }

      if (criteriaToCreate.length > 0) {
        await review_criterias.bulkCreate(criteriaToCreate, {
          validate: true,
        });
        console.log(
          `✅ ${criteriaToCreate.length} review criteria created successfully`
        );
      }

      totalReviewsCreated = createdReviews.length;
      console.log(`✅ ${totalReviewsCreated} review(s) created successfully`);
    }

    // Display summary
    const totalReviews = await reviews.count();
    const reviewsByHotel = await reviews.findAll({
      attributes: [
        'hotel_id',
        [sequelize.fn('COUNT', sequelize.col('review_id')), 'review_count'],
        [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
      ],
      group: ['hotel_id'],
      raw: true,
    });

    console.log('\n📊 Review Summary:');
    console.log(`   Total reviews: ${totalReviews}`);
    console.log(`   Reviews created in this run: ${totalReviewsCreated}`);
    console.log(`   Hotels with reviews: ${reviewsByHotel.length}`);

    if (reviewsByHotel.length > 0 && reviewsByHotel.length <= 10) {
      console.log('\n   Reviews per hotel:');
      reviewsByHotel.forEach((item) => {
        const avgRating = parseFloat(item.avg_rating || 0).toFixed(1);
        console.log(
          `     Hotel ${item.hotel_id}: ${item.review_count} review(s), avg rating: ${avgRating}`
        );
      });
    }
  } catch (error) {
    console.error('❌ Error seeding reviews:', error);
    throw error;
  }
}

/**
 * Seed reviews for a specific hotel
 * @param {number} hotelId - Hotel ID
 * @param {number} count - Number of reviews to generate
 * @param {boolean} useBookings - Whether to use existing bookings
 * @returns {Promise<Array>} Created reviews
 */
async function seedReviewsForHotel(hotelId, count = 20, useBookings = false) {
  try {
    // Verify hotel exists
    const hotel = await hotels.findByPk(hotelId);
    if (!hotel) {
      throw new Error(`Hotel with ID ${hotelId} not found`);
    }

    // Get customers
    const existingCustomers = await users.findAll({
      where: { user_role: 'customer' },
      attributes: ['user_id'],
    });

    if (existingCustomers.length === 0) {
      throw new Error('No customers found in database');
    }

    // Get bookings if useBookings is true
    let hotelBookings = [];
    if (useBookings) {
      hotelBookings = await bookings.findAll({
        where: {
          hotel_id: hotelId,
          status: ['completed', 'checked in'],
        },
        attributes: ['id', 'booking_code', 'buyer_id'],
      });
    }

    const reviewsToCreate = [];
    const criteriaToCreate = [];

    for (let i = 0; i < count; i++) {
      const randomCustomer =
        existingCustomers[
          faker.number.int({ min: 0, max: existingCustomers.length - 1 })
        ];
      const userId = randomCustomer.id || randomCustomer.get?.('id');

      let bookingId = null;
      let bookingCode = null;
      if (hotelBookings.length > 0 && faker.datatype.boolean()) {
        const randomBooking =
          hotelBookings[
            faker.number.int({ min: 0, max: hotelBookings.length - 1 })
          ];
        bookingId =
          randomBooking.booking_id || randomBooking.get?.('booking_id');
        bookingCode =
          randomBooking.booking_code || randomBooking.get?.('booking_code');
      }

      const review = generateReview(userId, hotelId, {
        bookingId,
        bookingCode,
      });
      reviewsToCreate.push(review);
    }

    const createdReviews = await reviews.bulkCreate(reviewsToCreate, {
      validate: true,
      returning: true,
    });

    // Create review criteria
    for (const review of createdReviews) {
      const reviewId = review.review_id || review.get?.('review_id');
      const rating = review.rating || review.get?.('rating');
      const criteria = generateReviewCriteria(reviewId, Math.round(rating));
      criteriaToCreate.push(...criteria);
    }

    if (criteriaToCreate.length > 0) {
      await review_criterias.bulkCreate(criteriaToCreate, {
        validate: true,
      });
    }

    console.log(
      `✅ Created ${createdReviews.length} review(s) for hotel ${hotelId}`
    );
    return createdReviews;
  } catch (error) {
    console.error(`❌ Error seeding reviews for hotel ${hotelId}:`, error);
    throw error;
  }
}

/**
 * Generate review data without saving to database (for testing)
 * @param {number} userId - User ID
 * @param {number} hotelId - Hotel ID
 * @param {Object} options - Options
 * @returns {Object} Review data object
 */
function generateReviewData(userId, hotelId, options = {}) {
  return generateReview(userId, hotelId, options);
}

// If running directly
if (require.main === module) {
  (async () => {
    try {
      // Test database connection
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      // Seed reviews
      await seedReviews({
        reviewsPerHotel: { min: 10, max: 30 }, // Random 10-30 reviews per hotel
        useBookings: false, // Set to true to use existing bookings
        clearExisting: false, // Set to true to clear existing reviews
        // hotelIds: [1, 2, 3], // Optional: seed only specific hotels
      });

      // Close database connection
      await sequelize.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  seedReviews,
  seedReviewsForHotel,
  generateReviewData,
  generateReview,
};
