<script>
import axios from 'axios';
import { useToast } from 'vue-toastification'
export default {
  setup() {
    const toast = useToast()
    return { toast }
  },
  data() {
    return {
      name: '',
      firstName: '',
      lastName: '',
      displayName: '',
      email: '',
      phoneNumber: '',
      dateOfBirth: '',
      address: '',
      country: '',
      city: '',
      postalCode: '',
      nationality: '',
      gender: '',
      avatar: '',
      avatarFile: '',
      uploadAvatarImage: '',
      isNameEdit: false,
      isDisplayNameEdit: false,
      isEmailEdit: false,
      isPhoneNumberEdit: false,
      isDateOfBirthEdit: false,
      isAddressEdit: false,
      isNationalityEdit: false,
      isGenderEdit: false,
      isAvatarEdit: false
    }
  },
  methods: {
    // get user information
    async getUserInfo() {
      const response = await axios.get(`${import.meta.env.VITE_SERVER_HOST}/api/user/get-user-information`, {
        withCredentials: true
      })
      const user = response.data.user
      this.name = user.full_name
      this.displayName = user.username
      this.email = user.email
      this.phoneNumber = user.phone_number
      this.dateOfBirth = user.date_of_birth
      this.address = user.address
      this.nationality = user.nationality
      this.gender = user.gender
      this.avatar = user.profile_picture_url
      this.country = user.country
      //...
    },
    async editName() {
      const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/user/edit-name`, {
        name: this.firstName + ' ' + this.lastName
      }, {
        withCredentials: true
      })
      if (response.data.success) {
        this.toast.success('Đã cập nhật thông tin')
        this.isNameEdit = false
      }
    },
    async editDisplayName() {
      const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/user/edit-display-name`, {
        displayName: this.displayName
      }, {
        withCredentials: true
      })
      if (response.data.success) {
        this.toast.success('Đã cập nhật thông tin')
        this.isDisplayNameEdit = false
      }
    },
    async editEmail() {
      const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/user/edit-email`, {
        email: this.email
      }, {
        withCredentials: true
      })
      if (response.data.success) {
        this.toast.success('Đã cập nhật thông tin')
        this.isEmailEdit = false
      }
    },
    async editPhoneNumber() {
      const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/user/edit-phone-number`, {
        phoneNumber: this.phoneNumber
      }, {
        withCredentials: true
      })
      if (response.data.success) {
        this.toast.success('Đã cập nhật thông tin')
        this.isPhoneNumberEdit = false
      }
    },
    async editDateOfBirth() {
      const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/user/edit-date-of-birth`, {
        dateOfBirth: this.dateOfBirth
      }, {
        withCredentials: true
      })
      if (response.data.success) {
        this.toast.success('Đã cập nhật thông tin')
        this.isDateOfBirthEdit = false
      }
    },
    async editAddress() {
      const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/user/edit-address`, {
        address: this.address + ', ' + this.city
      }, {
        withCredentials: true
      })

      const response2 = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/user/edit-country`, {
        country: this.country
      }, {
        withCredentials: true
      })
      if (response.data.success && response2.data.success) {
        this.toast.success('Đã cập nhật thông tin')
        this.isAddressEdit = false
      }
    },
    async editNationality() {
      const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/user/edit-nationality`, {
        nationality: this.nationality
      }, {
        withCredentials: true
      })
      if (response.data.success) {
        this.toast.success('Đã cập nhật thông tin')
        this.isNationalityEdit = false
      }
    },
    async editGender() {
      const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/user/edit-gender`, {
        gender: this.gender
      }, {
        withCredentials: true
      })
      if (response.data.success) {
        this.toast.success('Đã cập nhật thông tin')
        this.isGenderEdit = false
      }
    },
    async editAvatar() {
      const formData = new FormData();
      formData.append('avatar', this.avatarFile);
    const response = await axios.post(`${import.meta.env.VITE_SERVER_HOST}/api/user/edit-avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        withCredentials: true
      })
      if (response.data.success) {
        this.toast.success('Đã cập nhật thông tin')
        this.closeAvatarUploadPopup()
      }
    },
    handleFileUpload(event) {
      this.avatarFile = event.target.files[0];

      const reader = new FileReader();
      reader.onload = (e) => {
        this.uploadAvatarImage = e.target.result;
      };
      reader.readAsDataURL(this.avatarFile);
    },
    closeAvatarUploadPopup() {
      this.isAvatarEdit = false;
      this.avatarFile = '';
      this.uploadAvatarImage = '';
    }
  },
  async mounted() {
    await this.getUserInfo()
  }
}
</script>
<template>
  <!-- avatar uploading popup -->
  <!-- Overlay -->
  <div class="popup-overlay" id="popupOverlay" v-if="isAvatarEdit">
    <!-- Popup Content -->
    <div class="popup-content">
      <div class="popup-header">
        <span>Chọn hình ảnh để tải lên</span>
        <button class="close-btn" @click="closeAvatarUploadPopup">×</button>
      </div>
      <div class="popup-body">
        <div class="avatar-circle">
          <img :src="uploadAvatarImage" v-if="uploadAvatarImage" alt="avatar" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;"/>
          <img v-if="!uploadAvatarImage" :src="avatar" alt="avatar" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;"/>
        </div>
        <label for="fileInput" class="upload-btn">Chọn tập tin</label>
        <input v-on:change="handleFileUpload" type="file" id="fileInput" class="file-input" accept="image/*" />
      </div>
      <button class="save-btn" :disabled="!avatarFile" id="saveButton" @click="editAvatar">Lưu</button>
    </div>
  </div>
  <!-- Main Content Container -->
  <!-- Normal mode-->
  <div class="section1" style="width: 70%">
    <div class="personal-details-container">
      <!-- Personal Details-->
      <div class="details-section" style="margin-top: 0px !important">
        <div style="display: flex; justify-content: space-between">
          <span style="width: 70%">
            <h1>Personal details</h1>
            <p>Update your information and find out how it's used.</p>
          </span>
          <div
            style="
              width: 100%;
              width: 100px;
              height: 100px;
              display: flex;
              justify-content: center;
              align-items: center;
              border-radius: 100px;
              cursor: pointer;
              border: 3px solid #4285f4;
            "
            @click="isAvatarEdit = true"
          >
            <img :src="this.avatar" alt="avatar" style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover;"/>
        </div>
        </div>
        <!-- name  -->
        <div class="detail-item">
          <label for="name" style="width: 20%">Name</label>
          <div class="container1" v-if="isNameEdit">
            <div class="edit-container">
              <div style="width: 50%; padding-right: 30px">
                <P1>First name(s)</P1><br /><br />
                <input type="text" v-model="firstName" />
              </div>
              <div style="width: 50%; padding-right: 30px">
                <P1>Last name(s)</P1><br /><br />
                <input type="text" v-model="lastName" />
              </div>
            </div>
            <div class="button-container">
              <button class="cancel-button" @click="isNameEdit = false">Cancel</button>
              <br />
              <br />
              <button class="edit-button" @click="editName">Save</button>
            </div>
          </div>
          <div class="display-container" v-if="!isNameEdit">
            <div class="value">{{ name || "Choose your name" }}</div>
            <button class="edit-button" @click="isNameEdit = true">Edit</button>
          </div>
        </div>
        <!-- display name -->
        <div class="detail-item">
          <label for="display-name" style="width: 20%">Display name</label>
          <div class="container1" v-if="isDisplayNameEdit">
            <div class="edit-container">
              <div style="width: 300px; padding-right: 30px">
                <P1>Display name</P1><br /><br />
                <input type="text" style="width: 100%" v-model="displayName" />
              </div>
            </div>
            <div class="button-container">
              <button class="cancel-button" @click="isDisplayNameEdit = false">Cancel</button
              ><br /><br />
              <button class="edit-button"  @click="editDisplayName">Save</button>
            </div>
          </div>
          <div class="display-container" v-if="!isDisplayNameEdit">
            <div class="value">{{ displayName || "Choose a display name" }}</div>
            <button class="edit-button" @click="isDisplayNameEdit = true">Edit</button>
          </div>
        </div>
        <!-- email -->
        <div class="detail-item">
          <label for="email" style="width: 20%">Email address</label>
          <div class="container1" v-if="isEmailEdit">
            <div class="edit-container">
              <div style="width: 430px; padding-right: 30px">
                <P1>Email address</P1><br /><br />
                <input type="text" style="width: 100%" v-model="email" />
                <p>
                  We'll send a verification link to your new email address. Please check your inbox.
                </p>
              </div>
            </div>
            <div class="button-container">
              <button class="cancel-button" @click="isEmailEdit = false">Cancel</button><br /><br />
              <button class="edit-button" @click="editEmail">Save</button>
            </div>
          </div>
          <div class="display-container" v-if="!isEmailEdit">
            <div class="value">{{ this.email || "youremail@gmail.com" }} <span class="verified">Verified</span></div>
            <button class="edit-button" @click="isEmailEdit = true">Edit</button>
          </div>
        </div>
        <!-- phone number  -->
        <div class="detail-item">
          <label for="phoneNumber" style="width: 20%">Phone number</label>
          <div class="container1" v-if="isPhoneNumberEdit">
            <div class="edit-container">
              <div style="width: 300px; padding-right: 30px">
                <P1>Phone number</P1><br /><br />
                <input type="text" style="width: 100%" v-model="phoneNumber" />
              </div>
            </div>
            <div class="button-container">
              <button class="cancel-button" @click="isPhoneNumberEdit = false">Cancel</button>
              <br /><br />
              <button class="edit-button" @click="editPhoneNumber">Save</button>
            </div>
          </div>
          <div class="display-container" v-if="!isPhoneNumberEdit">
            <div class="value">{{ phoneNumber || "Your phone number" }}</div>
            <button class="edit-button" @click="isPhoneNumberEdit = true">Edit</button>
          </div>
        </div>
        <!-- date of birth  -->
        <div class="detail-item">
          <label for="dob" style="width: 20%">Date of birth</label>
          <div class="container1" v-if="isDateOfBirthEdit">
            <div class="edit-container">
              <div style="width: 430px; padding-right: 30px">
                <P1>Date of birth</P1><br /><br />
                <input type="date" v-model="dateOfBirth" />
              </div>
            </div>
            <div class="button-container">
              <button class="cancel-button" @click="isDateOfBirthEdit = false">Cancel</button
              ><br /><br />
              <button class="edit-button" @click="editDateOfBirth">Save</button>
            </div>
          </div>
          <div class="display-container" v-if="!isDateOfBirthEdit">
            <div class="value">{{ new Date(dateOfBirth).toLocaleDateString('vi-VN') || "Enter your date of birth" }}</div>
            <button class="edit-button" @click="isDateOfBirthEdit = true">Edit</button>
          </div>
        </div>
        <!-- nationality  -->
        <div class="detail-item">
          <label for="nationality" style="width: 20%">Nationality</label>
          <div class="container1" v-if="isNationalityEdit">
            <div class="edit-container">
              <div style="width: 300px; padding-right: 30px">
                <P1>Nationality</P1><br /><br />
                <input type="text" style="width: 100%" v-model="nationality" />
              </div>
            </div>
            <div class="button-container">
              <button class="cancel-button" @click="isNationalityEdit = false">Cancel</button
              ><br /><br />
              <button class="edit-button" @click="editNationality">Save</button>
            </div>
          </div>
          <div class="display-container" v-if="!isNationalityEdit">
            <div class="value">{{ nationality || "Select your nationality" }}</div>
            <button class="edit-button" @click="isNationalityEdit = true">Edit</button>
          </div>
        </div>
        <!-- gender  -->
        <div class="detail-item">
          <label for="sex" style="width: 20%">Gender</label>
          <div class="container1" v-if="isGenderEdit">
            <div class="edit-container">
              <div style="width: 300px; padding-right: 30px">
                <P1>Gender</P1><br /><br />
                <select
                  style="
                    border-radius: 5px;
                    border-color: #4285f4;
                    border-style: solid;
                    border-width: 1px;
                    width: 100px;
                    height: 29px;
                  "
                  v-model="gender"
                >
                  <option value="male">Male</option>
                  /
                  <option value="female">Female</option>
                  /
                  /
                </select>
              </div>
            </div>
            <div class="button-container">
              <button class="cancel-button" @click="isGenderEdit = false">Cancel</button>
              <br /><br />
              <button class="edit-button" @click="editGender">Save</button>
            </div>
          </div>
          <div class="display-container" v-if="!isGenderEdit">
            <div class="value">{{ gender || "Select your gender" }}</div>
            <button class="edit-button" @click="isGenderEdit = true">Edit</button>
          </div>
        </div>
        <!-- address  -->
        <div class="detail-item">
          <label for="address" style="width: 20%">Address</label>
          <div class="container1" v-if="isAddressEdit">
            <div class="edit-container" style="flex-direction: column">
              <div style="padding-right: 30px">
                <P1>National</P1><br />
                <input type="text" style="width: 100%" placeholder="Chọn quốc gia nơi bạn sống" v-model="country"/>
              </div>
              <div style="padding-right: 30px">
                <P1>Address</P1><br />
                <input type="text" placeholder="Tên đường và số nhà/căn hộ" v-model="address" style="width: 100%" />
              </div>
              <div style="display: flex; justify-content: space-between">
                <div style="padding-right: 30px">
                  <P1>Town/City</P1><br />
                  <input type="text" style="width: 100%" v-model="city"/>
                </div>
                <div style="padding-right: 30px">
                  <P1>Postal code</P1><br />
                  <input type="text" style="width: 100%" v-model="postalCode"/>
                </div>
              </div>
            </div>
            <div class="button-container">
              <button class="cancel-button" @click="isAddressEdit = false">Cancel</button><br /><br />
              <button class="edit-button" @click="editAddress">Save</button>
            </div>
          </div>
          <div class="display-container" v-if="!isAddressEdit">
            <div class="value">{{ address || "Select your address" }}, {{ country }}</div>
            <button class="edit-button" @click="isAddressEdit = true">Edit</button>
          </div>
        </div>
        <!-- pp detail  -->
        <div class="detail-item">
          <label for="ppDetail" style="width: 20%">Passport details</label>
          <div class="value">Not provided</div>
          <button class="edit-button">Add passport</button>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
.content h2 {
  font-size: 20px;
  margin-bottom: 10px;
}
.content p {
  color: #666;
  margin-bottom: 10px;
}
.manage-link {
  color: #4285f4;
  text-decoration: none;
  margin-bottom: 10px;
  padding-bottom: 10px;
}
.manage-link:hover {
  text-decoration: underline;
  margin-bottom: 10px;
}
.personal-details-container {
  display: flex;
  max-width: 1000px;
  margin: 0 auto;
  padding-left: 40px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}
.user-image-container img {
  width: 100px;
  height: 100px;
  border-radius: 50%;
}
.details-section {
  margin-top: 20px;
  flex-grow: 1;
}
.details-section h1 {
  font-size: 30px;
  margin-bottom: 16px;
}
.details-section p {
  color: #666;
  margin-bottom: 24px;
}
.detail-item {
  display: flex;
  align-items: center;
  /* justify-content: space-between; */
  padding: 16px 0;
  border-bottom: 1px solid #e6e6e6;
}
.detail-item label {
  font-weight: bold;
  margin-right: 16px;
}
.detail-item .value {
  flex-grow: 1;
  color: #666;
}

.display-container {
  display: flex;
  width: 100%;
  align-items: center;
}

.detail-item .verified {
  background-color: #4caf50;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 8px;
}
.edit-button {
  background-color: #4285f4;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
/*** Edit section***/
.edit-button {
  background-color: #4285f4;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}
.edit-container {
  width: 100%;
  display: flex;
}
.container1 {
  justify-content: space-between;
  display: flex;
  width: 100%;
}

.button-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.cancel-button {
  background-color: transparent;
  color: #4285f4;
  border: none;

  border-radius: 4px;
  cursor: pointer;
}
input {
  border-radius: 5px;
  border-color: #4285f4;
  border-style: solid;
  border-width: 1px;
  width: 200px;
  height: 33px;
}
/* avatar uploading popup */
/* Overlay */
.popup-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Popup Content */
.popup-content {
  background-color: #fff;
  width: 300px;
  border-radius: 8px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  text-align: center;
  padding: 20px;
}

/* Header */
.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 20px;
}

/* Close Button */
.close-btn {
  background: none;
  border: none;
  font-size: 30px;
  cursor: pointer;
}

/* Avatar Circle */
.avatar-circle {
  width: 100px;
  height: 100px;
  background-color: gray;
  border-radius: 50%;
  margin: 0 auto 20px;
}

/* Upload Button */
.upload-btn {
  display: inline-block;
  background-color: #007bff;
  color: #fff;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 14px;
}

.upload-btn:hover {
  background-color: #0056b3;
}

/* File Input (Hidden) */
.file-input {
  display: none;
}

/* Save Button */
.save-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 10px;
}

.save-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
