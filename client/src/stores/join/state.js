export default {
  joinFormData: {
    // form 1
    streetName: null,
    city: null,

    // form 2
    coordinates: {
      latitude: null,
      longitude: null
    },

    // form 4
    hotelName: null,
    rating: null,

    // form 5
    checkInFrom: null,
    checkInTo: null,
    checkOutFrom: null,
    checkOutTo: null,

    // form 6
    roomDetails: {
      roomType: null,
      numberOfRooms: 0,
      numberOfGuests: 0
    },
    bedOptions: [
      {
        index: 0,
        name: 'join.form.bedSingle',
        width: '90 - 130',
        quantity: 0
      },
      {
        index: 1,
        name: 'join.form.bedDouble',
        width: '131 - 150',
        quantity: 0
      },
      {
        index: 2,
        name: 'join.form.bedKing',
        width: '151 - 180',
        quantity: 0
      },
      {
        index: 3,
        name: 'join.form.bedSuperKing',
        width: '181 - 210',
        quantity: 0
      }
    ]
  },
  uploadImage: {
    imagePreviews: [], // Array to store preview URLs
    imageFiles: []
  }
}
