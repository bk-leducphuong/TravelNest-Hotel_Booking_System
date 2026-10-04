/**
 * Pure row generator for the `reviews` table.
 *
 * Iterates hotels sequentially and samples a reviewer from the users sampler.
 * `booking_id` is intentionally omitted (NULL) so reviews are unverified and the
 * unique booking link is never violated.
 */

const { uuidv7 } = require('uuidv7');

const TABLE = 'reviews';

const COLUMNS = [
  'id',
  'user_id',
  'hotel_id',
  'rating_overall',
  'rating_cleanliness',
  'rating_location',
  'rating_service',
  'rating_value',
  'title',
  'comment',
  'status',
  'is_verified',
  'helpful_count',
  'created_at',
  'updated_at',
];

const DEFAULT_REVIEWS_PER_HOTEL = { min: 10, max: 30 };

const TITLES = {
  high: ['Outstanding Experience!', 'Exceeded All Expectations', 'Simply Perfect', 'Amazing Stay'],
  good: ['Great Stay', 'Very Good Hotel', 'Highly Recommend', 'Wonderful Experience'],
  average: ['Decent Stay', 'Average Experience', 'It Was Okay', 'Mixed Feelings'],
  poor: ['Disappointing', 'Below Expectations', 'Not Great', 'Could Be Better'],
  bad: ['Terrible Experience', 'Very Disappointing', 'Would Not Recommend', 'Awful Stay'],
};

const COMMENTS = {
  high: [
    'Excellent hotel with outstanding service. Everything was perfect from start to finish.',
    'Perfect stay, highly recommend. The attention to detail was exceptional.',
    'Amazing experience, will definitely come back.',
  ],
  good: [
    'Great hotel with good service. Really enjoyed my stay here.',
    'Very nice stay, enjoyed it thoroughly. Would definitely return.',
    'Good value for money. Everything was clean and well-maintained.',
  ],
  average: [
    'Average hotel, nothing special but adequate for the price.',
    'Okay stay, but could be better.',
    'Decent but expected more based on the photos.',
  ],
  poor: [
    'Disappointing experience. Several things did not meet expectations.',
    'Several issues during my stay. Management needs to address problems.',
    'Below average hotel. Had multiple issues that were not resolved.',
  ],
  bad: [
    'Terrible experience, very disappointed. Nothing went right.',
    'Multiple issues, very poor service. Would never return.',
    'Completely unacceptable. Hotel did not meet basic standards.',
  ],
};

const STATUS_WEIGHTS = [
  { status: 'published', weight: 92 },
  { status: 'hidden', weight: 5 },
  { status: 'deleted', weight: 3 },
];

const TOTAL_STATUS_WEIGHT = STATUS_WEIGHTS.reduce((sum, item) => sum + item.weight, 0);

function band(rating) {
  if (rating >= 9) return 'high';
  if (rating >= 7) return 'good';
  if (rating >= 5) return 'average';
  if (rating >= 3) return 'poor';
  return 'bad';
}

function pickStatus() {
  let random = Math.floor(Math.random() * TOTAL_STATUS_WEIGHT) + 1;
  for (const item of STATUS_WEIGHTS) {
    random -= item.weight;
    if (random <= 0) {
      return item.status;
    }
  }
  return 'published';
}

function criteria(faker, overall) {
  const score = faker.number.float({
    min: Math.max(1, overall - 1.5),
    max: Math.min(10, overall + 1.5),
  });
  return score.toFixed(1);
}

function buildRow(faker, { userId, hotelId }) {
  const draw = faker.number.int({ min: 1, max: 100 });

  let overall;
  if (draw <= 30) {
    overall = faker.number.float({ min: 9.0, max: 10.0 });
  } else if (draw <= 60) {
    overall = faker.number.float({ min: 7.0, max: 8.9 });
  } else if (draw <= 80) {
    overall = faker.number.float({ min: 5.0, max: 6.9 });
  } else if (draw <= 93) {
    overall = faker.number.float({ min: 3.0, max: 4.9 });
  } else {
    overall = faker.number.float({ min: 1.0, max: 2.9 });
  }

  const overallRating = Number.parseFloat(overall.toFixed(1));
  const group = band(overallRating);
  const createdAt = faker.date.past({ years: 1 });

  return {
    id: uuidv7(),
    user_id: userId,
    hotel_id: hotelId,
    rating_overall: overallRating.toFixed(1),
    rating_cleanliness: criteria(faker, overallRating),
    rating_location: criteria(faker, overallRating),
    rating_service: criteria(faker, overallRating),
    rating_value: criteria(faker, overallRating),
    title: faker.helpers.arrayElement(TITLES[group]),
    comment: faker.helpers.arrayElement(COMMENTS[group]),
    status: pickStatus(),
    is_verified: false,
    helpful_count: faker.number.int({ min: 0, max: 50 }),
    created_at: createdAt,
    updated_at: faker.date.between({ from: createdAt, to: new Date() }),
  };
}

async function* createRows({
  faker,
  hotelIds,
  userSampler,
  reviewsPerHotel = DEFAULT_REVIEWS_PER_HOTEL,
}) {
  const min = reviewsPerHotel.min ?? DEFAULT_REVIEWS_PER_HOTEL.min;
  const max = reviewsPerHotel.max ?? DEFAULT_REVIEWS_PER_HOTEL.max;

  for await (const hotelId of hotelIds) {
    const count = faker.number.int({ min, max });

    for (let i = 0; i < count; i++) {
      yield buildRow(faker, { userId: userSampler.random(), hotelId });
    }
  }
}

module.exports = {
  COLUMNS,
  DEFAULT_REVIEWS_PER_HOTEL,
  TABLE,
  buildRow,
  createRows,
};
