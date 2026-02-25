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
  path: `.env.${process.env.NODE_ENV}`,
});
const { faker } = require('@faker-js/faker');

const db = require('../../../models');
const sequelize = require('../../../config/database.config');
const { REVIEW_STATUSES } = require('../../../constants/reviews');
const { reviews, hotels, users, bookings, user_roles, roles } = db;

// Review title templates based on rating (1-10 scale)
const REVIEW_TITLES = {
  9: [
    'Outstanding Experience!',
    'Exceeded All Expectations',
    'Simply Perfect',
    'Absolutely Amazing',
    'Best Hotel Ever',
  ],
  7: [
    'Great Stay',
    'Very Good Hotel',
    'Highly Recommend',
    'Wonderful Experience',
    'Really Enjoyed It',
  ],
  5: ['Decent Stay', 'Average Experience', 'It Was Okay', 'Nothing Special', 'Mixed Feelings'],
  3: ['Disappointing', 'Below Expectations', 'Not Great', 'Had Some Issues', 'Could Be Better'],
  1: [
    'Terrible Experience',
    'Very Disappointing',
    'Would Not Recommend',
    'Awful Stay',
    'Complete Disaster',
  ],
};

// Review comment templates based on rating (1-10 scale)
const REVIEW_COMMENTS = {
  10: [
    'Excellent hotel with outstanding service! Everything was absolutely perfect from start to finish.',
    'Perfect stay, highly recommend! The attention to detail was exceptional.',
    'Amazing experience, will definitely come back! This hotel sets the gold standard.',
    'Outstanding facilities and incredibly friendly staff. Best hotel experience ever.',
    'Best hotel I have ever stayed at! Worth every penny and more.',
    'Exceptional service and beautiful rooms. Cannot fault anything.',
    'Absolutely fantastic! Everything was perfect and beyond expectations.',
    'Wonderful experience from check-in to check-out. Staff went above and beyond.',
    'Top-notch service and amenities. This place is a gem!',
    'Exceeded all expectations! Would give more stars if I could.',
  ],
  8: [
    'Great hotel with good service. Really enjoyed my stay here.',
    'Very nice stay, enjoyed it thoroughly. Would definitely return.',
    'Good value for money. Everything was clean and well-maintained.',
    'Comfortable rooms and helpful staff. Had a pleasant experience.',
    'Nice location and clean facilities. Staff were friendly and accommodating.',
    'Pleasant experience overall. Few minor issues but nothing major.',
    'Good hotel with some room for improvement. Still recommend it.',
    'Satisfactory stay with good amenities. Met most of my expectations.',
    'Enjoyed my time here. Good quality for the price.',
    'Decent hotel, would stay again. Solid choice in the area.',
  ],
  6: [
    'Average hotel, nothing special but adequate for the price.',
    'Okay stay, but could be better. Some aspects were good, others not so much.',
    'Room was fine but service was slow at times.',
    'Decent but expected more based on the reviews and photos.',
    'Acceptable but not exceptional. Had both good and bad moments.',
    'Some good points but also some issues that need addressing.',
    'Average experience overall. Not bad but not great either.',
    'Could use some improvements. Basic amenities were okay.',
    'Not bad but not great either. Mediocre in most aspects.',
    'Mediocre stay. Just an average hotel experience.',
  ],
  4: [
    'Disappointing experience. Several things did not meet expectations.',
    'Not what I expected based on the listing. Quite underwhelming.',
    'Several issues during my stay. Management needs to address problems.',
    'Poor service and facilities need updating. Below average.',
    'Would not recommend. Too many problems for the price.',
    'Many things could be improved. Not worth the money.',
    'Below average hotel. Had multiple issues that were not resolved.',
    'Had some problems that affected my stay negatively.',
    'Not satisfied with the stay. Expected much better.',
    'Needs significant improvements. Disappointed overall.',
  ],
  2: [
    'Terrible experience, very disappointed. Nothing went right.',
    'Worst hotel stay ever. Multiple serious issues.',
    'Multiple issues, very poor service. Would never return.',
    'Would never stay here again. Complete waste of money.',
    'Completely unacceptable. Hotel did not meet basic standards.',
    'Many problems, avoid this hotel. Save your money.',
    'Very poor quality. Nothing was as advertised.',
    'Extremely disappointed. One of the worst experiences.',
    'Awful experience. Everything was below standard.',
    'Not recommended at all. Stay somewhere else.',
  ],
};

/**
 * Generate a review title based on rating (1-10 scale)
 * @param {number} rating - Rating (1-10)
 * @returns {string} Review title
 */
function generateReviewTitle(rating) {
  let titleGroup;
  if (rating >= 9) {
    titleGroup = REVIEW_TITLES[9];
  } else if (rating >= 7) {
    titleGroup = REVIEW_TITLES[7];
  } else if (rating >= 5) {
    titleGroup = REVIEW_TITLES[5];
  } else if (rating >= 3) {
    titleGroup = REVIEW_TITLES[3];
  } else {
    titleGroup = REVIEW_TITLES[1];
  }

  return faker.helpers.arrayElement(titleGroup);
}

/**
 * Generate a review comment based on rating (1-10 scale)
 * @param {number} rating - Rating (1-10)
 * @returns {string} Review comment
 */
function generateReviewComment(rating) {
  let commentGroup;
  if (rating >= 9) {
    commentGroup = REVIEW_COMMENTS[10];
  } else if (rating >= 7) {
    commentGroup = REVIEW_COMMENTS[8];
  } else if (rating >= 5) {
    commentGroup = REVIEW_COMMENTS[6];
  } else if (rating >= 3) {
    commentGroup = REVIEW_COMMENTS[4];
  } else {
    commentGroup = REVIEW_COMMENTS[2];
  }

  const baseComment = faker.helpers.arrayElement(commentGroup);

  // Sometimes add more detail
  if (faker.datatype.boolean()) {
    const details = [
      ' The staff was very helpful and professional.',
      ' The location was convenient and easy to access.',
      ' The room was spacious and well-maintained.',
      ' Breakfast was delicious with good variety.',
      ' The facilities were modern and clean.',
      ' Great value for money in this area.',
      ' The view from the room was amazing.',
      ' Very comfortable beds and quality linens.',
      ' Excellent WiFi connection throughout.',
      ' Parking was easy and convenient.',
      ' The pool and gym facilities were excellent.',
      ' Check-in process was smooth and efficient.',
    ];

    return baseComment + faker.helpers.arrayElement(details);
  }

  return baseComment;
}

/**
 * Generate rating scores for individual criteria based on overall rating
 * Adds realistic variation while keeping them correlated to overall rating
 * @param {number} overallRating - Overall rating (1-10)
 * @returns {Object} Object with rating_cleanliness, rating_location, rating_service, rating_value
 */
function generateCriteriaRatings(overallRating) {
  const variation = 1.5; // Max variation from overall rating

  const generateScore = () => {
    const score = overallRating + faker.number.float({ min: -variation, max: variation });
    // Clamp between 1.0 and 10.0 and round to 1 decimal
    return parseFloat(Math.max(1.0, Math.min(10.0, score)).toFixed(1));
  };

  return {
    rating_cleanliness: generateScore(),
    rating_location: generateScore(),
    rating_service: generateScore(),
    rating_value: generateScore(),
  };
}

/**
 * Generate fake review data
 * @param {number} userId - User ID
 * @param {number} hotelId - Hotel ID
 * @param {Object} options - Options
 * @param {string} options.bookingId - Optional booking ID (makes review verified)
 * @returns {Object} Review data object
 */
function generateReview(userId, hotelId, options = {}) {
  const { bookingId = null } = options;

  // Generate overall rating (1-10 scale, weighted towards positive reviews)
  const ratingDistribution = faker.number.int({ min: 1, max: 100 });
  let rating;
  if (ratingDistribution <= 30) {
    // 30% chance of 9-10 (excellent)
    rating = faker.number.float({ min: 9.0, max: 10.0 });
  } else if (ratingDistribution <= 60) {
    // 30% chance of 7-8.9 (good)
    rating = faker.number.float({ min: 7.0, max: 8.9 });
  } else if (ratingDistribution <= 80) {
    // 20% chance of 5-6.9 (average)
    rating = faker.number.float({ min: 5.0, max: 6.9 });
  } else if (ratingDistribution <= 93) {
    // 13% chance of 3-4.9 (below average)
    rating = faker.number.float({ min: 3.0, max: 4.9 });
  } else {
    // 7% chance of 1-2.9 (poor)
    rating = faker.number.float({ min: 1.0, max: 2.9 });
  }

  const overallRating = parseFloat(rating.toFixed(1));
  const criteriaRatings = generateCriteriaRatings(overallRating);

  // Determine status (most are published)
  const statusDistribution = faker.number.int({ min: 1, max: 100 });
  let status;
  if (statusDistribution <= 92) {
    status = 'published';
  } else if (statusDistribution <= 97) {
    status = 'hidden';
  } else {
    status = 'deleted';
  }

  const createdAt = faker.date.past({ years: 1 });
  const updatedAt = faker.date.between({ from: createdAt, to: new Date() });

  const review = {
    user_id: userId,
    hotel_id: hotelId,
    booking_id: bookingId,
    rating_overall: overallRating,
    ...criteriaRatings,
    title: generateReviewTitle(overallRating),
    comment: generateReviewComment(overallRating),
    status: status,
    is_verified: bookingId !== null,
    helpful_count: faker.number.int({ min: 0, max: 50 }),
    created_at: createdAt,
    updated_at: updatedAt,
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
 * @param {Array<string>} options.hotelIds - Specific hotel IDs (UUIDs) to seed (optional, seeds all if not provided)
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

    // Get all customers (users with 'user' or 'guest' role)
    const customerRoles = await roles.findAll({
      where: { name: ['user', 'guest'] },
      attributes: ['id'],
    });

    if (customerRoles.length === 0) {
      console.log('❌ No customer roles (user/guest) found in database. Please seed roles first.');
      return;
    }

    const customerRoleIds = customerRoles.map((role) => role.id || role.get?.('id'));

    const existingCustomers = await users.findAll({
      attributes: ['id'],
      include: [
        {
          model: user_roles,
          as: 'roles',
          where: { role_id: customerRoleIds },
          attributes: [],
          required: true,
        },
      ],
    });

    if (existingCustomers.length === 0) {
      console.log('❌ No customers found in database. Please seed users first.');
      return;
    }

    console.log(`🏨 Found ${existingHotels.length} hotel(s)`);
    console.log(`👥 Found ${existingCustomers.length} customer(s)`);

    // Get bookings if useBookings is true
    let existingBookings = [];
    if (useBookings) {
      existingBookings = await bookings.findAll({
        attributes: ['id', 'buyer_id', 'hotel_id'],
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
      }
      console.log('✅ Existing reviews cleared');
    }

    let totalReviewsCreated = 0;
    const reviewsToCreate = [];

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
              (b.hotel_id || b.get?.('hotel_id')) === hotelId && (b.buyer_id || b.get?.('buyer_id'))
          )
        : [];

      // Generate reviews
      for (let i = 0; i < numReviews; i++) {
        // Select a random customer
        const randomCustomer =
          existingCustomers[faker.number.int({ min: 0, max: existingCustomers.length - 1 })];
        const userId = randomCustomer.id || randomCustomer.get?.('id');

        // Try to use a booking if available and useBookings is true
        let bookingId = null;
        if (hotelBookings.length > 0 && faker.datatype.boolean()) {
          const randomBooking =
            hotelBookings[faker.number.int({ min: 0, max: hotelBookings.length - 1 })];
          bookingId = randomBooking.id || randomBooking.get?.('id');
        }

        const review = generateReview(userId, hotelId, {
          bookingId,
        });
        reviewsToCreate.push(review);
      }

      console.log(`   ⭐ Generated ${numReviews} review(s) for hotel ID ${hotelId}`);
    }

    // Bulk create all reviews
    if (reviewsToCreate.length > 0) {
      console.log(`\n💾 Creating ${reviewsToCreate.length} review(s) in database...`);
      const createdReviews = await reviews.bulkCreate(reviewsToCreate, {
        validate: true,
        returning: true,
      });

      totalReviewsCreated = createdReviews.length;
      console.log(`✅ ${totalReviewsCreated} review(s) created successfully`);
    }

    // Display summary
    const totalReviews = await reviews.count();
    const reviewsByHotel = await reviews.findAll({
      attributes: [
        'hotel_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'review_count'],
        [sequelize.fn('AVG', sequelize.col('rating_overall')), 'avg_rating'],
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
          `     Hotel ${item.hotel_id}: ${item.review_count} review(s), avg rating: ${avgRating}/10.0`
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
 * @param {string} hotelId - Hotel ID (UUID)
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

    // Get customers (users with 'user' or 'guest' role)
    const customerRoles = await roles.findAll({
      where: { name: ['user', 'guest'] },
      attributes: ['id'],
    });

    if (customerRoles.length === 0) {
      throw new Error('No customer roles (user/guest) found in database');
    }

    const customerRoleIds = customerRoles.map((role) => role.id || role.get?.('id'));

    const existingCustomers = await users.findAll({
      attributes: ['id'],
      include: [
        {
          model: user_roles,
          as: 'roles',
          where: { role_id: customerRoleIds },
          attributes: [],
          required: true,
        },
      ],
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
        attributes: ['id', 'buyer_id'],
      });
    }

    const reviewsToCreate = [];

    for (let i = 0; i < count; i++) {
      const randomCustomer =
        existingCustomers[faker.number.int({ min: 0, max: existingCustomers.length - 1 })];
      const userId = randomCustomer.id || randomCustomer.get?.('id');

      let bookingId = null;
      if (hotelBookings.length > 0 && faker.datatype.boolean()) {
        const randomBooking =
          hotelBookings[faker.number.int({ min: 0, max: hotelBookings.length - 1 })];
        bookingId = randomBooking.id || randomBooking.get?.('id');
      }

      const review = generateReview(userId, hotelId, {
        bookingId,
      });
      reviewsToCreate.push(review);
    }

    const createdReviews = await reviews.bulkCreate(reviewsToCreate, {
      validate: true,
      returning: true,
    });

    console.log(`✅ Created ${createdReviews.length} review(s) for hotel ${hotelId}`);
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
