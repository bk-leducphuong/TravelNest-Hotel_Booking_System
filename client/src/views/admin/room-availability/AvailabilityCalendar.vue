<script>
import DashboardMenu from '@/components/admin/DashboardMenu.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import { mapGetters } from 'vuex'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import errorHandler from '@/request/errorHandler'

export default {
  components: {
    DashboardMenu,
    AdminHeader
  },
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      rooms: [],
      currentRoom: null,
      roomInventory: [], // room inventory data for current room
      roomInventoryMap: new Array(7).fill(0).map(() => new Array(7).fill(0)), // map from the calendar to the room inventory
      currentMonth: null,
      currentYear: null,
      numberOfDays: null,
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], // Weekdays header,
      weeks: [],
      monthsInYear: [
        {
          text: 'January',
          value: 1
        },
        {
          text: 'February',
          value: 2
        },
        {
          text: 'March',
          value: 3
        },
        {
          text: 'April',
          value: 4
        },
        {
          text: 'May',
          value: 5
        },
        {
          text: 'June',
          value: 6
        },
        {
          text: 'July',
          value: 7
        },
        {
          text: 'August',
          value: 8
        },
        {
          text: 'September',
          value: 9
        },
        {
          text: 'October',
          value: 10
        },
        {
          text: 'November',
          value: 11
        },
        {
          text: 'December',
          value: 12
        }
      ],
      dragging: false, // Whether the user is currently dragging
      startCell: null, // Starting cell for drag
      selectedCells: [], // Array of selected cells,
      startDate: null, // Starting date for selected dates
      endDate: null, // Ending date for selected dates
      price: 0, // price of all selected dates
      enableEdit: false,
      // edit information for all selected cells
      newRoomStatus: null, // 'close' or 'open'
      newPrice: 0,
      numberOfLeftRoom: 0,

      isLoading: false
    }
  },
  watch: {
    currentMonth(newMonth) {
      this.currentMonth = newMonth
      this.generateCalendar(this.currentYear, newMonth)
      this.mapCalendarToRoomInventory()
    },
    currentRoom(newRoom) {
      this.getRoomInventory()
    },
    selectedCells(newSelectedCells) {
      // lock for editing
      this.enableEdit = false
      this.newRoomStatus = null
      this.newPrice = 0
      this.numberOfLeftRoom = 0

      // update start and end date
      this.startDate =
        this.roomInventoryMap[newSelectedCells[0].weekIndex][
          newSelectedCells[0].dayIndex
        ].date.split('T')[0]
      this.endDate =
        this.roomInventoryMap[newSelectedCells[newSelectedCells.length - 1].weekIndex][
          newSelectedCells[newSelectedCells.length - 1].dayIndex
        ].date.split('T')[0]

      // update price
      this.price = 0
      for (let i = 0; i < newSelectedCells.length; i++) {
        this.price += parseInt(
          this.roomInventoryMap[newSelectedCells[0].weekIndex][newSelectedCells[0].dayIndex]
            .price_per_night
        )
      }
    }
  },
  computed: {
    ...mapGetters('manageHotels', ['getCurrentManagingHotelId'])
  },
  methods: {
    selectYear(year) {
      this.currentYear = year
    },
    generateCalendar(year, month) {
      const firstDay = new Date(year, month - 1, 1)
      const lastDay = new Date(year, month, 0)
      const daysInMonth = lastDay.getDate()

      const weeks = []
      let week = []
      let dayOfWeek = firstDay.getDay()
      if (dayOfWeek === 0) dayOfWeek = 7 // Adjust Sunday to be the 7th day

      // Fill leading days from the previous month
      for (let i = 1; i < dayOfWeek; i++) {
        week.push(null) // Null for previous month's days
      }

      // Fill the current month days
      for (let day = 1; day <= daysInMonth; day++) {
        week.push(day)
        if (week.length === 7) {
          weeks.push(week)
          week = []
        }
      }

      // Fill trailing days for the next month
      while (week.length < 7) {
        week.push(null)
      }
      weeks.push(week)

      this.weeks = weeks // Update the weeks data
    },
    async getRoomInventory() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/room/get-room-inventory`,
          {
            roomId: this.currentRoom.room_id
          },
          {
            withCredentials: true
          }
        )

        this.roomInventory = response.data
        this.mapCalendarToRoomInventory() // map from the calendar to the room inventory
      } catch (error) {
        errorHandler(error);
      }
    },
    async getAllRooms() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/room/get-all-rooms`,
          {
            hotelId: this.getCurrentManagingHotelId
          },
          {
            withCredentials: true
          }
        )
        this.rooms = response.data
        if (this.rooms.length > 0) {
          this.currentRoom = this.rooms[0]
        }
      } catch (error) {
        errorHandler(error);
      }
    },
    mapCalendarToRoomInventory() {
      this.roomInventory.forEach((roomInventory) => {
        // extract month and date from date string '2024-11-26T17:00:00.000Z'
        const date = roomInventory.date.split('T')[0]
        const month = parseInt(date.split('-')[1])
        const day = parseInt(date.split('-')[2])

        if (month === this.currentMonth) {
          this.weeks.forEach((week, weekIndex) => {
            week.forEach((cell, dayIndex) => {
              if (cell === day) {
                this.roomInventoryMap[weekIndex][dayIndex] = roomInventory
              }
            })
          })
        }
      })
    },
    // Start dragging operation
    startDrag(weekIndex, dayIndex) {
      this.dragging = true
      this.startCell = { weekIndex, dayIndex }
      this.selectedCells = [{ weekIndex, dayIndex }]
    },
    // Handle dragging over cells
    dragOver(weekIndex, dayIndex) {
      if (this.dragging) {
        this.selectedCells = this.getSelectedRange(this.startCell, {
          weekIndex,
          dayIndex
        })
      }
    },
    // Stop dragging operation
    stopDrag() {
      this.dragging = false
      this.startCell = null
    },
    getSelectedRange(start, end) {
      const selected = []
      const [startWeek, startDay] = [start.weekIndex, start.dayIndex]
      const [endWeek, endDay] = [end.weekIndex, end.dayIndex]

      if (startWeek === endWeek) {
        // Same week drag
        const minDay = Math.min(startDay, endDay)
        const maxDay = Math.max(startDay, endDay)
        for (let day = minDay; day <= maxDay; day++) {
          selected.push({ weekIndex: startWeek, dayIndex: day })
        }
      } else if (startWeek < endWeek) {
        // Multi-week drag to the right
        for (let week = startWeek; week <= endWeek; week++) {
          const startCol = week === startWeek ? startDay : 0
          const endCol = week === endWeek ? endDay : 6
          for (let day = startCol; day <= endCol; day++) {
            selected.push({ weekIndex: week, dayIndex: day })
          }
        }
      } else {
        // Multi-week drag to the left
        for (let week = startWeek; week >= endWeek; week--) {
          const startCol = week === startWeek ? startDay : 6
          const endCol = week === endWeek ? endDay : 0
          for (let day = startCol; day >= endCol; day--) {
            selected.push({ weekIndex: week, dayIndex: day })
          }
        }
      }
      return selected
    },
    isSelected(weekIndex, dayIndex) {
      return this.selectedCells.some(
        (cell) => cell.weekIndex === weekIndex && cell.dayIndex === dayIndex
      )
    },
    // Select a single cell by clicking
    selectSingleCell(weekIndex, dayIndex) {
      // Check if the clicked cell is outside the current selection
      const isOutsideSelection = !this.selectedCells.some(
        (cell) => cell.weekIndex === weekIndex && cell.dayIndex === dayIndex
      )

      if (isOutsideSelection) {
        // Clear previous selection and select only the clicked cell
        this.selectedCells = [{ weekIndex, dayIndex }]
      }
    },
    async updateRoomInventory() {
      try {
        this.isLoading = true
        for (let i = 0; i < this.selectedCells.length; i++) {
          const cell = this.selectedCells[i]
          // update room status
          if (this.newRoomStatus) {
            this.roomInventoryMap[cell.weekIndex][cell.dayIndex].status = this.newRoomStatus
          }
          // update price
          if (this.newPrice) {
            this.roomInventoryMap[cell.weekIndex][cell.dayIndex].price_per_night = this.newPrice
          }
          // update room reserved
          if (this.numberOfLeftRoom) {
            this.roomInventoryMap[cell.weekIndex][cell.dayIndex].total_reserved =
              this.numberOfLeftRoom
          }
        }

        const newRoomInventory = []
        for (let i = 0; i < this.selectedCells.length; i++) {
          const cell = this.selectedCells[i]
          newRoomInventory.push(this.roomInventoryMap[cell.weekIndex][cell.dayIndex])
        }

        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/admin/room/update-room-inventory`,
          {
            newRoomInventory: newRoomInventory
          },
          {
            withCredentials: true
          }
        )

        if (response.data.success) {
          this.toast.success('Cập nhật thành công')
          this.enableEdit = false
        }
      } catch (error) {
        errorHandler(error);
      }finally {
        this.isLoading = false
      }
    }
  },
  async mounted() {
    // get all rooms
    await this.getAllRooms()

    const today = new Date()
    this.currentMonth = today.getMonth() + 1
    this.currentYear = today.getFullYear()
    this.generateCalendar(this.currentYear, this.currentMonth) // Call explicitly
  }
}
</script>
<template>
  <div class="availability-calendar-container">
    <DashboardMenu />
    <div class="main-wrapper">
      <AdminHeader />

      <div class="main-content">
        <div class="header">
          <div style="display: flex; gap: 10px; align-items: center">
            <select class="room-select" v-model="currentRoom">
              <option v-for="(room, index) in rooms" :key="room.room_id" :value="room">
                {{ room.room_name }}
              </option>
            </select>
            <div style="display: flex; align-items: center; gap: 10px">
              <select class="month-select" v-model="currentMonth">
                <option v-for="month in monthsInYear" :key="month.value" :value="month.value">
                  {{ month.text }} {{ currentYear }}
                </option>
              </select>
              <div class="nav-buttons">
                <button class="nav-btn"><i class="fas fa-chevron-left"></i></button>
                <button class="nav-btn"><i class="fas fa-chevron-right"></i></button>
              </div>
            </div>
          </div>
          <div class="controls">
            <select class="control-btn">
              <option>Monthly view</option>
            </select>
          </div>
        </div>
        <div class="calendar-container">
          <div class="calendar-grid">
            <!-- Header Row -->
            <div class="calendar-row calendar-header">
              <div v-for="day in days" :key="day" class="calendar-cell">
                {{ day }}
              </div>
            </div>
            <!-- Weeks Rows -->
            <div v-for="(week, weekIndex) in weeks" :key="weekIndex" class="calendar-row">
              <div
                v-for="(day, dayIndex) in week"
                :key="`${weekIndex}-${dayIndex}`"
                class="calendar-cell"
                :class="{
                  selected: isSelected(weekIndex, dayIndex),
                  'close-cell': roomInventoryMap[weekIndex][dayIndex].status === 'close'
                }"
                @click="selectSingleCell(weekIndex, dayIndex)"
                @mousedown="startDrag(weekIndex, dayIndex)"
                @mousemove="dragOver(weekIndex, dayIndex)"
                @mouseup="stopDrag"
              >
                <div class="date-number" v-if="day">{{ day }}</div>
                <div class="number-available" style="font-size: 10px" v-if="day">
                  {{
                    roomInventoryMap[weekIndex][dayIndex].total_inventory -
                    roomInventoryMap[weekIndex][dayIndex].total_reserved
                  }}
                  left to sell
                </div>
                <div class="room-price" v-if="day && currentRoom">
                  VND
                  {{
                    parseInt(roomInventoryMap[weekIndex][dayIndex].price_per_night).toLocaleString(
                      'vi-VN'
                    )
                  }}
                </div>
              </div>
            </div>
          </div>
          <div class="settings-panel">
            <div class="panel-section">
              <h3>Start date</h3>
              <input disabled type="text" class="date-input" id="start-date" v-model="startDate" />
              <h3>End date</h3>
              <input disabled type="text" class="date-input" id="end-date" v-model="endDate" />
            </div>
            <div class="panel-section">
              <h3>Open or close for bookings</h3>
              <div class="radio-group">
                <label>
                  <input
                    type="radio"
                    name="status"
                    :disabled="!enableEdit"
                    v-model="newRoomStatus"
                    value="open"
                  />
                  Open
                </label>
                <label>
                  <input
                    type="radio"
                    name="status"
                    :disabled="!enableEdit"
                    v-model="newRoomStatus"
                    value="close"
                  />
                  Closed
                </label>
              </div>
              <h3>How many left rooms to sell</h3>
              <input
                :disabled="!enableEdit"
                type="text"
                class="price-input"
                v-model="numberOfLeftRoom"
              />
              <div class="currency">Total price (VND)</div>
              <input
                disabled
                type="text"
                class="price-input"
                :value="price.toLocaleString('vi-VN')"
              />
              <div class="currency">Price for one days (VND)</div>
              <input :disabled="!enableEdit" type="text" class="price-input" v-model="newPrice" />
              <div class="action-button-container">
                <button
                  class="edit-btn"
                  @click="enableEdit = true"
                  :disabled="enableEdit"
                  :class="{ 'disabled-button': enableEdit }"
                >
                  Edit
                </button>
                <button
                  class="save-btn"
                  :disabled="!enableEdit"
                  :class="{ 'disabled-button': !enableEdit }"
                  @click="updateRoomInventory"
                >
                  {{ isLoading ? 'Saving...' : 'Save' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.availability-calendar-container {
  display: flex;
}
/* Main Content Styles */
.main-wrapper {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}
.main-content {
  flex: 1;
  padding: 20px;
  padding-bottom: 0px !important;
}

.room-select,
.month-select {
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: white;
  color: #333;
  font-size: 14px;
  width: 200px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%23333' d='M7 10l5 5 5-5H7z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  cursor: pointer;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 10px;
}

.controls {
  display: flex;
  gap: 10px;
}

.control-btn {
  padding: 8px 16px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background-color: white;
  color: #333;
  cursor: pointer;
  font-size: 14px;
}

.calendar-container {
  /* background-color: white; */
  border-radius: 4px;
  border: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
}

.calendar-grid {
  /* width: 100%; */
  border-collapse: collapse;
}

.calendar-row {
  display: table-row;
}

.calendar-header .calendar-cell {
  padding: 15px;
  color: #666;
  font-weight: normal;
  height: auto;
  background-color: white;
  border-bottom: 1px solid #e0e0e0;
}

.prev-month {
  color: #bbb;
}
.next-month {
  color: #bbb;
}

.settings-panel {
  /* position: fixed; */
  right: 20px;
  top: 80px;
  width: 300px;
}

.panel-section {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 15px;
}

.panel-section h3 {
  color: #333;
  font-size: 14px;
  font-weight: normal;
  margin-bottom: 10px;
}

.date-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin: 5px 0;
  font-size: 14px;
  color: #333;
  background-color: white;
}

.radio-group {
  display: flex;
  gap: 20px;
  margin: 10px 0;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #666;
  font-size: 14px;
}

.price-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  margin: 5px 0;
  font-size: 14px;
  background-color: #f8f9fa;
}

.section-header {
  color: #666;
  font-size: 14px;
  font-weight: normal;
  margin: 15px 0 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
}

.section-header::before {
  content: '▼';
  font-size: 10px;
}

.currency {
  font-size: 14px;
  margin-bottom: 5px;
}
/* Your existing CSS code */
.calendar-row {
  display: table-row;
}

.calendar-cell {
  position: relative;
  display: table-cell;
  width: 14.28%;
  padding: 20px 15px;
  text-align: left;
  border: 2px solid #f0f0f0;
  color: #6d6d6d;
  background-color: rgb(255, 255, 255);
  font-size: 15px;
  height: 105px;
  vertical-align: text-top;
  width: 95px;
  cursor: pointer;
  -webkit-user-select: none; /* Safari */
  -ms-user-select: none; /* IE 10 and IE 11 */
  user-select: none; /* Standard syntax */
}

.calendar-cell:hover {
  background-color: #f2f2f2;
}

.calendar-header .calendar-cell {
  padding: 12px;
  color: #000000;
  font-weight: normal;
  height: auto;
  background-color: rgb(255, 255, 255);
  border-bottom: 1px solid #e0e0e0;
}

.action-button-container {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.action-button-container button {
  width: 100%;
  height: 40px;
  border-radius: 5px;
  border: none;
  background-color: #1e64ce;
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.selected {
  border: #1e64ce solid 3px;
}
.date-number {
  font-size: 15px;
  top: 5px;
  left: 5px;
  position: absolute;
}
.number-available {
  font-size: 10px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  position: absolute;
}
.room-price {
  /* width: 150%; */
  font-size: 13px;
  bottom: 5px;
  position: absolute;
}

.disabled-button {
  background-color: #ccc !important;
}

.close-cell {
  background-color: #ff8f8f;
}

.close-cell:hover {
  background-color: #ff5f5f;
}
</style>
