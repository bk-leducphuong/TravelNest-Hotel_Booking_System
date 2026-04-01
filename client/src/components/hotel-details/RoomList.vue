<template>
  <div class="room-list">
    <table v-if="rooms.length > 0">
      <thead>
        <tr class="table_header">
          <th class="table_header_1">Loại chỗ nghỉ</th>
          <th class="table_header_2">Số lượng khách</th>
          <th class="table_header_3">Giá hôm nay</th>
          <th class="table_header_4">Các lựa chọn</th>
          <th class="table_header_5">Chọn phòng</th>
          <th></th>
        </tr>
      </thead>

      <tbody>
        <tr v-for="(room, index) in rooms" :key="room.roomId" class="room_1">
          <td>
            <a href="#" class="room-title">{{ room.roomName }}</a>
            <ul class="service">
              <li v-for="(amenity, idx) in room.roomAmenities" :key="idx">
                {{ amenity }}
              </li>
            </ul>
          </td>
          <td>
            <div class="price__customer price__customer--1">
              <i v-for="(guest, idx) in room.maxGuests" :key="idx" class="fa-solid fa-user"></i>
            </div>
          </td>
          <td>
            <div class="price">
              {{ parseInt(room.pricePerNight).toLocaleString('vi-VN') }}
            </div>
            <div class="tax-info">Đã bao gồm thuế và phí</div>
          </td>
          <td>
            <ul class="benefits">
              <li>Miễn phí hủy bất kỳ lúc nào</li>
              <li>Không cần thanh toán trước</li>
            </ul>
          </td>
          <td>
            <select @change="handleRoomSelection($event, room)">
              <option value="0" selected>0</option>
              <option v-for="n in room.availableRooms" :key="n" :value="n">
                {{ n }} (VND {{ parseInt(n * room.pricePerNight).toLocaleString('vi-VN') }})
              </option>
            </select>
          </td>
          <td v-if="index === 0" :rowspan="rooms.length">
            <div class="price__content">
              <div class="booking-summary-rooms-and-price">
                {{ totalSelectedRooms }} Phòng
                <div class="total-price" style="font-size: 20px">
                  VND {{ totalPriceSelectedRooms.toLocaleString('vi-VN') }}
                </div>
              </div>
              <button @click="$emit('book')">Tôi sẽ đặt</button>
              <div v-if="selectedRooms.length == 0" style="color: red; font-size: 13px">
                Vui lòng chọn phòng trước khi đặt
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="rooms.length == 0" class="no-room-found">
      <h5>Không tìm thấy phòng phù hợp với lựa chọn của bạn.</h5>
    </div>
  </div>
</template>

<script>
export default {
  name: 'RoomList',
  props: {
    rooms: {
      type: Array,
      default: () => []
    },
    selectedRooms: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update:selectedRooms', 'book'],
  computed: {
    totalSelectedRooms() {
      return this.selectedRooms.reduce((total, option) => total + option.roomQuantity, 0)
    },
    totalPriceSelectedRooms() {
      return this.selectedRooms.reduce((total, option) => total + option.totalPrice, 0)
    }
  },
  methods: {
    handleRoomSelection(event, room) {
      const quantity = parseInt(event.target.value)
      const newSelectedRooms = [...this.selectedRooms]

      const existingSelectionIndex = newSelectedRooms.findIndex(
        (option) => option.roomName === room.roomName
      )

      if (quantity === 0) {
        if (existingSelectionIndex !== -1) {
          newSelectedRooms.splice(existingSelectionIndex, 1)
        }
      } else {
        const totalPrice = parseInt(quantity * room.pricePerNight)

        const selection = {
          roomId: room.roomId,
          roomQuantity: quantity,
          roomName: room.roomName,
          totalPrice: totalPrice
        }

        if (existingSelectionIndex !== -1) {
          newSelectedRooms[existingSelectionIndex] = selection
        } else {
          newSelectedRooms.push(selection)
        }
      }

      this.$emit('update:selectedRooms', newSelectedRooms)
    }
  }
}
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  font-family: Arial, sans-serif;
}

.table_header_3 {
  background-color: #003b95;
}

th {
  background-color: #4a73b6;
  color: white;
  padding: 12px;
  text-align: center;
  border: 1px solid #ddd;
  font-size: 14px;
}

td {
  padding: 12px;
  border: 1px solid #ddd;
  vertical-align: top;
  border-top: none;
}

.room-title {
  color: #0066cc;
  text-decoration: none;
  font-weight: bold;
}

.price {
  color: #333;
  font-weight: bold;
}

.tax-info {
  color: #666;
  font-size: 12px;
}

.service {
  list-style: none;
  padding: 0;
  margin: 0;
}

.service li {
  margin: 3px 0;
  padding-left: 20px;
  position: relative;
  font-size: 12px;
  color: gray;
}

.service li:before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #4caf50;
}

select {
  padding: 2px;
  border: 1px solid #ddd;
  border-radius: 4px;
  width: 100px;
}

.benefits {
  list-style: none;
  padding: 0;
}

.benefits li {
  margin: 5px 0;
  padding-left: 20px;
  position: relative;
  font-size: 12px;
  color: green;
}

.benefits li:before {
  content: '✓';
  position: absolute;
  left: 0;
  color: #4caf50;
}

.price__content {
  padding: 0 5px;
  font-size: 13px;
  margin-top: 5px;
  top: 105px;
  position: sticky;
}

.price__content button {
  width: 100%;
  color: white;
  font-weight: 600;
  background-color: #007bff;
  border: none;
  border-radius: 5px;
  padding: 5px 0;
  margin-bottom: 5px;
  cursor: pointer;
}

.no-room-found {
  text-align: center;
  margin: 40px;
}
</style>
