// store/book/actions.js
import { HotelService } from '@/services/hotel.service'

export default {
  booking({ commit }, bookingInfor) {
    commit('setBookingInfor', bookingInfor)
  },
  // check if room is available or not before booking the room
  async checkRoomAvailability({ state }) {
    try {
      const bookingInfor = state.bookingInfor
      const hotelId = bookingInfor?.hotel?.hotel_id

      if (!hotelId || !bookingInfor?.selectedRooms?.length) {
        return false
      }

      const params = {
        checkIn: bookingInfor.checkInDate,
        checkOut: bookingInfor.checkOutDate,
        adults: bookingInfor.numberOfGuests,
        children: 0,
        rooms: Math.max(...bookingInfor.selectedRooms.map((room) => Number(room.roomQuantity)))
      }

      const response = await HotelService.checkRoomAvailability(hotelId, params)
      const availableRooms = response.data?.availability?.available_rooms || []

      return bookingInfor.selectedRooms.every((selectedRoom) => {
        const room = availableRooms.find(
          (availableRoom) => availableRoom.room_id === selectedRoom.room_id
        )
        return room && Number(room.available_rooms) >= Number(selectedRoom.roomQuantity)
      })
    } catch (error) {
      console.error(error)
      return false // Assume not available on error
    }
  }
}
