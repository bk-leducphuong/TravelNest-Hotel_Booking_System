<script>
export default {
   
}
</script>
<template>
  <div class="new-user-popup-overlay">
    <div class="new-user-popup">
      <i class="fa-solid fa-xmark close-button" @click="$emit('close')"></i>
      <h2>Genius</h2>
      <p>Sign in to <strong>save 10% or more</strong> with a free TravelNest membership</p>
      <button class="sign-in-button" @click="$router.push('/login')">Sign in or register</button>
    </div>
  </div>
</template>

<style scoped>
/* Modal background */
.new-user-popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

/* Modal content */
.new-user-popup {
  background-color: white;
  border-radius: 10px;
  width: 400px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  text-align: center;
  position: relative;
  z-index: 1001;
}

.new-user-popup h2 {
  font-size: 24px;
  margin: 0;
  color: #0071c2;
}

.new-user-popup p {
  margin: 10px 0;
  font-size: 16px;
  color: #333;
}

.sign-in-button {
  background-color: #0071c2;
  color: white;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  font-weight: bold;
  margin-top: 15px;
  width: 100%;
}

.new-user-popup button:hover {
  background-color: #005fa3;
}

.close-button {
  position: absolute;
  top: 10px;
  right: 10px;
  background: none;
  border: none;
  font-size: 25px;
  cursor: pointer;
}

.close-button:hover {
  color: #999;
}
</style>
