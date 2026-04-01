<template>
  <div class="review-section">
    <div class="review__point">
      <div class="review__point--left">
        <h3>Đánh giá của khách</h3>
        <span class="point">{{ ratingSummary?.overallRating || 0 }}</span>
        <span style="font-weight: 500; margin-left: 5px">
          Tuyệt hảo - {{ ratingSummary?.totalReviews || 0 }} đánh giá
        </span>
      </div>
      <div class="review__point--right">
        <button @click="$emit('view-rooms')">Xem phòng trống</button>
      </div>
    </div>

    <!-- Rating Breakdown -->
    <div class="review__process">
      <strong>Hạng mục</strong>
      <div class="review__process--bar">
        <div class="row">
          <div v-if="ratingBreakdown.cleanliness" class="col-lg-4 col-md-6 col-12">
            <div class="category">
              <div>Sạch sẽ</div>
              <div>{{ ratingBreakdown.cleanliness }}</div>
            </div>
            <div class="process--bar">
              <div
                class="bar"
                :style="`width: ${(ratingBreakdown.cleanliness / 10) * 100}%`"
              ></div>
            </div>
          </div>
          <div v-if="ratingBreakdown.location" class="col-lg-4 col-md-6 col-12">
            <div class="category">
              <div>Vị trí</div>
              <div>{{ ratingBreakdown.location }}</div>
            </div>
            <div class="process--bar">
              <div class="bar" :style="`width: ${(ratingBreakdown.location / 10) * 100}%`"></div>
            </div>
          </div>
          <div v-if="ratingBreakdown.service" class="col-lg-4 col-md-6 col-12">
            <div class="category">
              <div>Dịch vụ</div>
              <div>{{ ratingBreakdown.service }}</div>
            </div>
            <div class="process--bar">
              <div class="bar" :style="`width: ${(ratingBreakdown.service / 10) * 100}%`"></div>
            </div>
          </div>
          <div v-if="ratingBreakdown.valueForMoney" class="col-lg-4 col-md-6 col-12">
            <div class="category">
              <div>Giá trị</div>
              <div>{{ ratingBreakdown.valueForMoney }}</div>
            </div>
            <div class="process--bar">
              <div
                class="bar"
                :style="`width: ${(ratingBreakdown.valueForMoney / 10) * 100}%`"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Sample Reviews -->
    <div class="review__text">
      <strong>Khách lưu trú ở đây thích điều gì</strong>
      <div class="row">
        <div v-for="(review, index) in reviews" :key="review.id" class="col-xl-4 col-md-6 col-12">
          <div v-if="index <= 2" class="reviewer">
            <div class="name">
              <img :src="review.user?.profilePictureUrl || '/default-avatar.png'" alt="" />
              <div class="infor">
                <span style="font-weight: 600">{{ review.user?.fullName || 'Anonymous' }}</span>
                <br />
                <span v-if="review.user?.country">{{ review.user.country }}</span>
                <span v-else>Việt Nam</span>
              </div>
            </div>
            <div class="text">
              <p v-if="review.comment">"{{ review.comment }}"</p>
              <a href="">Tìm hiểu thêm</a>
              <br />
              <a href="">Xem bản dịch</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button class="btnAll" @click="$emit('show-all-reviews')">Đọc tất cả đánh giá</button>
  </div>
</template>

<script>
export default {
  name: 'ReviewSection',
  props: {
    ratingSummary: {
      type: Object,
      default: () => null
    },
    ratingBreakdown: {
      type: Object,
      default: () => ({})
    },
    reviews: {
      type: Array,
      default: () => []
    }
  },
  emits: ['view-rooms', 'show-all-reviews']
}
</script>

<style scoped>
.review-section {
  margin-top: 20px;
}

.review__point {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.review__point h3 {
  font-size: 24px;
  font-weight: bold;
}

.review__point .point {
  padding: 10px;
  font-weight: 600;
  color: #fff;
  background-color: #0056b3;
  display: inline-block;
  border-radius: 5px 5px 5px 0;
}

.review__point--right button {
  border: none;
  padding: 5px 10px;
  color: #fff;
  font-weight: 600;
  background-color: #007bff;
  border-radius: 5px;
  cursor: pointer;
}

.review__process--bar .category {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.review__process--bar .process--bar {
  width: 100%;
  height: 10px;
  border-radius: 5px;
  background-color: #ddd;
  margin: 8px 0px;
  overflow: hidden;
}

.review__process--bar .process--bar .bar {
  background-color: #0056b3;
  height: 100%;
}

.review__process {
  margin-bottom: 10px;
}

.review__text {
  margin-top: 10px;
}

.reviewer {
  margin-top: 10px;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.reviewer .name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 5px;
}

.reviewer .name img {
  width: auto;
  height: 64px;
  border-radius: 50%;
  margin-right: 10px;
}

.btnAll {
  margin-top: 20px;
  border: 1px solid #0056b3;
  background-color: transparent;
  color: #0056b3;
  font-weight: 600;
  padding: 10px 15px;
  border-radius: 5px;
  cursor: pointer;
}

.btnAll:hover {
  color: #fff;
  background-color: #0056b3;
}
</style>
