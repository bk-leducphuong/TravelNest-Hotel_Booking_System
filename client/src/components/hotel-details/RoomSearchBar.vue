<template>
  <div class="room-search-bar">
    <div class="search-bar">
      <!-- Date picker input -->
      <div class="date-picker">
        <input
          ref="dateInput"
          class="search-input"
          type="text"
          placeholder="Nhận phòng - Trả phòng"
          :value="dateRange"
        />
      </div>

      <!-- Guest room input -->
      <div v-click-outside="hideGuestSelector" class="guest-room-wrapper">
        <input
          type="text"
          :value="guestDetails"
          class="search-input"
          readonly
          @click="toggleGuestSelector"
        />

        <!-- Guest room selector -->
        <div v-if="showGuestSelector" id="guest-room-selector" class="guest-room-selector">
          <div class="selector-item">
            <span>Số khách</span>
            <div class="counter">
              <button class="decrement" @click="updateGuests('guests', 'decrement')">-</button>
              <span>{{ numberOfGuests }}</span>
              <button class="increment" @click="updateGuests('guests', 'increment')">+</button>
            </div>
          </div>
          <div class="selector-item">
            <span>Phòng</span>
            <div class="counter">
              <button class="decrement" @click="updateGuests('rooms', 'decrement')">-</button>
              <span>{{ numberOfRooms }}</span>
              <button class="increment" @click="updateGuests('rooms', 'increment')">+</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Search button -->
      <button class="search-button" :disabled="isLoading" @click="handleSearch">
        {{ isLoading ? 'Đang tìm...' : 'Áp dụng' }}
      </button>
    </div>
  </div>
</template>

<script>
import flatpickr from 'flatpickr'
import 'flatpickr/dist/flatpickr.css'

export default {
  name: 'RoomSearchBar',
  props: {
    dateRange: {
      type: String,
      default: ''
    },
    numberOfGuests: {
      type: Number,
      default: 2
    },
    numberOfRooms: {
      type: Number,
      default: 1
    },
    isLoading: {
      type: Boolean,
      default: false
    }
  },
  emits: ['search', 'update:numberOfGuests', 'update:numberOfRooms'],
  data() {
    return {
      showGuestSelector: false,
      flatpickrInstance: null
    }
  },
  computed: {
    guestDetails() {
      return `${this.numberOfGuests} khách · ${this.numberOfRooms} phòng`
    }
  },
  mounted() {
    // Initialize flatpickr on the date input
    if (this.$refs.dateInput) {
      this.flatpickrInstance = flatpickr(this.$refs.dateInput, {
        dateFormat: 'd/m/Y',
        locale: 'vn',
        mode: 'range',
        minDate: 'today',
        showMonths: 2,
        locale: {
          rangeSeparator: ' đến '
        },
        onValueUpdate: (selectedDates, dateStr, instance) => {
          const display = instance.element.value
          instance.element.value = 'Từ ' + display
        }
      })
    }
  },
  methods: {
    toggleGuestSelector() {
      this.showGuestSelector = !this.showGuestSelector
    },
    hideGuestSelector() {
      this.showGuestSelector = false
    },
    updateGuests(type, action) {
      if (type === 'guests') {
        let newValue = this.numberOfGuests
        if (action === 'increment' && newValue < 30) newValue++
        else if (action === 'decrement' && newValue > 1) newValue--
        this.$emit('update:numberOfGuests', newValue)
      } else if (type === 'rooms') {
        let newValue = this.numberOfRooms
        if (action === 'increment' && newValue < 30) newValue++
        else if (action === 'decrement' && newValue > 1) newValue--
        this.$emit('update:numberOfRooms', newValue)
      }
    },
    handleSearch() {
      const searchData = {
        dateRange: this.$refs.dateInput.value,
        selectedDates: this.flatpickrInstance?.selectedDates || [],
        numberOfGuests: this.numberOfGuests,
        numberOfRooms: this.numberOfRooms
      }
      this.$emit('search', searchData)
    }
  }
}
</script>

<style scoped>
.room-search-bar {
  margin-bottom: 15px;
}

.search-bar {
  max-width: 70%;
  background-color: #ffb700;
  height: 40px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  box-sizing: border-box;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 9999;
}

.search-input {
  height: 100%;
  padding: 0 10px 0 40px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  background-repeat: no-repeat;
  background-position: 10px center;
  background-size: 16px;
  width: 30%;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>');
}

.date-picker {
  width: 40%;
  height: 90%;
}

.date-picker .search-input {
  height: 100%;
  padding: 0 10px 0 40px;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  background-repeat: no-repeat;
  background-position: 10px center;
  background-size: 16px;
  width: 100%;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>');
}

.guest-room-wrapper {
  position: relative;
  display: inline-block;
  width: 40%;
  height: 90%;
}

.guest-room-wrapper input {
  width: 100%;
  background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%23333" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>');
}

#guest-room-selector {
  position: absolute;
  top: 100%;
  left: 0;
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 10px;
  z-index: 100;
  width: 100%;
}

.guest-room-wrapper .selector-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.guest-room-wrapper .counter {
  display: flex;
  align-items: center;
}

.guest-room-wrapper button {
  width: 30px;
  height: 30px;
  font-size: 18px;
  text-align: center;
  line-height: 30px;
  border: 1px solid #007bff;
  background-color: #fff;
  color: #007bff;
  border-radius: 4px;
  cursor: pointer;
}

.guest-room-wrapper button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.guest-room-wrapper span {
  margin: 0 10px;
  font-size: 16px;
}

.search-button {
  background-color: #3576d2;
  color: #fff;
  border: none;
  padding: 8px 16px;
  cursor: pointer;
  font-weight: bold;
  border-radius: 4px;
  font-size: 18px;
  width: 18%;
  height: 90%;
}

.search-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
