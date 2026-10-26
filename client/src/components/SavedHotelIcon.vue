<script>
  import { mapGetters } from 'vuex';
  import { ElDialog } from 'element-plus';
  import sectionFeedback from '@/mixins/sectionFeedback';
  import { UserService } from '@/services/user.service';

  export default {
    mixins: [sectionFeedback],
    components: { ElDialog },
    props: {
      hotelId: {
        type: String,
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
        favoriteStatusError: false,
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
    mounted() {
      if (!this.useInitialFavoriteStatus) {
        this.checkFavoriteHotel();
      }
    },
    methods: {
      async saveFavoriteHotel() {
        this.clearFeedback();
        try {
          if (this.isUserAuthenticated) {
            if (this.isFavorite) {
              await this.deleteFavoriteHotel();
            } else {
              await UserService.addFavoriteHotel(this.hotelId);
              this.isFavorite = true;
              this.favoriteStatusError = false;
            }
          } else {
            this.showError(this.$t('savedHotel.loginRequired'));
          }
        } catch (error) {
          if (error?.response?.status === 409) {
            this.isFavorite = true;
            return;
          }
          this.showError();
        }
      },
      async checkFavoriteHotel() {
        this.favoriteStatusError = false;
        if (!this.isUserAuthenticated) return;

        try {
          const response = await UserService.isFavoriteHotel(this.hotelId);
          this.isFavorite = response?.data?.isFavorite ?? false;
        } catch (error) {
          this.favoriteStatusError = true;
        }
      },
      async deleteFavoriteHotel() {
        try {
          await UserService.removeFavoriteHotel(this.hotelId);
          this.isFavorite = false;
          this.favoriteStatusError = false;
        } catch (error) {
          this.showError();
        }
      },
    },
  };
</script>
<template>
  <button
    class="favorite-button"
    type="button"
    :aria-label="$t(isFavorite ? 'savedHotel.remove' : 'savedHotel.save')"
    :aria-pressed="isFavorite"
    @click.stop="saveFavoriteHotel()"
  >
    <i v-if="isFavorite" class="fa-solid fa-heart" style="color: #e70d0d" aria-hidden="true"></i>
    <i v-else class="fa-regular fa-heart" aria-hidden="true"></i>
  </button>
  <span v-if="favoriteStatusError" class="favorite-status" role="alert">
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6m0 3v1" />
    </svg>
    {{ $t('feedback.favoriteUnavailable') }}
    <button type="button" @click.stop="checkFavoriteHotel">{{ $t('guest.retry') }}</button>
  </span>
  <ElDialog
    :model-value="Boolean(feedback)"
    :title="$t('feedback.infoTitle')"
    width="min(440px, 92vw)"
    append-to-body
    @close="clearFeedback"
  >
    <FeedbackMessage v-if="feedback" v-bind="feedback" @dismiss="clearFeedback" />
  </ElDialog>
</template>
<style scoped>
  .favorite-status {
    display: flex;
    align-items: center;
    gap: 6px;
    position: absolute;
    top: 48px;
    right: 10px;
    left: 10px;
    z-index: 2;
    padding: 8px;
    background: #fff8f5;
    border-radius: 8px;
    color: #853e2b;
    font-size: 12px;
  }
  .favorite-status button {
    background: transparent;
    border: 0;
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
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
