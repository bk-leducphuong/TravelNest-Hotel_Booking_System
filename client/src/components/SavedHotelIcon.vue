<script>
import axios from 'axios'
import { mapGetters } from 'vuex'
import { useToast } from 'vue-toastification'
export default {
  setup() {
    const toast = useToast()
    return {toast}
  },
  props: {
    hotelId: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      isFavorite: false
    }
  },
  computed: {
    ...mapGetters('auth', ['isUserAuthenticated'])
  },
  mounted() {
    this.checkFavoriteHotel()
  },
  methods: {
    async saveFavoriteHotel() {
      try {
        if (this.isUserAuthenticated) {
          if (this.isFavorite) {
            this.deleteFavoriteHotel()
          } else {
            const response = await axios.post(
              `${import.meta.env.VITE_SERVER_HOST}/api/user/favorite-hotels/set-favorite-hotel`,
              {
                hotelId: this.hotelId
              },
              {
                withCredentials: true
              }
            )
            if (response.data.success) {
              this.isFavorite = true
            }
          }
        }else {
          this.toast.error('Vui lòng đăng nhập để thêm vào danh sách yêu thích')
        }
      } catch (error) {
        console.error(error)
      }
    },
    async checkFavoriteHotel() {
      if (this.isUserAuthenticated) {
        try {
          const response = await axios.post(
            `${import.meta.env.VITE_SERVER_HOST}/api/user/favorite-hotels/check-favorite-hotel`,
            {
              hotelId: this.hotelId
            },
            {
              withCredentials: true
            }
          )
          if (response.data.isFavorite) {
            this.isFavorite = true
          } else {
            this.isFavorite = false
          }
        } catch (error) {
          console.error(error)
        }
      }
    },
    async deleteFavoriteHotel() {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_HOST}/api/user/favorite-hotels/delete-favorite-hotel`,
          {
            hotelId: this.hotelId
          },
          {
            withCredentials: true
          }
        )
        if (response.data.success) {
          this.isFavorite = false
        }
      } catch (error) {
        console.error(error)
      }
    }
  }
}
</script>
<template>
  <button class="favorite-button" @click.stop="saveFavoriteHotel()">
    <i v-if="isFavorite" class="fa-solid fa-heart" style="color: #e70d0d"></i>
    <i v-else class="fa-regular fa-heart"></i>
  </button>
</template>
<style scoped>
.favorite-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition:
    background-color 0.3s,
    transform 0.3s;
  z-index: 2;
}

.favorite-button:hover {
  background: #f8f8f8;
  transform: scale(1.1);
}

.favorite-button.active {
  color: red;
}
</style>
