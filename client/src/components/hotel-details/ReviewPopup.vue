<template>
  <div v-if="isOpen" class="review-popup" @click.self="$emit('close')">
    <div class="review-popup__left" @click="$emit('close')"></div>
    <div class="review-popup__right">
      <strong>Đánh giá của khách</strong>
      <button class="close" @click="$emit('close')">×</button>

      <div class="review-popup__point">
        <span class="point">{{ ratingSummary?.overallRating || 0 }}</span>
        <div>
          <span style="font-weight: 500">Tuyệt hảo</span>
          <br />
          <span>{{ ratingSummary?.totalReviews || 0 }} đánh giá</span>
        </div>
        <p>
          Chúng tôi cố gắng mang đến 100% đánh giá thật <i class="fa-solid fa-circle-info"></i>
        </p>
        <button @click="$emit('write-review')">Viết đánh giá</button>
      </div>

      <hr />

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

      <hr />

      <!-- Filters Section -->
      <div class="review__number">
        <strong>Bộ lọc</strong>
        <ul>
          <li>
            <p>Khách đánh giá</p>
            <select>
              <option value="">Tất cả({{ ratingSummary?.totalReviews || 0 }})</option>
              <option value="">Gia đình(11)</option>
              <option value="">Cặp đôi(2)</option>
              <option value="">Khách lẻ(9)</option>
              <option value="">Du khách doanh nhân(1)</option>
            </select>
          </li>
          <li>
            <p>Điểm đánh giá</p>
            <select>
              <option value="">Tất cả({{ ratingSummary?.totalReviews || 0 }})</option>
              <option value="">Tuyệt hảo: 9+ (19)</option>
              <option value="">Tốt: 7-9 (2)</option>
              <option value="">Tàm tạm: 5-7 (1)</option>
              <option value="">Rất tệ: 1-3 (1)</option>
            </select>
          </li>
          <li>
            <p>Ngôn ngữ</p>
            <select>
              <option value="">Tất cả ({{ ratingSummary?.totalReviews || 0 }})</option>
              <option value="">Tiếng Việt (6)</option>
              <option value="">Tiếng Anh (6)</option>
              <option value="">Tiếng Hàn Quốc (1)</option>
              <option value="">Tiếng Pháp (5)</option>
            </select>
          </li>
          <li>
            <p>Thời gian trong năm</p>
            <select>
              <option value="">Tất cả({{ ratingSummary?.totalReviews || 0 }})</option>
              <option value="">Tháng 3-5</option>
              <option value="">Tháng 6-8</option>
              <option value="">Tháng 9-11</option>
              <option value="">Tháng 12-2</option>
            </select>
          </li>
        </ul>
      </div>

      <hr />

      <!-- Reviews List -->
      <strong>Đánh giá của khách</strong>
      <div v-for="review in reviews" :key="review.id" class="review-popup__text">
        <div class="review-popup__infor">
          <div class="name">
            <img
              :src="review.user?.profilePictureUrl || '/default-avatar.png'"
              alt="avatar"
              style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover"
            />
            <div class="infor">
              <span style="font-weight: 600">{{ review.user?.fullName || 'Anonymous' }}</span>
              <br />
              <span v-if="review.user?.country">{{ review.user.country }}</span>
              <span v-else>Việt Nam</span>
            </div>
          </div>
          <div>
            <div class="service">
              <i class="fa-solid fa-bed"></i> <span>Nhà 1 phòng ngủ</span>
            </div>
            <div class="service">
              <i class="fa-regular fa-calendar"></i>
              <span>{{ new Date(review.createdAt).toLocaleDateString('vi-VN') }}</span>
            </div>
            <div v-if="review.isVerified" class="service">
              <i class="fa-solid fa-check-circle"></i> <span>Đã xác thực</span>
            </div>
          </div>
        </div>
        <div class="review-popup__desc">
          <div class="point">
            <div>
              <p>Ngày đánh giá: {{ new Date(review.createdAt).toLocaleDateString('vi-VN') }}</p>
              <strong v-if="review.ratingOverall >= 7">Xuất sắc</strong>
              <strong v-else-if="review.ratingOverall >= 5">Tốt</strong>
              <strong v-else>Chưa tốt</strong>
            </div>
            <span>{{ review.ratingOverall }}</span>
          </div>
          <div v-if="review.title" class="text">
            <strong>{{ review.title }}</strong>
          </div>
          <div v-if="review.comment" class="text">
            <i class="fa-regular fa-face-smile-beam"></i>
            <span> {{ review.comment }}</span>
          </div>
          <div class="button">
            <button>
              <i class="fa-regular fa-thumbs-up"></i> Hữu ích ({{ review.helpfulCount || 0 }})
            </button>
            <button><i class="fa-regular fa-thumbs-down"></i> Không hữu ích</button>
          </div>
        </div>
      </div>

      <hr />

      <!-- Pagination -->
      <div class="pagination">
        <button><i class="fa-solid fa-arrow-left"></i></button>
        <button>1</button>
        <button>2</button>
        <button>3</button>
        <button><i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ReviewPopup',
  props: {
    isOpen: {
      type: Boolean,
      default: false
    },
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
  emits: ['close', 'write-review']
}
</script>

<style scoped>
.review-popup {
  overflow-y: scroll;
  display: flex;
  justify-content: space-between;
  height: 100vh;
  width: 100vw;
  position: fixed;
  z-index: 9999;
  background-color: #00000056;
  top: 0px;
}

.review-popup__left {
  width: 40%;
  height: 100%;
}

.review-popup__right {
  flex: 1;
  background-color: #fff;
  border-radius: 8px 0 0 8px;
  padding: 20px;
  height: fit-content;
}

.review-popup__right strong {
  font-size: 20px;
  display: inline-block;
  margin-bottom: 15px;
}

.close {
  position: absolute;
  right: 20px;
  top: 20px;
  border: none;
  background: transparent;
  font-size: 30px;
  cursor: pointer;
  color: #666;
}

.review-popup__point {
  display: flex;
  align-items: center;
  position: relative;
}

.review-popup__point div {
  margin-right: 30px;
  margin-left: 5px;
}

.review-popup__point p {
  margin: 0;
  color: green;
}

.review-popup__point .point {
  padding: 10px;
  background-color: #0056b3;
  color: #fff;
  border-radius: 5px 5px 5px 0;
  font-size: 18px;
  font-weight: 600;
  margin-right: 6px;
}

.review-popup__point button {
  position: absolute;
  right: 0px;
  border: 1px solid #007bff;
  padding: 5px 10px;
  font-size: 14px;
  color: #007bff;
  font-weight: 600;
  background-color: #fff;
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

.review__number ul {
  display: flex;
  margin: 0;
  list-style-type: none;
  padding: 0;
  justify-content: space-between;
}

.review__number ul p {
  margin-bottom: 5px;
}

.review__number select {
  width: 100%;
  border-radius: 5px;
  padding: 3px 5px;
}

.review__number li {
  width: 23%;
}

.review-popup__text {
  display: flex;
  margin-bottom: 20px;
}

.review-popup__infor {
  width: 30%;
}

.review-popup__infor .name {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.review-popup__infor .service i {
  width: 24px;
  text-align: center;
  margin-right: 5px;
}

.review-popup__infor .service {
  font-size: 13px;
}

.review-popup__desc {
  flex: 1;
}

.review-popup__desc .point {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.review-popup__desc .point span {
  padding: 8px 10px;
  font-weight: 600;
  color: #fff;
  background-color: #0056b3;
  display: inline-block;
  border-radius: 5px 5px 5px 0;
}

.review-popup__desc .text {
  margin-bottom: 20px;
}

.review-popup__desc .text i {
  color: green;
}

.review-popup__desc .button {
  float: right;
}

.review-popup__desc .button button {
  border: none;
  border-radius: 5px;
  padding: 5px 13px;
  background: #fff;
  color: #007bff;
  cursor: pointer;
  margin-left: 5px;
}

.pagination {
  padding: 10px 20px;
  border: 1px solid #007bff;
  border-radius: 10px;
}

.pagination button {
  margin-right: 10px;
  border: none;
  background-color: transparent;
  color: #007bff;
  padding: 5px 13px;
  border-radius: 5px;
  cursor: pointer;
}

.pagination button:hover {
  background-color: #007bff57;
  color: #fff;
}
</style>
