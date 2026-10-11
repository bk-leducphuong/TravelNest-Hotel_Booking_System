<script>
export default {
  name: 'LanguageSwitch',
  emits: ['close-language-popup'],
  methods: {
    chooseLanguage(language) {
      localStorage.setItem('language', language)
      this.$emit('close-language-popup')
      window.location.reload()
    },
  },
}
</script>
<template>
  <!-- Popup Container -->
  <div id="language-popup" class="popup">
    <div class="popup-content">
      <div class="popup-header">
        <h2>{{ $t('language.selectTitle') }}</h2>
        <button class="close-popup-btn" @click="this.$emit('close-language-popup')">✖</button>
      </div>
      <p class="recommended-text">{{ $t('language.recommended') }}</p>
      <div class="languages">
        <div class="language" @click="chooseLanguage('en')">
          <img src="https://flagcdn.com/w40/us.png" :alt="$t('language.english')" />
          <span>{{ $t('language.english') }}</span>
        </div>
        <div class="language" @click="chooseLanguage('vi')">
          <img src="https://flagcdn.com/w40/vn.png" :alt="$t('language.vietnamese')" />
          <span>{{ $t('language.vietnamese') }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
/* Popup Styles */
.popup {
  display: flex;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.popup-content {
  background: #fff;
  width: 500px;
  border-radius: 10px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.popup-header h2 {
  font-size: 18px;
}

.close-popup-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
}

.recommended-text {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
}

.languages {
  display: flex;
  flex-wrap: wrap;
  justify-content: left;
  gap: 15px;
}

.language {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: transform 0.3s;
  padding: 5px;
  border-radius: 3px;
}

.language img {
  width: 30px;
  height: 30px;
  border-radius: 50%;
}

.language span {
  font-size: 14px;
}

.language:hover {
  background-color: #dcdcdc;
}

</style>
