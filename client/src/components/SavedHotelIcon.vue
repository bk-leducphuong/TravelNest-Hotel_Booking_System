<script>
  import { mapGetters } from 'vuex';
  import { useToast } from 'vue-toastification';
  import { UserService } from '@/services/user.service';

  export default {
    setup() {
      const toast = useToast();
      return { toast };
    },
    props: {
      hotelId: {
        type: Number,
        required: true,
      },
      initialIsFavorite: {
        type: Boolean,
        default: false,
      },
      useInitialFavoriteStatus: {
        type: Boolean,
        default: false,
      },
    },
    data() {
      return {
        isFavorite: this.initialIsFavorite,
      };
    },
    computed: {
      ...mapGetters('auth', ['isUserAuthenticated']),
    },
    watch: {
      initialIsFavorite(value) {
        if (this.useInitialFavoriteStatus) {
          this.isFavorite = value;
        }
      },
    },
    methods: {
      async saveFavoriteHotel() {
        try {
          if (this.isUserAuthenticated) {
            if (this.isFavorite) {
              await this.deleteFavoriteHotel();
            } else {
              await UserService.addFavoriteHotel(this.hotelId);
              this.isFavorite = true;
            }
          } else {
            this.toast.error('Vui lòng đăng nhập để thêm vào danh sách yêu thích');
          }
        } catch (error) {
          if (error?.response?.status === 409) {
            this.isFavorite = true;
            return;
          }
          console.error(error);
        }
      },
      async checkFavoriteHotel() {
        if (this.isUserAuthenticated) {
          // try {
          //   const response = await UserService.isFavoriteHotel(this.hotelId)
          //   this.isFavorite = response?.data?.isFavorite ?? false
          // } catch (error) {
          //   console.error(error)
          // }
        }
      },
      async deleteFavoriteHotel() {
        try {
          await UserService.removeFavoriteHotel(this.hotelId);
          this.isFavorite = false;
        } catch (error) {
          console.error(error);
        }
      },
    },
    mounted() {
      if (!this.useInitialFavoriteStatus) {
        this.checkFavoriteHotel();
      }
    },
  };
</script>
<template>
  <button class="favorite-button" @click.stop="saveFavoriteHotel()">
    <i class="fa-solid fa-heart" style="color: #e70d0d" v-if="isFavorite"></i>
    <i class="fa-regular fa-heart" v-else></i>
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
