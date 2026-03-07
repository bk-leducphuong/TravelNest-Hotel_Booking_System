require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const db = require('../../../models');
const sequelize = require('../../../config/database.config');

const { countries: Countries, cities: Cities } = db;

// 63 provinces/cities of Vietnam treated as "cities" for search/location purposes
// Slugs are kebab-case; coordinates are approximate province/city centers.
const VIETNAM_CITIES = [
  { name: 'Ha Noi', slug: 'ha-noi', latitude: 21.0278, longitude: 105.8342 },
  { name: 'Ho Chi Minh City', slug: 'ho-chi-minh-city', latitude: 10.8231, longitude: 106.6297 },
  { name: 'Hai Phong', slug: 'hai-phong', latitude: 20.8449, longitude: 106.6881 },
  { name: 'Da Nang', slug: 'da-nang', latitude: 16.0544, longitude: 108.2022 },
  { name: 'Can Tho', slug: 'can-tho', latitude: 10.0452, longitude: 105.7469 },
  { name: 'An Giang', slug: 'an-giang', latitude: 10.5216, longitude: 105.1259 },
  { name: 'Ba Ria - Vung Tau', slug: 'ba-ria-vung-tau', latitude: 10.5417, longitude: 107.2429 },
  { name: 'Bac Giang', slug: 'bac-giang', latitude: 21.2731, longitude: 106.1946 },
  { name: 'Bac Kan', slug: 'bac-kan', latitude: 22.1470, longitude: 105.8348 },
  { name: 'Bac Lieu', slug: 'bac-lieu', latitude: 9.2941, longitude: 105.7278 },
  { name: 'Bac Ninh', slug: 'bac-ninh', latitude: 21.1861, longitude: 106.0763 },
  { name: 'Ben Tre', slug: 'ben-tre', latitude: 10.2415, longitude: 106.3758 },
  { name: 'Binh Dinh', slug: 'binh-dinh', latitude: 13.7820, longitude: 109.2197 },
  { name: 'Binh Duong', slug: 'binh-duong', latitude: 11.1738, longitude: 106.7199 },
  { name: 'Binh Phuoc', slug: 'binh-phuoc', latitude: 11.7512, longitude: 106.7235 },
  { name: 'Binh Thuan', slug: 'binh-thuan', latitude: 11.0904, longitude: 108.0720 },
  { name: 'Ca Mau', slug: 'ca-mau', latitude: 9.1768, longitude: 105.1524 },
  { name: 'Cao Bang', slug: 'cao-bang', latitude: 22.6657, longitude: 106.2570 },
  { name: 'Dak Lak', slug: 'dak-lak', latitude: 12.7100, longitude: 108.2378 },
  { name: 'Dak Nong', slug: 'dak-nong', latitude: 12.2646, longitude: 107.6098 },
  { name: 'Dien Bien', slug: 'dien-bien', latitude: 21.3860, longitude: 103.0169 },
  { name: 'Dong Nai', slug: 'dong-nai', latitude: 10.9453, longitude: 106.8247 },
  { name: 'Dong Thap', slug: 'dong-thap', latitude: 10.4938, longitude: 105.6882 },
  { name: 'Gia Lai', slug: 'gia-lai', latitude: 13.8073, longitude: 108.1094 },
  { name: 'Ha Giang', slug: 'ha-giang', latitude: 22.8233, longitude: 104.9836 },
  { name: 'Ha Nam', slug: 'ha-nam', latitude: 20.5833, longitude: 105.9229 },
  { name: 'Ha Tinh', slug: 'ha-tinh', latitude: 18.3428, longitude: 105.9057 },
  { name: 'Hai Duong', slug: 'hai-duong', latitude: 20.9386, longitude: 106.3207 },
  { name: 'Hau Giang', slug: 'hau-giang', latitude: 9.7841, longitude: 105.4701 },
  { name: 'Hoa Binh', slug: 'hoa-binh', latitude: 20.8172, longitude: 105.3376 },
  { name: 'Hung Yen', slug: 'hung-yen', latitude: 20.8526, longitude: 106.0160 },
  { name: 'Khanh Hoa', slug: 'khanh-hoa', latitude: 12.2585, longitude: 109.0526 },
  { name: 'Kien Giang', slug: 'kien-giang', latitude: 10.0125, longitude: 105.0809 },
  { name: 'Kon Tum', slug: 'kon-tum', latitude: 14.3498, longitude: 108.0000 },
  { name: 'Lai Chau', slug: 'lai-chau', latitude: 22.3964, longitude: 103.4585 },
  { name: 'Lam Dong', slug: 'lam-dong', latitude: 11.9404, longitude: 108.4583 },
  { name: 'Lang Son', slug: 'lang-son', latitude: 21.8537, longitude: 106.7615 },
  { name: 'Lao Cai', slug: 'lao-cai', latitude: 22.4800, longitude: 103.9750 },
  { name: 'Long An', slug: 'long-an', latitude: 10.6956, longitude: 106.2431 },
  { name: 'Nam Dinh', slug: 'nam-dinh', latitude: 20.4388, longitude: 106.1621 },
  { name: 'Nghe An', slug: 'nghe-an', latitude: 19.2345, longitude: 104.9200 },
  { name: 'Ninh Binh', slug: 'ninh-binh', latitude: 20.2506, longitude: 105.9745 },
  { name: 'Ninh Thuan', slug: 'ninh-thuan', latitude: 11.6739, longitude: 108.9886 },
  { name: 'Phu Tho', slug: 'phu-tho', latitude: 21.2685, longitude: 105.2049 },
  { name: 'Phu Yen', slug: 'phu-yen', latitude: 13.0882, longitude: 109.0929 },
  { name: 'Quang Binh', slug: 'quang-binh', latitude: 17.6103, longitude: 106.3487 },
  { name: 'Quang Nam', slug: 'quang-nam', latitude: 15.5394, longitude: 108.0191 },
  { name: 'Quang Ngai', slug: 'quang-ngai', latitude: 15.1205, longitude: 108.7923 },
  { name: 'Quang Ninh', slug: 'quang-ninh', latitude: 21.0064, longitude: 107.2925 },
  { name: 'Quang Tri', slug: 'quang-tri', latitude: 16.7403, longitude: 107.1855 },
  { name: 'Soc Trang', slug: 'soc-trang', latitude: 9.6000, longitude: 105.9719 },
  { name: 'Son La', slug: 'son-la', latitude: 21.3280, longitude: 103.9144 },
  { name: 'Tay Ninh', slug: 'tay-ninh', latitude: 11.3100, longitude: 106.1099 },
  { name: 'Thai Binh', slug: 'thai-binh', latitude: 20.4489, longitude: 106.3400 },
  { name: 'Thai Nguyen', slug: 'thai-nguyen', latitude: 21.5678, longitude: 105.8250 },
  { name: 'Thanh Hoa', slug: 'thanh-hoa', latitude: 19.8067, longitude: 105.7852 },
  { name: 'Thua Thien - Hue', slug: 'thua-thien-hue', latitude: 16.4637, longitude: 107.5905 },
  { name: 'Tien Giang', slug: 'tien-giang', latitude: 10.4493, longitude: 106.3420 },
  { name: 'Tra Vinh', slug: 'tra-vinh', latitude: 9.9293, longitude: 106.3459 },
  { name: 'Tuyen Quang', slug: 'tuyen-quang', latitude: 21.8236, longitude: 105.2140 },
  { name: 'Vinh Long', slug: 'vinh-long', latitude: 10.2531, longitude: 105.9722 },
  { name: 'Vinh Phuc', slug: 'vinh-phuc', latitude: 21.3093, longitude: 105.6039 },
  { name: 'Yen Bai', slug: 'yen-bai', latitude: 21.7229, longitude: 104.9113 },
  { name: 'Binh Thuan', slug: 'binh-thuan-province', latitude: 11.0904, longitude: 108.0720 },
];

/**
 * Seed Vietnamese cities (provinces/municipalities) for the Vietnam country.
 * Expects the Vietnam country (VN) to already exist in `countries`.
 * @param {Object} options
 * @param {boolean} options.clearExisting - Whether to delete existing Vietnamese cities first.
 */
async function seedCities(options = {}) {
  const { clearExisting = false } = options;

  try {
    console.log('🌱 Starting city seeding for Vietnam...');

    const vietnam = await Countries.findOne({
      where: { iso_code: 'VN' },
    });

    if (!vietnam) {
      throw new Error(
        "Vietnam country (iso_code='VN') not found. Run country seeder first to create it."
      );
    }

    if (clearExisting) {
      console.log('🗑️  Clearing existing Vietnamese cities...');
      const deleted = await Cities.destroy({
        where: { country_id: vietnam.id },
      });
      console.log(`✅ Deleted ${deleted} existing city record(s) for Vietnam`);
    }

    let created = 0;
    let skipped = 0;

    for (const city of VIETNAM_CITIES) {
      const [record, wasCreated] = await Cities.findOrCreate({
        where: {
          slug: city.slug,
        },
        defaults: {
          name: city.name,
          slug: city.slug,
          country_id: vietnam.id,
          latitude: city.latitude,
          longitude: city.longitude,
        },
      });

      if (wasCreated) created++;
      else skipped++;
    }

    const total = await Cities.count({ where: { country_id: vietnam.id } });

    console.log(
      `✅ Vietnamese cities seeded: ${created} created, ${skipped} already existed (total: ${total})`
    );

    return { created, skipped, total };
  } catch (error) {
    console.error('❌ Error seeding cities:', error);
    throw error;
  }
}

if (require.main === module) {
  (async () => {
    try {
      await sequelize.authenticate();
      console.log('✅ Database connection established');

      await seedCities({
        clearExisting: false,
      });

      await db.sequelize.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  seedCities,
  VIETNAM_CITIES,
};

